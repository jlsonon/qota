; QOTA Inno Setup Script
; Compiles into standalone Qota-Setup-x64.exe

#define MyAppName "Qota"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Qota Dev"
#define MyAppURL "https://github.com/jlsonon/qota"
#define MyAppExeName "launch-qota.vbs"

[Setup]
AppId={{D73982F1-0B61-4F2A-B948-52E2B0C44298}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\{#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=Qota-Setup-x64
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\assets\icon.png
UninstallDisplayIcon={app}\assets\icon.png

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startup"; Description: "Automatically start Qota in the System Tray when Windows starts"; GroupDescription: "Windows Integration:"

[Files]
Source: "..\main.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\preload.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "launch-qota.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; IconFilename: "{app}\assets\icon.png"
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; IconFilename: "{app}\assets\icon.png"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Qota"; ValueData: "wscript.exe ""{app}\launch-qota.vbs"""; Flags: uninsdeletevalue; Tasks: startup

[Run]
Filename: "wscript.exe"; Parameters: """{app}\{#MyAppExeName}"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
