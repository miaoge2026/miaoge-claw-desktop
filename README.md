<div align="center">

# 喵哥Claw Desktop

<img src="resources/icon.png" width="96" alt="喵哥Claw Desktop 图标" />

**OpenClaw 的桌面端 GUI——安装即用的 AI 智能体工作台。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](https://github.com/miaoge2026/miaoge-claw-desktop/releases)
[![Version](https://img.shields.io/badge/version-v1.1.0-brightgreen)](https://github.com/miaoge2026/miaoge-claw-desktop/releases/latest)

[下载最新版本](https://github.com/miaoge2026/miaoge-claw-desktop/releases/latest) · [快速开始](#-快速开始) · [开发指南](#-开发指南)

</div>

## 📖 项目简介

喵哥Claw Desktop 是一个基于 Electron、React 和 OpenClaw Gateway 的跨平台桌面应用。它把 AI 智能体编排、聊天协作、定时任务、模型配置与应用更新整合到一个本地 GUI 中，适合希望低门槛部署 AI 团队的个人和团队。

## ✨ 当前版本亮点（v1.1.0）

- 统一应用版本号、下载入口与文档链接。
- 补充 `typecheck` / `lint:all` 质量脚本，方便持续集成与发布前检查。
- 修复主进程日志、更新器、错误处理与模块解析中的多处类型与健壮性问题。
- 优化 README，减少过期版本号、占位仓库链接和无效说明。

## 🚀 核心能力

- **开箱即用**：内置 OpenClaw 运行时，首次启动自动完成初始化。
- **虚拟团队协作**：创建多个 AI 智能体，支持群组、私聊和会话管理。
- **定时任务调度**：通过 Cron 风格配置自动执行例行工作。
- **多模型接入**：支持 OpenAI、Anthropic、DeepSeek 及兼容 OpenAI API 的提供商。
- **应用内更新**：可检查并下载新版本，减少手动维护成本。
- **跨平台运行**：支持 Windows、Linux 与 macOS。

## 📦 下载与安装

请前往 [GitHub Releases](https://github.com/miaoge2026/miaoge-claw-desktop/releases/latest) 下载最新构建产物。

### 系统要求

- Windows 10/11 x64
- Ubuntu 18.04+ / Debian 10+ x64
- macOS 11+
- 建议至少 4GB RAM 与 10GB 可用磁盘空间

## ⚡ 快速开始

1. 从 Releases 下载对应平台的安装包。
2. 安装并启动喵哥Claw Desktop。
3. 首次运行时选择数据目录，并等待 OpenClaw Gateway 初始化。
4. 在应用中配置模型提供商、创建智能体并开始对话。

## 🛠 开发指南

### 环境要求

- Node.js 20+
- npm 10+（或兼容的包管理器）
- Git

### 本地开发

```bash
git clone https://github.com/miaoge2026/miaoge-claw-desktop.git
cd miaoge-claw-desktop
npm install
npm run dev
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Electron 开发环境 |
| `npm run build` | 构建主进程、预加载和渲染进程 |
| `npm run lint` | 校验主进程 / 预加载 / 共享层 TypeScript |
| `npm run lint:all` | 校验整个 `src` 下的 TS/TSX 文件 |
| `npm run typecheck` | 执行 TypeScript 项目级检查 |


## 📁 项目结构

```text
src/
├── main/        # Electron 主进程与网关集成
├── preload/     # Preload API 暴露层
├── renderer/    # React UI
└── shared/      # 跨进程共享常量与类型
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。提交前建议至少运行：

```bash
npm run lint
npm run typecheck
npm run build
```
