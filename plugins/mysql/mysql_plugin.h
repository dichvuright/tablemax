#pragma once
#include "plugin_interface.h"
#include <string>
#include <vector>

namespace tablemax {

/**
 * MySQL Plugin Stub
 * TODO: Integrate with libmysqlclient or mysql-connector-c++
 */
class MySQLPlugin : public IDbPlugin {
public:
    std::string name() const override { return "MySQL Plugin"; }
    std::string version() const override { return "0.1.0"; }
    std::string db_type() const override { return "mysql"; }

    bool connect(const std::string& connection_string) override;
    void disconnect() override;
    bool is_connected() const override;
    bool test_connection(int& latency_ms) override;
    std::unique_ptr<IResultStream> execute(const std::string& query) override;
    std::vector<std::string> list_tables() override;
    std::vector<ColumnInfo> get_table_schema(const std::string& table_name) override;
    std::string last_error() const override;

private:
    bool connected_ = false;
    std::string connection_string_;
    std::string error_;
};

} // namespace tablemax
