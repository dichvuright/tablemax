#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>

/**
 * TableMax Plugin Interface
 * 
 * Every database plugin must implement IDbPlugin.
 * Plugins are loaded as shared libraries (.dll/.so) at runtime.
 * 
 * Each shared library must export:
 *   extern "C" IDbPlugin* create_plugin();
 *   extern "C" void destroy_plugin(IDbPlugin* plugin);
 */

namespace tablemax {

/* ─── Data types ─────────────────────────────────────────── */

/** Represents a single column in a result set */
struct ColumnInfo {
    std::string name;
    std::string type;        // e.g., "VARCHAR", "INT", "TEXT"
    bool nullable = true;
    bool primary_key = false;
    std::string default_value;
};

/** Represents a single row as key-value pairs (JSON-like) */
using Row = std::vector<std::pair<std::string, std::string>>;

/** Query result metadata */
struct QueryMeta {
    int64_t affected_rows = 0;
    int64_t total_rows = -1;  // -1 = unknown
    double execution_time_ms = 0.0;
    std::string error;
};

/* ─── Result stream interface ────────────────────────────── */

/**
 * IResultStream — streaming interface for query results.
 * Allows chunked reading of large result sets.
 */
class IResultStream {
public:
    virtual ~IResultStream() = default;

    /** Get column metadata */
    virtual std::vector<ColumnInfo> columns() const = 0;

    /** Get query metadata */
    virtual QueryMeta meta() const = 0;

    /** Fetch the next chunk of rows. Returns empty vector when done. */
    virtual std::vector<Row> next_chunk(int chunk_size = 500) = 0;

    /** Check if there are more rows */
    virtual bool has_more() const = 0;

    /** Close the stream and free resources */
    virtual void close() = 0;
};

/* ─── Plugin interface ───────────────────────────────────── */

/**
 * IDbPlugin — interface every database plugin must implement.
 */
class IDbPlugin {
public:
    virtual ~IDbPlugin() = default;

    /** Plugin metadata */
    virtual std::string name() const = 0;
    virtual std::string version() const = 0;
    virtual std::string db_type() const = 0;  // "mysql", "postgres", etc.

    /** Connection lifecycle */
    virtual bool connect(const std::string& connection_string) = 0;
    virtual void disconnect() = 0;
    virtual bool is_connected() const = 0;
    virtual bool test_connection(int& latency_ms) = 0;

    /** Query execution — returns a streaming result */
    virtual std::unique_ptr<IResultStream> execute(const std::string& query) = 0;

    /** Schema inspection */
    virtual std::vector<std::string> list_tables() = 0;
    virtual std::vector<ColumnInfo> get_table_schema(const std::string& table_name) = 0;

    /** Get the last error message */
    virtual std::string last_error() const = 0;
};

/* ─── Plugin factory functions (exported by shared libs) ── */

typedef IDbPlugin* (*CreatePluginFn)();
typedef void (*DestroyPluginFn)(IDbPlugin*);

} // namespace tablemax
