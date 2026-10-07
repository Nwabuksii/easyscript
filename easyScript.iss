; easyScript installer script for Inno Setup 6+
; Requires: path.iss (from https://github.com/okhlybov/isx)

#define MyAppName "easyScript"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Your Name"
#define MyAppURL "https://example.com/easyscript"
#define MyAppExeName "esx.exe"
#define MySourceExe "C:\Users\user\PL\.es\dist\esx.exe"
#define MySourceDir "C:\Users\user\PL\.es\assets"

[Setup]
AppId={{8F3A2C91-4B7D-4E5A-9C1F-6D2E8A0B3C4D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer-output
OutputBaseFilename=easyScript-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ChangesEnvironment=yes
ChangesAssociations=yes
PrivilegesRequired=admin
; --- the installer's own icon ---
SetupIconFile={#MySourceDir}\installer.ico

[Files]
Source: "{#MySourceExe}";    DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion
Source: "{#MySourceDir}\ej.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#MySourceDir}\et.ico"; DestDir: "{app}"; Flags: ignoreversion

[Tasks]
Name: "addtopath"; Description: "Add easyScript to the system PATH"; \
    GroupDescription: "Integration:"; Flags: checkedonce
Name: "assoc_ej"; Description: "Associate .ej files with easyScript"; \
    GroupDescription: "File associations:"; Flags: checkedonce
Name: "assoc_et"; Description: "Associate .et files with easyScript"; \
    GroupDescription: "File associations:"; Flags: checkedonce

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Registry]
; --- .ej file association ---
Root: HKCR; Subkey: ".ej"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript.ej"; Flags: uninsdeletevalue; Tasks: assoc_ej
Root: HKCR; Subkey: "easyScript.ej"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript source file"; Flags: uninsdeletekey; Tasks: assoc_ej
Root: HKCR; Subkey: "easyScript.ej\DefaultIcon"; ValueType: string; ValueName: ""; \
    ValueData: "{app}\ej.ico"; Tasks: assoc_ej
Root: HKCR; Subkey: "easyScript.ej\shell\open\command"; ValueType: string; \
    ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: assoc_ej

; --- .et file association ---
Root: HKCR; Subkey: ".et"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript.et"; Flags: uninsdeletevalue; Tasks: assoc_et
Root: HKCR; Subkey: "easyScript.et"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript TypeScript source file"; Flags: uninsdeletekey; Tasks: assoc_et
Root: HKCR; Subkey: "easyScript.et\DefaultIcon"; ValueType: string; ValueName: ""; \
    ValueData: "{app}\et.ico"; Tasks: assoc_et
Root: HKCR; Subkey: "easyScript.et\shell\open\command"; ValueType: string; \
    ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: assoc_et

[Code]
#include "path.iss"

procedure RegisterPaths;
begin
  if IsTaskSelected('addtopath') then
    RegisterPath('{app}', SystemPath, Append);
end;