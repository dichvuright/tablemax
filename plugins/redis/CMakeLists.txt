cmake_minimum_required(VERSION 3.16)
project(tablemax_redis_plugin LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(redis_plugin SHARED redis_plugin.cpp)
target_include_directories(redis_plugin PRIVATE ${CMAKE_SOURCE_DIR}/core/include)

if(WIN32)
    set_target_properties(redis_plugin PROPERTIES
        WINDOWS_EXPORT_ALL_SYMBOLS ON
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/plugins"
    )
endif()
