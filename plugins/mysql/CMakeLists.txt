cmake_minimum_required(VERSION 3.16)
project(tablemax_mysql_plugin LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(mysql_plugin SHARED mysql_plugin.cpp)
target_include_directories(mysql_plugin PRIVATE
    ${CMAKE_SOURCE_DIR}/core/include
    ${CMAKE_CURRENT_SOURCE_DIR}
)

if(WIN32)
    set_target_properties(mysql_plugin PROPERTIES
        WINDOWS_EXPORT_ALL_SYMBOLS ON
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/plugins"
    )
endif()
