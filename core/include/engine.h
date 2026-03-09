#pragma once

/**
 * TableMax Core Engine — C API
 * 
 * This header defines the C-compatible interface for the TableMax query engine.
 * It is designed to be called from Rust via FFI.
 * 
 * All strings passed across the FFI boundary are null-terminated UTF-8.
 * All returned strings must be freed with engine_free_string().
 */

#ifdef _WIN32
    #ifdef TABLEMAX_ENGINE_EXPORTS
        #define ENGINE_API __declspec(dllexport)
    #else
        #define ENGINE_API __declspec(dllimport)
    #endif
#else
    #define ENGINE_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

/* ─── Opaque handles ─────────────────────────────────────── */

typedef void* EngineHandle;
typedef void* ConnectionHandle;
typedef void* ResultHandle;

/* ─── Result status codes ────────────────────────────────── */

typedef enum {
    ENGINE_OK = 0,
    ENGINE_ERROR = 1,
    ENGINE_NOT_CONNECTED = 2,
    ENGINE_PLUGIN_NOT_FOUND = 3,
    ENGINE_QUERY_ERROR = 4,
    ENGINE_TIMEOUT = 5,
} EngineStatus;

/* ─── Engine lifecycle ───────────────────────────────────── */

/** Initialize the engine. Returns a handle or NULL on failure. */
ENGINE_API EngineHandle engine_init(void);

/** Shutdown the engine and free all resources. */
ENGINE_API void engine_shutdown(EngineHandle engine);

/** Get engine version string. Caller must free with engine_free_string(). */
ENGINE_API const char* engine_get_version(void);

/** Free a string returned by the engine. */
ENGINE_API void engine_free_string(const char* str);

/* ─── Plugin management ──────────────────────────────────── */

/** Load plugins from a directory. Returns number of plugins loaded. */
ENGINE_API int engine_load_plugins(EngineHandle engine, const char* plugin_dir);

/** Get the number of registered plugins. */
ENGINE_API int engine_plugin_count(EngineHandle engine);

/** Get plugin name by index. Caller must free with engine_free_string(). */
ENGINE_API const char* engine_plugin_name(EngineHandle engine, int index);

/** Check if a plugin is available for a database type. */
ENGINE_API int engine_has_plugin(EngineHandle engine, const char* db_type);

/* ─── Connection management ──────────────────────────────── */

/** Open a database connection. Returns a connection handle or NULL on failure. */
ENGINE_API ConnectionHandle engine_connect(
    EngineHandle engine,
    const char* db_type,
    const char* connection_string
);

/** Close a database connection. */
ENGINE_API void engine_disconnect(EngineHandle engine, ConnectionHandle conn);

/** Test a database connection. Returns ENGINE_OK on success. */
ENGINE_API EngineStatus engine_test_connection(
    EngineHandle engine,
    const char* db_type,
    const char* connection_string,
    int* latency_ms
);

/* ─── Query execution ────────────────────────────────────── */

/** Execute a query and get a result handle. Returns NULL on failure. */
ENGINE_API ResultHandle engine_execute(
    EngineHandle engine,
    ConnectionHandle conn,
    const char* query
);

/** Get the last error message. Caller must free with engine_free_string(). */
ENGINE_API const char* engine_get_error(EngineHandle engine);

/* ─── Result streaming ───────────────────────────────────── */

/** Get the number of columns in a result. */
ENGINE_API int result_column_count(ResultHandle result);

/** Get column name by index. Caller must free with engine_free_string(). */
ENGINE_API const char* result_column_name(ResultHandle result, int index);

/** Get the total row count (may be -1 if unknown/streaming). */
ENGINE_API long long result_row_count(ResultHandle result);

/**
 * Fetch the next chunk of rows as JSON.
 * Returns a JSON array string, or NULL if no more rows.
 * Caller must free with engine_free_string().
 * 
 * @param chunk_size Maximum number of rows to return per chunk.
 */
ENGINE_API const char* result_next_chunk(ResultHandle result, int chunk_size);

/** Check if there are more rows to fetch. */
ENGINE_API int result_has_more(ResultHandle result);

/** Close a result and free resources. */
ENGINE_API void result_close(ResultHandle result);

/* ─── Schema inspection ──────────────────────────────────── */

/**
 * List tables/collections as JSON array.
 * Returns a JSON string like: ["table1", "table2", ...]
 * Caller must free with engine_free_string().
 */
ENGINE_API const char* engine_list_tables(
    EngineHandle engine,
    ConnectionHandle conn
);

/**
 * Get table schema as JSON.
 * Returns a JSON object with column info.
 * Caller must free with engine_free_string().
 */
ENGINE_API const char* engine_get_table_schema(
    EngineHandle engine,
    ConnectionHandle conn,
    const char* table_name
);

#ifdef __cplusplus
}
#endif
