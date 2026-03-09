#include "plugin_interface.h"

namespace tablemax {

class MongoPlugin : public IDbPlugin {
public:
    std::string name() const override { return "MongoDB Plugin"; }
    std::string version() const override { return "0.1.0"; }
    std::string db_type() const override { return "mongodb"; }

    bool connect(const std::string& cs) override { cs_ = cs; connected_ = true; return true; }
    void disconnect() override { connected_ = false; }
    bool is_connected() const override { return connected_; }
    bool test_connection(int& latency_ms) override { latency_ms = 0; return connected_; }
    std::unique_ptr<IResultStream> execute(const std::string&) override { error_ = "Not implemented"; return nullptr; }
    std::vector<std::string> list_tables() override { return {}; }
    std::vector<ColumnInfo> get_table_schema(const std::string&) override { return {}; }
    std::string last_error() const override { return error_; }

private:
    bool connected_ = false;
    std::string cs_, error_;
};

} // namespace tablemax

extern "C" {
    tablemax::IDbPlugin* create_plugin() { return new tablemax::MongoPlugin(); }
    void destroy_plugin(tablemax::IDbPlugin* p) { delete p; }
}
