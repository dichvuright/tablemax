<p align="center">
  <h1 align="center">TableMax</h1>
  <p align="center">
    Ứng dụng quản lý cơ sở dữ liệu đa nền tảng — nhẹ, nhanh, hiệu suất native.
    <br />
    <em>A lightweight multi-database desktop client with native performance.</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-Private-red" alt="License" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen" alt="Platform" />
</p>

---

## ✨ Điểm nổi bật

| Tính năng | Mô tả |
|-----------|-------|
| 🚀 **Hiệu suất Native** | Core engine viết bằng C++ kết hợp Rust, khởi động chỉ ~80–120 MB RAM |
| 📊 **Hàng triệu dòng** | Virtual scrolling mượt mà với TanStack Virtual, không bao giờ render toàn bộ dataset |
| 🔌 **Plugin System** | Mỗi database là một plugin riêng biệt, dễ mở rộng thêm database mới |
| 🌊 **Query Streaming** | Stream kết quả theo chunk (500 rows), không bao giờ trả toàn bộ result set |
| 🎨 **UI hiện đại** | shadcn/ui + Tailwind CSS v4, dark mode, giao diện tối giản kiểu Linear/Vercel |
| 🖥️ **Cross-platform** | Đóng gói native cho Windows (.exe), macOS (.dmg), Linux (.AppImage) qua Tauri |

---

## 🗄️ Database được hỗ trợ

### SQL
- **MySQL** — Full query, schema browser, table viewer
- **PostgreSQL** — Full query, schema browser, table viewer
- **SQLite** — Embedded database, zero-config
- **SQL Server** — *(đang phát triển)*
- **Oracle** — *(đang phát triển)*
- **Redshift** — *(đang phát triển)*

### NoSQL
- **MongoDB** — List databases, collections, CRUD operations, aggregation pipeline, document view
- **Redis** — *(đang phát triển)*

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────┐
│              Frontend (UI)               │
│  React 19 · TypeScript · Vite 7         │
│  shadcn/ui · TanStack Table/Virtual     │
│  Tailwind CSS v4 · Zustand · Recharts   │
├─────────────────────────────────────────┤
│           Desktop Runtime                │
│  Tauri v2 (Rust) · IPC Bridge           │
│  tauri-plugin-sql · tauri-plugin-store  │
├─────────────────────────────────────────┤
│           Native Core Engine             │
│  C++17 · CMake · Shared Library (.dll)  │
│  Query Engine · Connection Manager      │
│  Schema Loader · Result Streaming       │
├─────────────────────────────────────────┤
│           Database Plugins               │
│  MySQL · PostgreSQL · SQLite            │
│  MongoDB · Redis (dynamic loading)      │
└─────────────────────────────────────────┘
```

---

## 📦 Yêu cầu hệ thống

Trước khi cài đặt, hãy đảm bảo bạn đã cài đặt các công cụ sau:

| Công cụ | Phiên bản | Mục đích |
|---------|-----------|----------|
| [Node.js](https://nodejs.org/) | ≥ 18 | Chạy frontend build tool (Vite) |
| [Rust](https://rustup.rs/) | ≥ 1.70 | Biên dịch Tauri backend |
| [CMake](https://cmake.org/) | ≥ 3.16 | Build C++ core engine |
| C++ Compiler | MSVC / GCC / Clang | Biên dịch native engine |
| [Git](https://git-scm.com/) | Bất kỳ | Clone source code |

### Yêu cầu theo hệ điều hành

<details>
<summary><strong>🪟 Windows</strong></summary>

1. Cài đặt [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) với workload **"Desktop development with C++"**
2. Cài đặt [Rust](https://rustup.rs/) (tự động chọn MSVC toolchain)
3. Cài đặt [Node.js LTS](https://nodejs.org/)
4. Cài đặt [CMake](https://cmake.org/download/) (thêm vào PATH)

</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew packages
brew install cmake node rust
```

</details>

<details>
<summary><strong>🐧 Linux (Ubuntu/Debian)</strong></summary>

```bash
# System dependencies cho Tauri
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  cmake

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

</details>

---

## 🚀 Cài đặt & Chạy

### 1. Clone repository

```bash
git clone https://github.com/your-org/tablemax.git
cd tablemax
```

### 2. Cài đặt dependencies

```bash
# Frontend dependencies
npm install

# Rust dependencies (tự động khi build)
```

### 3. Build C++ Core Engine

```bash
cd core
mkdir build && cd build
cmake ..
cmake --build . --config Release
cd ../..
```

### 4. Chạy Development Mode

```bash
# Chạy cả frontend + Tauri cùng lúc
npm run tauri dev
```

Frontend sẽ chạy tại `http://localhost:1420`, Tauri sẽ tự mở cửa sổ desktop.

