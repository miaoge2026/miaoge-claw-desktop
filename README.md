<div align="center">

# 喵哥Claw Desktop

<img src="resources/icon.png" width="96" alt="icon" />

**OpenClaw 的桌面端 GUI — 无需写代码，即可运行你自己的 AI 团队。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](https://github.com/your-username/miaoge-claw-desktop/releases)

[下载安装包](#下载) · [开发指南](#开发) · [贡献指南](#贡献)

</div>

---

## 📖 简介

**喵哥Claw Desktop** 是一款基于 Electron 的桌面应用，为 **OpenClaw** AI 智能体网关提供图形化操作界面。它内置了完整的 OpenClaw 运行时，安装即用，无需额外安装 Node.js 或在终端执行任何命令，任何人都可以通过一个 `.exe`、`.AppImage` 或 `.dmg` 启动属于自己的 AI 虚拟团队。

> **什么是 OpenClaw？**
> OpenClaw 是一个 AI 智能体编排网关，支持运行、调度和协调多个 AI 智能体（可对接任意 LLM 提供商），通过统一的 WebSocket API 进行管理。

## ✨ 功能特性

### 🚀 核心功能
- **开箱即用，零依赖** — 内置 Node.js 运行时与 OpenClaw 网关，首次启动自动解压
- **AI 虚拟团队** — 创建和管理 AI 智能体舰队，支持单独私聊或群组会话
- **定时任务** — 类 Cron 的周期性任务调度，自动触发智能体执行
- **多模型支持** — 配置 OpenAI、Anthropic、DeepSeek 及任意兼容 OpenAI 的模型供应商
- **文件与图片附件** — 拖拽图片或文件发送至对话，图片直接内联发送给模型
- **流式响应** — 所有智能体回复实时逐 token 流式输出
- **应用内更新** — 直接在应用内检查并升级 OpenClaw 网关

### 🛠 技术优势
- **代码结构优化** — 面向对象架构设计，模块化组件
- **增强的错误处理** — 智能重试机制和详细的错误分类
- **性能追踪** — 关键操作性能监控和分析
- **结构化日志** — 支持上下文信息和分级日志输出
- **跨平台支持** — Windows、Linux、macOS 全平台兼容

## 📥 下载

前往 [**Releases**](https://github.com/miaoge2026/miaoge-claw-desktop/releases/tag/v0.0.27-beta) 页面下载最新版本：

| 平台 | 文件 | 大小 | 格式 |
|------|------|------|------|
| Linux (x64) | `喵哥Claw Desktop-0.0.27-beta.AppImage` | 268 MB | AppImage |
| Windows (x64) | `喵哥Claw Desktop-0.0.27-beta.exe` | 222 MB | EXE |
| macOS | 即将提供 | - | DMG |

### 📋 系统要求

#### Windows
- Windows 10/11 (x64)
- 4GB RAM 或更高
- 10GB 可用磁盘空间

#### Linux
- Ubuntu 18.04+ / Debian 10+ (x64)
- 4GB RAM 或更高
- 10GB 可用磁盘空间
- FUSE 支持 (用于 AppImage)

#### macOS
- macOS 11+ (Intel/Apple Silicon)
- 4GB RAM 或更高
- 10GB 可用磁盘空间

## 🚀 快速开始

### 1. 下载安装

从 [Releases](https://github.com/your-username/miaoge-claw-desktop/releases) 页面下载适合您平台的版本。

### 2. 运行应用

#### Linux (AppImage)
```bash
# 添加执行权限
chmod +x 喵哥Claw\ Desktop-0.0.27-beta.AppImage

# 运行应用
./喵哥Claw\ Desktop-0.0.27-beta.AppImage
```

#### Windows
- 双击 `喵哥Claw Desktop.exe` 运行
- 首次运行可能需要防火墙权限（请允许）

#### macOS
- 双击 `喵哥Claw Desktop.dmg` 安装
- 从 Applications 文件夹运行

### 3. 首次运行

1. **数据目录选择** — 选择 AI 数据存储位置
2. **网关初始化** — 等待 OpenClaw 网关解压和启动
3. **开始使用** — 创建 AI 智能体，开始对话

## 📖 使用指南

### 创建 AI 智能体
1. 打开 **智能体配置** 页面
2. 选择 AI 模型（OpenAI、DeepSeek 等）
3. 配置智能体名称、角色和参数
4. 点击 **创建** 按钮

### 开始对话
1. 在 **聊天** 页面选择智能体
2. 输入消息或上传文件/图片
3. 点击 **发送** 按钮
4. 查看实时流式响应

### 设置定时任务
1. 打开 **定时任务** 页面
2. 创建新的 Cron 任务
3. 配置执行时间和智能体指令
4. 启用任务调度

## 🛠 开发指南

### 环境要求

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+
- [Git](https://git-scm.com/)

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/miaoge-claw-desktop.git
cd miaoge-claw-desktop

# 安装依赖
pnpm install

# 打包内置 OpenClaw 运行时（首次必须执行）
node scripts/bundle-openclaw.mjs

# 启动开发服务器（支持热重载）
npm run dev
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Electron 开发服务器（热重载） |
| `npm run build` | 编译主进程 / 预加载 / 渲染进程 |
| `npm run lint` | 对 `.ts` / `.tsx` 文件执行 ESLint |
| `npm run build:win` | 打包 Windows 安装包（NSIS） |
| `npm run build:linux` | 打包 Linux 安装包（AppImage） |
| `npm run build:mac` | 打包 macOS 安装包（DMG） |

### 项目结构

```
src/
├── main/               # Electron 主进程
│   ├── index.ts        # 主应用类 (MiaogeClawApp)
│   ├── lib/            # 工具库
│   │   ├── logger.ts   # 增强的日志系统
│   │   └── data-dir.ts # 数据目录管理
│   ├── ipc/            # IPC 处理器
│   │   ├── chat.ts     # 聊天功能处理器
│   │   ├── gw.ts       # 网关客户端
│   │   └── ...         # 其他IPC处理器
│   └── gateway/        # 网关管理
│       ├── adapter.ts  # WebSocket 适配器
│       ├── runtime.ts  # 运行时管理
│       └── ...         # 网关相关
├── preload/            # 预加载脚本
└── renderer/           # 渲染进程
    └── src/
        ├── components/ # React 组件
        ├── store/      # 全局状态管理
        ├── hooks/      # 自定义 Hooks
        ├── lib/        # 工具函数
        └── i18n/       # 国际化支持
```

### 代码规范

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 规范
- 组件使用函数式组件 + Hooks
- 状态管理使用 React Context + useReducer
- 使用 Tailwind CSS 进行样式设计

## 🤝 贡献指南

我们欢迎任何形式的贡献！请按照以下步骤：

### 1. Fork 项目
Fork 本仓库到您的 GitHub 账户

### 2. 创建功能分支
```bash
git checkout -b feat/my-feature
```

### 3. 开发功能
- 遵循现有代码风格
- 添加必要的注释
- 确保代码通过 ESLint 检查

### 4. 提交更改
```bash
git add .
git commit -m "feat: add my feature"
```

### 5. 推送到远程
```bash
git push origin feat/my-feature
```

### 6. 创建 Pull Request
从您的仓库创建 Pull Request 到主仓库

### 📋 PR 检查清单
- [ ] 代码通过 ESLint 检查
- [ ] TypeScript 编译通过
- [ ] 添加必要的测试
- [ ] 更新相关文档
- [ ] 确保 CI/CD 通过

## 📊 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Electron 35](https://electronjs.org/) |
| 构建工具 | [electron-vite 3](https://electron-vite.org/) |
| UI 框架 | [React 19](https://react.dev/) |
| UI 组件库 | [shadcn/ui](https://ui.shadcn.com/) |
| 样式 | [Tailwind CSS v4](https://tailwindcss.com/) |
| 编程语言 | TypeScript 5 |
| 包管理器 | pnpm 9 |
| AI 网关 | [OpenClaw](https://github.com/openclaw/openclaw) |

## 🔧 故障排除

### 启动失败
- **问题**: `libfuse.so.2` 缺失 (Linux)
  - **解决**: `sudo apt install fuse libfuse2`

- **问题**: 以 root 用户运行失败
  - **解决**: 使用普通用户运行，或添加 `--no-sandbox` 参数

### 性能问题
- **问题**: 内存使用过高
  - **解决**: 关闭不使用的智能体和会话

- **问题**: 启动缓慢
  - **解决**: 确保磁盘空间充足，网络连接正常

### 连接问题
- **问题**: 无法连接到 AI 模型
  - **解决**: 检查 API 密钥和网络连接
  - **解决**: 确认模型供应商服务可用

## 📄 许可证

[MIT](LICENSE) © 喵哥Claw Contributors

### 第三方依赖
- [OpenClaw](https://github.com/openclaw/openclaw) - MIT License
- [Electron](https://github.com/electron/electron) - MIT License
- [React](https://github.com/facebook/react) - MIT License
- [shadcn/ui](https://github.com/shadcn/ui) - MIT License

## 📞 支持

- **Issues**: 报告问题或建议 [GitHub Issues](https://github.com/your-username/miaoge-claw-desktop/issues)
- **Discussions**: 功能讨论 [GitHub Discussions](https://github.com/your-username/miaoge-claw-desktop/discussions)
- **Documentation**: 详细文档 [Wiki](https://github.com/your-username/miaoge-claw-desktop/wiki)

## 🎉 致谢

- [Zmmmmy](https://github.com/Zmmmmy) — 原始项目 EasiestClaw 的作者
- [OpenClaw](https://github.com/openclaw/openclaw) — AI 智能体网关
- [shadcn/ui](https://ui.shadcn.com/) — UI 组件库
- [electron-vite](https://electron-vite.org/) — Electron 构建工具
- 所有贡献者和测试用户

---

**Made with ❤️ by 喵哥Claw Team**
