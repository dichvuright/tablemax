#include "plugin_interface.h"
#include <string>
#include <vector>

#ifdef _WIN32
    #include <windows.h>
#else
    #include <dlfcn.h>
    #include <dirent.h>
#endif

namespace tablemax {

struct LoadedPlugin {
    void* handle = nullptr;
    CreatePluginFn create_fn = nullptr;
    DestroyPluginFn destroy_fn = nullptr;
    std::string path;
    std::string db_type;
};

/**
 * Load a plugin from a shared library path.
 * The library must export: create_plugin() and destroy_plugin()
 */
static LoadedPlugin load_plugin_from_path(const std::string& path) {
    LoadedPlugin result;
    result.path = path;

#ifdef _WIN32
    HMODULE lib = LoadLibraryA(path.c_str());
    if (!lib) return result;

    result.handle = static_cast<void*>(lib);
    result.create_fn = reinterpret_cast<CreatePluginFn>(
        GetProcAddress(lib, "create_plugin")
    );
    result.destroy_fn = reinterpret_cast<DestroyPluginFn>(
        GetProcAddress(lib, "destroy_plugin")
    );
#else
    void* lib = dlopen(path.c_str(), RTLD_LAZY);
    if (!lib) return result;

    result.handle = lib;
    result.create_fn = reinterpret_cast<CreatePluginFn>(
        dlsym(lib, "create_plugin")
    );
    result.destroy_fn = reinterpret_cast<DestroyPluginFn>(
        dlsym(lib, "destroy_plugin")
    );
#endif

    // Verify we got both functions
    if (!result.create_fn || !result.destroy_fn) {
        // Unload if invalid
#ifdef _WIN32
        FreeLibrary(static_cast<HMODULE>(result.handle));
#else
        dlclose(result.handle);
#endif
        result.handle = nullptr;
        result.create_fn = nullptr;
        result.destroy_fn = nullptr;
        return result;
    }

    // Get plugin type by creating a temporary instance
    IDbPlugin* temp = result.create_fn();
    if (temp) {
        result.db_type = temp->db_type();
        result.destroy_fn(temp);
    }

    return result;
}

/**
 * Scan a directory for plugin shared libraries.
 */
std::vector<LoadedPlugin> scan_plugin_directory(const std::string& dir) {
    std::vector<LoadedPlugin> plugins;

#ifdef _WIN32
    std::string pattern = dir + "\\*.dll";
    WIN32_FIND_DATAA fd;
    HANDLE hFind = FindFirstFileA(pattern.c_str(), &fd);
    if (hFind == INVALID_HANDLE_VALUE) return plugins;

    do {
        std::string full_path = dir + "\\" + fd.cFileName;
        auto plugin = load_plugin_from_path(full_path);
        if (plugin.handle) {
            plugins.push_back(std::move(plugin));
        }
    } while (FindNextFileA(hFind, &fd));
    FindClose(hFind);
#else
    DIR* d = opendir(dir.c_str());
    if (!d) return plugins;

    struct dirent* entry;
    while ((entry = readdir(d)) != nullptr) {
        std::string name = entry->d_name;
        if (name.size() > 3 && name.substr(name.size() - 3) == ".so") {
            std::string full_path = dir + "/" + name;
            auto plugin = load_plugin_from_path(full_path);
            if (plugin.handle) {
                plugins.push_back(std::move(plugin));
            }
        }
    }
    closedir(d);
#endif

    return plugins;
}

} // namespace tablemax
