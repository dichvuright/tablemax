cmake_minimum_required(VERSION 3.16)
project(tablemax_engine VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ─── Engine shared library ─────────────────────────────────
add_library(tablemax_engine SHARED
    src/query_engine.cpp
    src/connection_manager.cpp
    src/schema_loader.cpp
    src/result_stream.cpp
    src/plugin_loader.cpp
    src/logger.cpp
)

target_include_directories(tablemax_engine PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Windows-specific: export all symbols
if(WIN32)
    set_target_properties(tablemax_engine PROPERTIES
        WINDOWS_EXPORT_ALL_SYMBOLS ON
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
        LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
        ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
    )
endif()

# ─── Plugin interface (header-only) ─────────────────────────
add_library(plugin_interface INTERFACE)
target_include_directories(plugin_interface INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# ─── Build plugins ─────────────────────────────────────────
# Each plugin is built as a separate shared library
set(PLUGIN_DIR "${CMAKE_SOURCE_DIR}/../plugins")

if(EXISTS "${PLUGIN_DIR}/mysql")
    add_subdirectory(${PLUGIN_DIR}/mysql ${CMAKE_BINARY_DIR}/plugins/mysql)
endif()

if(EXISTS "${PLUGIN_DIR}/postgres")
    add_subdirectory(${PLUGIN_DIR}/postgres ${CMAKE_BINARY_DIR}/plugins/postgres)
endif()

if(EXISTS "${PLUGIN_DIR}/sqlite")
    add_subdirectory(${PLUGIN_DIR}/sqlite ${CMAKE_BINARY_DIR}/plugins/sqlite)
endif()

if(EXISTS "${PLUGIN_DIR}/mongodb")
    add_subdirectory(${PLUGIN_DIR}/mongodb ${CMAKE_BINARY_DIR}/plugins/mongodb)
endif()

if(EXISTS "${PLUGIN_DIR}/redis")
    add_subdirectory(${PLUGIN_DIR}/redis ${CMAKE_BINARY_DIR}/plugins/redis)
endif()

# Install rules
install(TARGETS tablemax_engine
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)
install(DIRECTORY include/ DESTINATION include)
