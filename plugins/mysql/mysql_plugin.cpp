#include "mysql_plugin.h"

namespace tablemax {

bool MySQLPlugin::connect(const std::string& connection_string) {
    connection_string_ = connection_string;
    // TODO: Use libmysqlclient to actually connect
    connected_ = true;
    return true;
}

void MySQLPlugin::disconnect() {
    connected_ = false;
}

bool MySQLPlugin::is_connected() const {
    return connected_;
}

bool MySQLPlugin::test_connection(int& latency_ms) {
    latency_ms = 0;
    // TODO: Actually ping the server
    return connected_;
}

std::unique_ptr<IResultStream> MySQLPlugin::execute(const std::string& query) {
    (void)query;
    error_ = "MySQL query execution not yet implemented in C++ plugin";
    return nullptr;
}

std::vector<std::string> MySQLPlugin::list_tables() {
    return {};
}

std::vector<ColumnInfo> MySQLPlugin::get_table_schema(const std::string& table_name) {
    (void)table_name;
    return {};
}

std::string MySQLPlugin::last_error() const {
    return error_;
}

} // namespace tablemax

// ─── Plugin factory (exported) ─────────────────────────────
extern "C" {
    tablemax::IDbPlugin* create_plugin() {
        return new tablemax::MySQLPlugin();
    }
    void destroy_plugin(tablemax::IDbPlugin* plugin) {
        delete plugin;
    }
}
