#include <iostream>
#include <fstream>
#include <string>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace tablemax {

enum class LogLevel {
    Debug,
    Info,
    Warn,
    Error,
};

static LogLevel g_log_level = LogLevel::Info;

void set_log_level(LogLevel level) {
    g_log_level = level;
}

static std::string level_string(LogLevel level) {
    switch (level) {
        case LogLevel::Debug: return "DEBUG";
        case LogLevel::Info:  return "INFO";
        case LogLevel::Warn:  return "WARN";
        case LogLevel::Error: return "ERROR";
        default: return "???";
    }
}

static std::string timestamp() {
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::ostringstream ss;
    ss << std::put_time(std::localtime(&time), "%H:%M:%S");
    return ss.str();
}

void log(LogLevel level, const std::string& component, const std::string& message) {
    if (level < g_log_level) return;

    std::cerr << "[" << timestamp() << "] "
              << "[" << level_string(level) << "] "
              << "[" << component << "] "
              << message << std::endl;
}

} // namespace tablemax
