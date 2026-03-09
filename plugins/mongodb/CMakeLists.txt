cmake_minimum_required(VERSION 3.16)
project(tablemax_mongodb_plugin LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(mongodb_plugin SHARED mongo_plugin.cpp)
target_include_directories(mongodb_plugin PRIVATE ${CMAKE_SOURCE_DIR}/core/include)

if(WIN32)
    set_target_properties(mongodb_plugin PROPERTIES
        WINDOWS_EXPORT_ALL_SYMBOLS ON
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/plugins"
    )
endif()
