#include "engine.h"
#include "plugin_interface.h"

#include <vector>
#include <string>
#include <unordered_map>
#include <memory>
#include <mutex>
#include <cstring>
#include <chrono>
#include <sstream>

#define ENGINE_VERSION "0.1.0"

namespace tablemax {

/* ─── Internal types ─────────────────────────────────────── */

struct PluginEntry {
    std::string path;
    std::string db_type;
    CreatePluginFn create_fn = nullptr;
    DestroyPluginFn destroy_fn = nullptr;
    void* lib_handle = nullptr;
};

struct ConnectionEntry {
    std::string db_type;
    IDbPlugin* plugin = nullptr;
    bool owned = true;
};

struct Engine {
    std::vector<PluginEntry> plugins;
    std::unordered_map<ConnectionHandle, ConnectionEntry> connections;
    std::string last_error;
    std::mutex mutex;
    int next_conn_id = 1;
};

/* ─── Result wrapper ─────────────────────────────────────── */

struct ResultWrapper {
    std::unique_ptr<IResultStream> stream;
    std::vector<ColumnInfo> columns_cache;
    bool columns_cached = false;
};

/* ─── Helper: duplicate string for FFI ───────────────────── */

static char* dup_string(const std::string& str) {
    char* copy = new char[str.size() + 1];
    std::memcpy(copy, str.c_str(), str.size() + 1);
    return copy;
}

/* ─── Row to JSON conversion ─────────────────────────────── */

static std::string row_to_json(const Row& row) {
    std::ostringstream ss;
    ss << "{";
    for (size_t i = 0; i < row.size(); ++i) {
        if (i > 0) ss << ",";
        // Escape key and value
        ss << "\"" << row[i].first << "\":\"" << row[i].second << "\"";
    }
    ss << "}";
    return ss.str();
}

static std::string rows_to_json(const std::vector<Row>& rows) {
    std::ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < rows.size(); ++i) {
        if (i > 0) ss << ",";
        ss << row_to_json(rows[i]);
    }
    ss << "]";
    return ss.str();
}

static std::string strings_to_json(const std::vector<std::string>& strs) {
    std::ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < strs.size(); ++i) {
        if (i > 0) ss << ",";
        ss << "\"" << strs[i] << "\"";
    }
    ss << "]";
    return ss.str();
}

} // namespace tablemax

using namespace tablemax;

/* ═══════════════════════════════════════════════════════════
   C API Implementation
   ═══════════════════════════════════════════════════════════ */

extern "C" {

EngineHandle engine_init(void) {
    auto* engine = new Engine();
    return static_cast<EngineHandle>(engine);
}

void engine_shutdown(EngineHandle handle) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine) return;

    // Disconnect all connections
    for (auto& [_, conn] : engine->connections) {
        if (conn.plugin && conn.owned) {
            conn.plugin->disconnect();
        }
    }
    engine->connections.clear();

    // Unload plugins (TODO: dlclose/FreeLibrary)
    engine->plugins.clear();

    delete engine;
}

const char* engine_get_version(void) {
    return dup_string(ENGINE_VERSION);
}

void engine_free_string(const char* str) {
    delete[] str;
}

/* ─── Plugin management ──────────────────────────────────── */

int engine_load_plugins(EngineHandle handle, const char* plugin_dir) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || !plugin_dir) return 0;

    // TODO: Scan directory for .dll/.so files and load them
    // For now, this is a stub that returns 0
    (void)plugin_dir;
    return 0;
}

int engine_plugin_count(EngineHandle handle) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine) return 0;
    return static_cast<int>(engine->plugins.size());
}

const char* engine_plugin_name(EngineHandle handle, int index) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || index < 0 || index >= static_cast<int>(engine->plugins.size())) {
        return dup_string("");
    }
    return dup_string(engine->plugins[index].db_type);
}

int engine_has_plugin(EngineHandle handle, const char* db_type) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || !db_type) return 0;

    for (const auto& p : engine->plugins) {
        if (p.db_type == db_type) return 1;
    }
    return 0;
}

/* ─── Connection management ──────────────────────────────── */

ConnectionHandle engine_connect(
    EngineHandle handle,
    const char* db_type,
    const char* connection_string
) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || !db_type || !connection_string) return nullptr;

    // Find plugin for this db type
    PluginEntry* found = nullptr;
    for (auto& p : engine->plugins) {
        if (p.db_type == db_type) {
            found = &p;
            break;
        }
    }

    if (!found || !found->create_fn) {
        engine->last_error = std::string("No plugin found for database type: ") + db_type;
        return nullptr;
    }

    // Create plugin instance and connect
    IDbPlugin* plugin = found->create_fn();
    if (!plugin) {
        engine->last_error = "Failed to create plugin instance";
        return nullptr;
    }

    if (!plugin->connect(connection_string)) {
        engine->last_error = plugin->last_error();
        if (found->destroy_fn) found->destroy_fn(plugin);
        return nullptr;
    }

    std::lock_guard<std::mutex> lock(engine->mutex);
    ConnectionHandle conn_handle = reinterpret_cast<ConnectionHandle>(engine->next_conn_id++);
    engine->connections[conn_handle] = { db_type, plugin, true };
    return conn_handle;
}

void engine_disconnect(EngineHandle handle, ConnectionHandle conn) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine) return;

    std::lock_guard<std::mutex> lock(engine->mutex);
    auto it = engine->connections.find(conn);
    if (it != engine->connections.end()) {
        if (it->second.plugin) {
            it->second.plugin->disconnect();
        }
        engine->connections.erase(it);
    }
}

