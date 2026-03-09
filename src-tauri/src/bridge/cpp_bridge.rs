#![allow(non_camel_case_types, dead_code, unused_imports)]
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_longlong, c_void};
type EngineHandle = *mut c_void;
type ConnectionHandle = *mut c_void;
type ResultHandle = *mut c_void;

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EngineStatus {
    Ok = 0,
    Error = 1,
    NotConnected = 2,
    PluginNotFound = 3,
    QueryError = 4,
    Timeout = 5,
}

#[cfg(feature = "cpp-engine")]
extern "C" {
    fn engine_init() -> EngineHandle;
    fn engine_shutdown(engine: EngineHandle);
    fn engine_get_version() -> *const c_char;
    fn engine_free_string(s: *const c_char);

    fn engine_load_plugins(engine: EngineHandle, plugin_dir: *const c_char) -> c_int;
    fn engine_plugin_count(engine: EngineHandle) -> c_int;
    fn engine_plugin_name(engine: EngineHandle, index: c_int) -> *const c_char;
    fn engine_has_plugin(engine: EngineHandle, db_type: *const c_char) -> c_int;

    fn engine_connect(
        engine: EngineHandle,
        db_type: *const c_char,
        connection_string: *const c_char,
    ) -> ConnectionHandle;
    fn engine_disconnect(engine: EngineHandle, conn: ConnectionHandle);
    fn engine_test_connection(
        engine: EngineHandle,
        db_type: *const c_char,
        connection_string: *const c_char,
        latency_ms: *mut c_int,
    ) -> EngineStatus;

    fn engine_execute(
        engine: EngineHandle,
        conn: ConnectionHandle,
        query: *const c_char,
    ) -> ResultHandle;
    fn engine_get_error(engine: EngineHandle) -> *const c_char;

    fn result_column_count(result: ResultHandle) -> c_int;
    fn result_column_name(result: ResultHandle, index: c_int) -> *const c_char;
    fn result_row_count(result: ResultHandle) -> c_longlong;
    fn result_next_chunk(result: ResultHandle, chunk_size: c_int) -> *const c_char;
    fn result_has_more(result: ResultHandle) -> c_int;
    fn result_close(result: ResultHandle);

    fn engine_list_tables(engine: EngineHandle, conn: ConnectionHandle) -> *const c_char;
    fn engine_get_table_schema(
        engine: EngineHandle,
        conn: ConnectionHandle,
        table_name: *const c_char,
    ) -> *const c_char;
}
#[cfg(feature = "cpp-engine")]
unsafe fn engine_string_to_rust(ptr: *const c_char) -> String {
    if ptr.is_null() {
        return String::new();
    }
    let s = CStr::from_ptr(ptr).to_string_lossy().into_owned();
    engine_free_string(ptr);
    s
}
#[cfg(feature = "cpp-engine")]
pub struct Engine {
    handle: EngineHandle,
}

#[cfg(feature = "cpp-engine")]
impl Engine {
    pub fn new() -> Option<Self> {
        let handle = unsafe { engine_init() };
        if handle.is_null() {
            None
        } else {
            Some(Self { handle })
        }
    }

    pub fn version() -> String {
        unsafe { engine_string_to_rust(engine_get_version()) }
    }

    pub fn load_plugins(&self, plugin_dir: &str) -> i32 {
        let dir = CString::new(plugin_dir).unwrap();
        unsafe { engine_load_plugins(self.handle, dir.as_ptr()) as i32 }
    }

    pub fn plugin_count(&self) -> i32 {
        unsafe { engine_plugin_count(self.handle) as i32 }
    }

    pub fn has_plugin(&self, db_type: &str) -> bool {
        let dt = CString::new(db_type).unwrap();
        unsafe { engine_has_plugin(self.handle, dt.as_ptr()) != 0 }
    }

    pub fn get_error(&self) -> String {
        unsafe { engine_string_to_rust(engine_get_error(self.handle)) }
    }
}
#[cfg(feature = "cpp-engine")]
impl Drop for Engine {
    fn drop(&mut self) {
        unsafe { engine_shutdown(self.handle) }
    }
}
#[tauri::command]
pub fn engine_version() -> String {
    #[cfg(feature = "cpp-engine")]
    {
        Engine::version()
    }
    #[cfg(not(feature = "cpp-engine"))]
    {
        "C++ engine not linked (feature disabled)".to_string()
    }
}
