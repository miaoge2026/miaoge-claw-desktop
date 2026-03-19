; 喵哥Claw Desktop 优化安装程序
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!define APP_NAME "喵哥Claw Desktop"
!define APP_VERSION "1.0.3"
!define APP_PUBLISHER "喵哥Claw Team"
!define APP_URL "https://github.com/miaoge2026/miaoge-claw-desktop"

; 安装程序设置
SetCompressor /SOLID lzma
SetCompress force
SetDatablockOptimize on
SetOverwrite ifnewer

; 现代UI设置
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_NAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动 ${APP_NAME}"

; 页面设置
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 卸载程序设置
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 语言设置
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; 安装程序属性
VIProductVersion "${APP_VERSION}.0"
VIFileVersion "${APP_VERSION}.0"
VIAddVersionKey ProductName "${APP_NAME}"
VIAddVersionKey ProductVersion "${APP_VERSION}"
VIAddVersionKey CompanyName "${APP_PUBLISHER}"
VIAddVersionKey FileVersion "${APP_VERSION}"
VIAddVersionKey FileDescription "${APP_NAME} 安装程序"
VIAddVersionKey LegalCopyright "© 2026 ${APP_PUBLISHER}"

; 系统检查
Function .onInit
  ; 检查Windows版本
  ${If} ${AtLeastWin10}
    ; 继续安装
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "需要Windows 10或更高版本！$\r$\n当前版本: %WindowsVersion%"
    Abort
  ${EndIf}

  ; 检查64位系统
  ${If} ${RunningX64}
    ; 继续安装
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "需要64位Windows系统！"
    Abort
  ${EndIf}

  ; 检查管理员权限
  UserInfo::GetAccountType
  Pop $0
  ${If} $0 != "admin"
    MessageBox MB_OK|MB_ICONEXCLAMATION "请以管理员身份运行安装程序！"
    Abort
  ${EndIf}

  ; 检查磁盘空间
  Call CheckDiskSpace
  
  ; 检查VC++运行库
  Call CheckVCRedist
FunctionEnd

Function CheckDiskSpace
  ; 获取安装驱动器
  StrCpy $0 $INSTDIR 1
  ${DriveSpace} "$0:\" "/D=F /S=K" $1
  ${If} $1 < 20000000 ; 20GB
    MessageBox MB_OK|MB_ICONEXCLAMATION "磁盘空间不足。需要至少20GB可用空间。$\r$\n当前可用: %d GB", "$1/1024/1024"
    Abort
  ${EndIf}
FunctionEnd

Function CheckVCRedist
  ; 检查VC++运行库
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != "1"
    MessageBox MB_YESNO|MB_ICONQUESTION "未检测到VC++运行库，是否现在安装？" IDOK ok IDCANCEL cancel
    ok:
      Call InstallVCRedist
    cancel:
      Abort
  ${EndIf}
FunctionEnd

Function InstallVCRedist
  DetailPrint "正在下载VC++运行库..."
  nsExec::ExecToLog 'powershell -Command "Invoke-WebRequest -Uri https://aka.ms/vs/17/release/vc_redist_x64.exe -OutFile vc_redist_x64.exe"'
  
  ${If} ${FileExists} "vc_redist_x64.exe"
    DetailPrint "正在安装VC++运行库..."
    nsExec::ExecToLog '"vc_redist_x64.exe" /install /quiet /norestart'
    Delete "vc_redist_x64.exe"
    DetailPrint "VC++运行库安装完成"
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "无法下载VC++运行库，请手动安装后再运行此安装程序。"
    Abort
  ${EndIf}
FunctionEnd

; 安装程序组件
Section "主程序" SEC_MAIN
  SectionIn RO
  SetOutPath "$INSTDIR"
  
  ; 复制主程序文件
  File /r "dist\win-unpacked\*.*"
  
  ; 创建卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_NAME}.exe"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk" "$INSTDIR\uninstall.exe"
  
  ; 创建桌面快捷方式
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_NAME}.exe"
  
  ; 注册卸载程序
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\${APP_NAME}.exe"
  
  ; 添加防火墙规则
  nsExec::ExecToLog '"netsh" advfirewall firewall add rule name="${APP_NAME}" dir=in action=allow program="$INSTDIR\${APP_NAME}.exe" enable=yes protocol=TCP'
SectionEnd

Section "VC++运行库" SEC_VCREDIST
  SectionIn RO
  ; 安装VC++运行库
  DetailPrint "正在检查Visual C++运行库..."
  Call InstallVCRedist
SectionEnd

Section "快速启动" SEC_QUICKLAUNCH
  ; 创建快速启动快捷方式
  CreateShortcut "$QUICKLAUNCH\${APP_NAME}.lnk" "$INSTDIR\${APP_NAME}.exe"
SectionEnd

Section "开机启动" SEC_STARTUP
  ; 添加开机启动
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}" "$INSTDIR\${APP_NAME}.exe"
SectionEnd

; 卸载程序
Section "Uninstall"
  ; 删除程序文件
  RMDir /r "$INSTDIR"
  
  ; 删除开始菜单
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  
  ; 删除桌面快捷方式
  Delete "$DESKTOP\${APP_NAME}.lnk"
  
  ; 删除快速启动快捷方式
  Delete "$QUICKLAUNCH\${APP_NAME}.lnk"
  
  ; 删除开机启动
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
  
  ; 删除防火墙规则
  nsExec::ExecToLog '"netsh" advfirewall firewall delete rule name="${APP_NAME}"'
  
  ; 删除注册表项
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd

; 安装程序语言
LangString MUI_WELCOMEPAGE_TITLE ${LANG_SIMPCHINESE} "欢迎安装 ${APP_NAME}"
LangString MUI_WELCOMEPAGE_TEXT ${LANG_SIMPCHINESE} "这将安装 ${APP_NAME} ${APP_VERSION} 到您的计算机。$\r$\n$\r$\n点击下一步继续。"
LangString MUI_FINISHPAGE_TITLE ${LANG_SIMPCHINESE} "安装完成"
LangString MUI_FINISHPAGE_TEXT ${LANG_SIMPCHINESE} "${APP_NAME} 已成功安装到您的计算机。$\r$\n$\r$\n点击完成退出安装程序。"
