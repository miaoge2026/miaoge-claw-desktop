#!/bin/bash

echo "修复 pnpm 依赖问题..."

# 清除旧依赖
echo "1. 清除旧依赖..."
rm -rf node_modules

# 重新安装依赖
echo "2. 重新安装依赖..."
pnpm install --no-frozen-lockfile

# 验证安装
echo "3. 验证安装..."
pnpm list | grep -E "(@electron-toolkit|react|electron|vite|typescript|winreg)"

echo "✓ 依赖修复完成"
