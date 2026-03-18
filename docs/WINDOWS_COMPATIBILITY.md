# Windows 兼容性指南

## 📋 系统要求

### 最低配置
- **操作系统**: Windows 10 21H2 (64位)
- **处理器**: Intel Core i5-8400 或 AMD Ryzen 5 2600
- **内存**: 8 GB RAM
- **存储空间**: 20 GB 可用空间
- **显卡**: 支持 DirectX 11 的显卡
- **网络**: 宽带互联网连接

### 推荐配置
- **操作系统**: Windows 11 22H2 (64位)
- **处理器**: Intel Core i7-10700 或 AMD Ryzen 7 3700X
- **内存**: 16 GB RAM
- **存储空间**: 50 GB 可用空间 (SSD推荐)
- **显卡**: 支持 DirectX 12 的显卡
- **网络**: 高速宽带互联网连接

## 🛠 安装前检查

### 1. 检查Windows版本
```powershell
# 打开 PowerShell 并运行
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsCurrentVersion
```

**要求**: Windows 10 版本 2004 (Build 19041) 或更高

### 2. 检查系统架构
```powershell
# 确认是64位系统
[Environment]::Is64BitOperatingSystem
```

**要求**: 必须为 True (64位)

### 3. 检查管理员权限
```powershell
# 检查是否以管理员身份运行
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

**要求**: 安装时需要管理员权限

### 4. 检查Visual C++运行库
```powershell
# 检查VC++ 2015-2022运行库
$vcRedist = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*Visual C++*" }
$vcRedist.Count -ge 2
```

**要求**: 需要 VC++ 2015-2022 x64 运行库

### 5. 检查磁盘空间
```powershell
# 检查C盘可用空间
$drive = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpaceGB = [math]::Round($drive.FreeSpace / 1GB, 2)
$freeSpaceGB -ge 10
```

**要求**: 至少10GB可用空间

## 🔧 常见问题解决

### 问题1: 无法启动应用程序

#### 症状
- 双击图标无反应
- 显示错误: "应用程序无法正常启动"

#### 解决方案
1. **安装Visual C++运行库**
   - 下载: https://aka.ms/vs/17/release/vc_redist_x64.exe
   - 运行安装程序
   - 重启计算机

2. **检查显卡驱动**
   ```powershell
   # 更新显卡驱动
   winget install --id=NVIDIA.GeForceExperience -e
   # 或访问制造商官网下载最新驱动
   ```

3. **以管理员身份运行**
   - 右键点击应用程序
   - 选择"以管理员身份运行"

### 问题2: 界面显示异常

#### 症状
- 界面元素错位
- 字体显示异常
- 颜色异常

#### 解决方案
1. **更新显卡驱动**
2. **禁用GPU加速**
   ```powershell
   # 创建快捷方式并添加参数
   "C:\Program Files\喵哥Claw Desktop\喵哥Claw Desktop.exe" --disable-gpu
   ```

3. **检查显示设置**
   - 右键桌面 → 显示设置
   - 确保缩放比例为100%或125%

### 问题3: 网络连接问题

#### 症状
- 无法连接到AI模型
- 网络错误频繁

#### 解决方案
1. **检查防火墙设置**
   ```powershell
   # 允许应用通过防火墙
   New-NetFirewallRule -DisplayName "喵哥Claw Desktop" -Direction Inbound -Program "C:\Program Files\喵哥Claw Desktop\喵哥Claw Desktop.exe" -Action Allow
   ```

2. **检查代理设置**
   - 设置 → 网络和Internet → 代理
   - 确保配置正确

3. **重置网络**
   ```powershell
   # 重置网络设置
   netsh winsock reset
   ipconfig /release
   ipconfig /renew
   ```

### 问题4: 性能问题

#### 症状
- 启动缓慢
- 界面卡顿
- 高CPU/内存占用

#### 解决方案
1. **关闭不必要的程序**
2. **增加虚拟内存**
   ```powershell
   # 检查虚拟内存
   wmic pagefile get name,currentusage,allocationsize
   ```

3. **优化启动**
   - 任务管理器 → 启动
   - 禁用不必要的启动项

## 📊 性能优化

### 1. 内存优化
```powershell
# 定期清理内存
Clear-RecycleBin -Force
```

### 2. 磁盘优化
```powershell
# 运行磁盘清理
cleanmgr /sagerun:1
```

### 3. 启动优化
- 任务管理器 → 启动
- 禁用不需要的启动程序

## 🔒 安全建议

### 1. 防火墙配置
```powershell
# 确保防火墙规则正确
Get-NetFirewallRule -DisplayName "喵哥Claw Desktop"
```

### 2. 权限管理
- 仅在需要时以管理员身份运行
- 定期检查应用权限

### 3. 数据保护
- 定期备份重要数据
- 使用加密存储敏感信息

## 📞 技术支持

### 获取系统信息
```powershell
# 生成系统信息报告
systeminfo > system_report.txt
```

### 收集日志
```powershell
# 收集应用日志
$logPath = "$env:APPDATA\喵哥Claw\logs\main.log"
if (Test-Path $logPath) {
    Copy-Item $logPath .\app_log.txt
}
```

### 报告问题
在GitHub Issues中报告时，请包含：
1. 系统信息 (`systeminfo`)
2. 应用日志
3. 问题描述
4. 重现步骤

## 🔄 更新和卸载

### 更新应用
1. 通过应用内更新功能
2. 或从GitHub下载最新版本

### 完全卸载
1. 控制面板 → 程序和功能
2. 选择"喵哥Claw Desktop"
3. 点击"卸载"
4. 删除残留文件夹：
   - `C:\Program Files\喵哥Claw Desktop`
   - `%APPDATA%\喵哥Claw`
   - `%LOCALAPPDATA%\喵哥Claw`

## 🎯 最佳实践

### 1. 定期维护
- 每周重启计算机
- 定期清理磁盘
- 更新系统和驱动程序

### 2. 性能监控
- 使用任务管理器监控资源使用
- 定期清理临时文件

### 3. 备份策略
- 定期备份用户数据
- 创建系统还原点

---

**最后更新**: 2026-03-18  
**版本**: v0.0.27-beta