EngineStatus engine_test_connection(
    EngineHandle handle,
    const char* db_type,
    const char* connection_string,
    int* latency_ms
) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || !db_type || !connection_string) return ENGINE_ERROR;

    // Find plugin
    PluginEntry* found = nullptr;
    for (auto& p : engine->plugins) {
        if (p.db_type == db_type) {
            found = &p;
            break;
        }
    }

    if (!found || !found->create_fn) {
        engine->last_error = std::string("No plugin for: ") + db_type;
        return ENGINE_PLUGIN_NOT_FOUND;
    }

    IDbPlugin* plugin = found->create_fn();
    if (!plugin) return ENGINE_ERROR;

    int lat = 0;
    bool ok = plugin->test_connection(lat);
    if (latency_ms) *latency_ms = lat;

    if (found->destroy_fn) found->destroy_fn(plugin);
    return ok ? ENGINE_OK : ENGINE_ERROR;
}

/* ─── Query execution ────────────────────────────────────── */

ResultHandle engine_execute(
    EngineHandle handle,
    ConnectionHandle conn,
    const char* query
) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || !query) return nullptr;

    std::lock_guard<std::mutex> lock(engine->mutex);
    auto it = engine->connections.find(conn);
    if (it == engine->connections.end() || !it->second.plugin) {
        engine->last_error = "Connection not found";
        return nullptr;
    }

    auto stream = it->second.plugin->execute(query);
    if (!stream) {
        engine->last_error = it->second.plugin->last_error();
        return nullptr;
    }

    auto* wrapper = new ResultWrapper();
    wrapper->stream = std::move(stream);
    return static_cast<ResultHandle>(wrapper);
}

const char* engine_get_error(EngineHandle handle) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine) return dup_string("Invalid engine handle");
    return dup_string(engine->last_error);
}

/* ─── Result streaming ───────────────────────────────────── */

int result_column_count(ResultHandle handle) {
    auto* wrapper = static_cast<ResultWrapper*>(handle);
    if (!wrapper || !wrapper->stream) return 0;

    if (!wrapper->columns_cached) {
        wrapper->columns_cache = wrapper->stream->columns();
        wrapper->columns_cached = true;
    }
    return static_cast<int>(wrapper->columns_cache.size());
}

const char* result_column_name(ResultHandle handle, int index) {
    auto* wrapper = static_cast<ResultWrapper*>(handle);
    if (!wrapper || !wrapper->stream) return dup_string("");

    if (!wrapper->columns_cached) {
        wrapper->columns_cache = wrapper->stream->columns();
        wrapper->columns_cached = true;
    }

    if (index < 0 || index >= static_cast<int>(wrapper->columns_cache.size())) {
        return dup_string("");
    }
    return dup_string(wrapper->columns_cache[index].name);
}

long long result_row_count(ResultHandle handle) {
    auto* wrapper = static_cast<ResultWrapper*>(handle);
    if (!wrapper || !wrapper->stream) return 0;
    return wrapper->stream->meta().total_rows;
}

const char* result_next_chunk(ResultHandle handle, int chunk_size) {
    auto* wrapper = static_cast<ResultWrapper*>(handle);
    if (!wrapper || !wrapper->stream) return nullptr;

    auto rows = wrapper->stream->next_chunk(chunk_size);
    if (rows.empty()) return nullptr;

    return dup_string(rows_to_json(rows));
}

int result_has_more(ResultHandle handle) {
    auto* wrapper = static_cast<ResultWrapper*>(handle);
    if (!wrapper || !wrapper->stream) return 0;
    return wrapper->stream->has_more() ? 1 : 0;
}

void result_close(ResultHandle handle) {
    auto* wrapper = static_cast<ResultWrapper*>(handle);
    if (!wrapper) return;

    if (wrapper->stream) {
        wrapper->stream->close();
    }
    delete wrapper;
}

/* ─── Schema inspection ──────────────────────────────────── */

const char* engine_list_tables(EngineHandle handle, ConnectionHandle conn) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine) return dup_string("[]");

    std::lock_guard<std::mutex> lock(engine->mutex);
    auto it = engine->connections.find(conn);
    if (it == engine->connections.end() || !it->second.plugin) {
        return dup_string("[]");
    }

    auto tables = it->second.plugin->list_tables();
    return dup_string(strings_to_json(tables));
}

const char* engine_get_table_schema(
    EngineHandle handle,
    ConnectionHandle conn,
    const char* table_name
) {
    auto* engine = static_cast<Engine*>(handle);
    if (!engine || !table_name) return dup_string("[]");

    std::lock_guard<std::mutex> lock(engine->mutex);
    auto it = engine->connections.find(conn);
    if (it == engine->connections.end() || !it->second.plugin) {
        return dup_string("[]");
    }

    auto columns = it->second.plugin->get_table_schema(table_name);

    // Convert to JSON
    std::ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < columns.size(); ++i) {
        if (i > 0) ss << ",";
        ss << "{\"name\":\"" << columns[i].name << "\""
           << ",\"type\":\"" << columns[i].type << "\""
           << ",\"nullable\":" << (columns[i].nullable ? "true" : "false")
           << ",\"primary_key\":" << (columns[i].primary_key ? "true" : "false")
           << "}";
    }
    ss << "]";
    return dup_string(ss.str());
}

} // extern "C"
