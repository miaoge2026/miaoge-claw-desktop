#!/bin/bash

# 喵哥Claw Desktop Linux 一键安装脚本
# 支持 Ubuntu/Debian/CentOS/Fedora 等主流Linux发行版

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查内存
    total_mem=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_mem" -lt 4 ]; then
        log_warning "建议内存4GB以上，当前内存: ${total_mem}GB"
    else
        log_success "内存检查通过: ${total_mem}GB"
    fi
    
    # 检查磁盘空间
    free_space=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$free_space" -lt 20 ]; then
        log_error "磁盘空间不足，需要至少20GB，当前可用: ${free_space}GB"
        exit 1
    else
        log_success "磁盘空间检查通过: ${free_space}GB"
    fi
    
    # 检查架构
    arch=$(uname -m)
    if [ "$arch" != "x86_64" ]; then
        log_error "不支持的架构: $arch (仅支持x86_64)"
        exit 1
    else
        log_success "架构检查通过: $arch"
    fi
}

# 检测发行版
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        DISTRO="centos"
    elif [ -f /etc/arch-release ]; then
        DISTRO="arch"
    else
        log_error "无法识别Linux发行版"
        exit 1
    fi
    
    log_info "检测到发行版: $DISTRO $VERSION"
}

# 安装依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    case $DISTRO in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y curl wget tar gzip libgtk-3-0 libnss3 libasound2
            ;;
        centos|fedora|rhel)
            sudo yum install -y curl wget tar gzip gtk3 nss alsa-lib
            ;;
        arch|manjaro)
            sudo pacman -Sy --noconfirm curl wget tar gzip gtk3 nss alsa-lib
            ;;
        *)
            log_warning "未知发行版，跳过依赖安装"
            ;;
    esac
    
    log_success "系统依赖安装完成"
}

# 下载并安装喵哥Claw Desktop
install_miaoge_claw() {
    local version=${1:-"v1.0.10"}
    local install_dir=${2:-"/opt/miaoge-claw"}
    
    log_info "开始安装喵哥Claw Desktop $version..."
    
    # 创建安装目录
    sudo mkdir -p "$install_dir"
    sudo chown "$USER:$USER" "$install_dir"
    
    # 下载AppImage
    log_info "下载喵哥Claw Desktop..."
    download_url="https://github.com/miaoge2026/miaoge-claw-desktop/releases/download/${version}/喵哥Claw Desktop-${version}.AppImage"
    
    if ! wget -O "/tmp/miaoge-claw.AppImage" "$download_url"; then
        log_error "下载失败，请检查版本号和网络连接"
        exit 1
    fi
    
    # 复制到安装目录
    cp "/tmp/miaoge-claw.AppImage" "$install_dir/miaoge-claw.AppImage"
    chmod +x "$install_dir/miaoge-claw.AppImage"
    
    # 创建桌面快捷方式
    create_desktop_shortcut "$install_dir"
    
    # 创建启动脚本
    create_launcher_script "$install_dir"
    
    log_success "喵哥Claw Desktop $version 安装完成"
    log_info "安装目录: $install_dir"
    log_info "启动命令: miaoge-claw"
}

# 创建桌面快捷方式
create_desktop_shortcut() {
    local install_dir=$1
    
    cat > "$HOME/.local/share/applications/miaoge-claw.desktop" << EOF
[Desktop Entry]
Name=喵哥Claw Desktop
Comment=强大的AI智能体桌面应用
Exec=$install_dir/miaoge-claw.AppImage
Icon=$install_dir/miaoge-claw.AppImage
Terminal=false
Type=Application
Categories=Utility;
StartupNotify=true
EOF
    
    chmod +x "$HOME/.local/share/applications/miaoge-claw.desktop"
    log_success "桌面快捷方式创建完成"
}

# 创建启动脚本
create_launcher_script() {
    local install_dir=$1
    
    cat > "$install_dir/miaoge-claw" << EOF
#!/bin/bash
"$install_dir/miaoge-claw.AppImage" "$@"
EOF
    
    chmod +x "$install_dir/miaoge-claw"
    
    # 添加到PATH
    if [ -d "$HOME/.local/bin" ]; then
        ln -sf "$install_dir/miaoge-claw" "$HOME/.local/bin/miaoge-claw"
    fi
    
    log_success "启动脚本创建完成"
}

# 卸载函数
uninstall_miaoge_claw() {
    log_info "卸载喵哥Claw Desktop..."
    
    # 删除安装目录
    if [ -d "/opt/miaoge-claw" ]; then
        rm -rf "/opt/miaoge-claw"
        log_success "删除安装目录"
    fi
    
    # 删除桌面快捷方式
    if [ -f "$HOME/.local/share/applications/miaoge-claw.desktop" ]; then
        rm -f "$HOME/.local/share/applications/miaoge-claw.desktop"
        log_success "删除桌面快捷方式"
    fi
    
    # 删除启动脚本
    if [ -f "$HOME/.local/bin/miaoge-claw" ]; then
        rm -f "$HOME/.local/bin/miaoge-claw"
        log_success "删除启动脚本"
    fi
    
    log_success "卸载完成"
}

# 显示帮助信息
show_help() {
    cat << EOF
喵哥Claw Desktop Linux 一键安装脚本

用法:
    $0 [选项] [参数]

选项:
    install [版本号] [安装目录]   安装喵哥Claw Desktop (默认版本: v1.0.10, 默认目录: /opt/miaoge-claw)
    uninstall                      卸载喵哥Claw Desktop
    help                          显示此帮助信息

示例:
    $0 install                  # 安装最新版本到默认目录
    $0 install v1.0.10 /opt     # 安装指定版本到指定目录
    $0 uninstall                # 卸载软件
EOF
}

# 主函数
main() {
    local action=${1:-"install"}
    
    case $action in
        install)
            check_system_requirements
            detect_distro
            install_dependencies
            install_miaoge_claw "$2" "$3"
            ;;
        uninstall)
            uninstall_miaoge_claw
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知操作: $action"
            show_help
            exit 1
            ;;
    esac
    
    log_success "操作完成！"
    echo
    echo -e "${GREEN}🎉 安装成功！${NC}"
    echo -e "${BLUE}启动命令: miaoge-claw${NC}"
    echo -e "${BLUE}或在应用菜单中找到 '喵哥Claw Desktop'${NC}"
}

# 执行主函数
main "$@"