### 5. Build Production

```bash
npm run tauri build
```

File cài đặt sẽ xuất hiện tại `src-tauri/target/release/bundle/`.

---

## 🎯 Tính năng chi tiết

### 🔗 Quản lý kết nối (Connection Manager)
- Tạo, lưu, chỉnh sửa và xóa các kết nối database
- Hỗ trợ kết nối qua **URI** hoặc **nhập tay** (host, port, username, password)
- Test connection trước khi lưu
- Gắn **màu riêng** cho mỗi kết nối để dễ phân biệt
- Lưu trữ cục bộ qua `tauri-plugin-store`

### 📝 Query Editor
- Viết và chạy truy vấn SQL / MongoDB command
- Hỗ trợ **multiple tabs** — mở nhiều query cùng lúc
- Kết quả hiển thị ngay bên dưới editor
- Phím tắt: `Ctrl+Enter` để chạy query

### 📊 Data Grid ảo hóa (Virtual Data Grid)
- Sử dụng **TanStack Table** + **TanStack Virtual** để render
- Chỉ render các hàng đang hiển thị trên viewport
- Scroll mượt mà với hàng triệu dòng dữ liệu
- Cell renderer thông minh cho từng kiểu dữ liệu

### 🍃 MongoDB Document View
- Giao diện xem document chuyên biệt cho MongoDB
- Hỗ trợ CRUD: insert, update, delete document
- Aggregation pipeline
- List databases & collections

### 🌳 Schema Browser
- Duyệt cấu trúc database dạng tree
- Xem danh sách tables, columns, indexes
- Click để xem dữ liệu bảng

### ⌨️ Phím tắt

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl + N` | Mở tab mới |
| `Ctrl + W` | Đóng tab hiện tại |
| `Ctrl + Enter` | Chạy query |

---

## 🏗️ Kiến trúc hệ thống

```
React UI  →  Tauri IPC  →  Rust Commands  →  C++ Engine  →  Database Plugin  →  Database Server
                                                    ↓
                                            Stream Results (500 rows/chunk)
                                                    ↓
                                              React Data Grid (Virtual)
```

### Cấu trúc thư mục

```
tablemax/
├── src/                    # React frontend
│   ├── app/                # Layout, Router
│   ├── components/ui/      # shadcn/ui components (56+ components)
│   ├── features/           # Feature modules
│   │   ├── connection/     # Connection manager
│   │   ├── query-editor/   # SQL/NoSQL editor + tabs
│   │   ├── table-viewer/   # Virtual data grid + MongoDB view
│   │   └── schema-browser/ # Database schema tree
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   └── lib/                # Utilities
│
├── src-tauri/              # Rust backend (Tauri v2)
│   └── src/
│       ├── commands/       # IPC handlers (connection, query, mongodb)
│       └── bridge/         # C++ engine bridge (FFI)
│
├── core/                   # C++ native engine
│   ├── src/                # Engine source (query, connection, schema, stream)
│   └── include/            # Header files
│
├── plugins/                # Database driver plugins
│   ├── mysql/              # MySQL plugin
│   ├── postgres/           # PostgreSQL plugin
│   ├── sqlite/             # SQLite plugin
│   ├── mongodb/            # MongoDB plugin
│   └── redis/              # Redis plugin
│
├── shared/                 # Shared types (TypeScript)
└── scripts/                # Build scripts
```

---

## 🗺️ Lộ trình phát triển (Roadmap)

- [x] **Phase 1** — Connection manager, database test, query executor
- [x] **Phase 2** — Virtual data grid, result streaming, pagination
- [ ] **Phase 3** — Schema browser nâng cao, table viewer, index viewer
- [ ] **Phase 4** — SQL editor với syntax highlighting, autocomplete
- [ ] **Phase 5** — Query history, saved queries, ER diagram, data export

### 🔮 Tính năng tương lai
- 🤖 AI SQL Assistant — Gợi ý và sinh query tự động
- 📈 Query Plan Visualizer — Xem execution plan trực quan
- ⚡ Query Performance Analyzer — Phân tích hiệu suất truy vấn
- 🔄 Schema Diff Tool — So sánh schema giữa các database
- 🚢 Migration Runner — Chạy database migration

---

## 🧑‍💻 Phát triển

### Scripts có sẵn

```bash
npm run dev          # Chạy Vite dev server (frontend only)
npm run build        # Build frontend (TypeScript + Vite)
npm run preview      # Preview production build
npm run tauri dev    # Chạy full app (frontend + Tauri)
npm run tauri build  # Build production installer
```

### IDE khuyến nghị

- [VS Code](https://code.visualstudio.com/) với các extension:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

---

## 📄 License

Private — All rights reserved.
