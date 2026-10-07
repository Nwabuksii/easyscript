; easyScript installer script for Inno Setup 6+
; Requires: path.iss (from https://github.com/okhlybov/isx)

#define MyAppName "easyScript"
#define MyAppVersion "0.1.1"
#define MyAppPublisher "Nwabuksii"
#define MyAppURL "https://github.com/Nwabuksii/easyscript"
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
SetupIconFile={#MySourceDir}\installer.ico

[Files]
Source: "{#MySourceExe}";        DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion
Source: "{#MySourceDir}\ej.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#MySourceDir}\et.ico"; DestDir: "{app}"; Flags: ignoreversion

[Tasks]
Name: "addtopath";    Description: "Add easyScript to the system PATH"; \
    GroupDescription: "Integration:"; Flags: checkedonce
Name: "openvscode";   Description: "Open .ej/.et files in VS Code (recommended)"; \
    GroupDescription: "Default opener:"; Flags: exclusive checkedonce
Name: "openesx";      Description: "Run .ej/.et files with esx"; \
    GroupDescription: "Default opener:"; Flags: exclusive
Name: "contextrun";   Description: "Add ""Run with easyScript"" to the right-click menu"; \
    GroupDescription: "Context menu:"; Flags: checkedonce
Name: "contextedit";  Description: "Add ""Open in VS Code"" to the right-click menu"; \
    GroupDescription: "Context menu:"; Flags: checkedonce

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Registry]
; ============================================================
; .ej FILE TYPE
; ============================================================
Root: HKCR; Subkey: ".ej"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript.ej"; Flags: uninsdeletevalue

Root: HKCR; Subkey: "easyScript.ej"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript source file"; Flags: uninsdeletekey
Root: HKCR; Subkey: "easyScript.ej\DefaultIcon"; ValueType: string; ValueName: ""; \
    ValueData: "{app}\ej.ico"
Root: HKCR; Subkey: "easyScript.ej\shell"; ValueType: string; ValueName: ""; ValueData: ""

; -- Primary open command (chosen by user task) --
Root: HKCR; Subkey: "easyScript.ej\shell\open"; ValueType: string; ValueName: ""; \
    ValueData: "&Open"; Tasks: openvscode
Root: HKCR; Subkey: "easyScript.ej\shell\open\command"; ValueType: string; ValueName: ""; \
    ValueData: """{code:EZGetVSCodePath}"" ""%1"""; Tasks: openvscode

Root: HKCR; Subkey: "easyScript.ej\shell\open"; ValueType: string; ValueName: ""; \
    ValueData: "&Run"; Tasks: openesx
Root: HKCR; Subkey: "easyScript.ej\shell\open\command"; ValueType: string; ValueName: ""; \
    ValueData: """{app}\esx.exe"" ""%1"""; Tasks: openesx

; -- Context menu: Run with easyScript --
Root: HKCR; Subkey: "easyScript.ej\shell\run"; ValueType: string; ValueName: ""; \
    ValueData: "Run with easyScript"; Flags: uninsdeletekey; Tasks: contextrun
Root: HKCR; Subkey: "easyScript.ej\shell\run\command"; ValueType: string; ValueName: ""; \
    ValueData: """{app}\esx.exe"" ""%1"""; Tasks: contextrun
Root: HKCR; Subkey: "easyScript.ej\shell\run"; ValueType: string; ValueName: "Icon"; \
    ValueData: "{app}\esx.exe"; Tasks: contextrun

; -- Context menu: Open in VS Code --
Root: HKCR; Subkey: "easyScript.ej\shell\edit"; ValueType: string; ValueName: ""; \
    ValueData: "Open in VS Code"; Flags: uninsdeletekey; Tasks: contextedit
Root: HKCR; Subkey: "easyScript.ej\shell\edit\command"; ValueType: string; ValueName: ""; \
    ValueData: """{code:EZGetVSCodePath}"" ""%1"""; Tasks: contextedit

; ============================================================
; .et FILE TYPE
; ============================================================
Root: HKCR; Subkey: ".et"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript.et"; Flags: uninsdeletevalue

Root: HKCR; Subkey: "easyScript.et"; ValueType: string; ValueName: ""; \
    ValueData: "easyScript TypeScript source file"; Flags: uninsdeletekey
Root: HKCR; Subkey: "easyScript.et\DefaultIcon"; ValueType: string; ValueName: ""; \
    ValueData: "{app}\et.ico"
Root: HKCR; Subkey: "easyScript.et\shell"; ValueType: string; ValueName: ""; ValueData: ""

Root: HKCR; Subkey: "easyScript.et\shell\open"; ValueType: string; ValueName: ""; \
    ValueData: "&Open"; Tasks: openvscode
Root: HKCR; Subkey: "easyScript.et\shell\open\command"; ValueType: string; ValueName: ""; \
    ValueData: """{code:EZGetVSCodePath}"" ""%1"""; Tasks: openvscode

Root: HKCR; Subkey: "easyScript.et\shell\open"; ValueType: string; ValueName: ""; \
    ValueData: "&Run"; Tasks: openesx
Root: HKCR; Subkey: "easyScript.et\shell\open\command"; ValueType: string; ValueName: ""; \
    ValueData: """{app}\esx.exe"" ""%1"""; Tasks: openesx

Root: HKCR; Subkey: "easyScript.et\shell\run"; ValueType: string; ValueName: ""; \
    ValueData: "Run with easyScript"; Flags: uninsdeletekey; Tasks: contextrun
Root: HKCR; Subkey: "easyScript.et\shell\run\command"; ValueType: string; ValueName: ""; \
    ValueData: """{app}\esx.exe"" ""%1"""; Tasks: contextrun
Root: HKCR; Subkey: "easyScript.et\shell\run"; ValueType: string; ValueName: "Icon"; \
    ValueData: "{app}\esx.exe"; Tasks: contextrun

Root: HKCR; Subkey: "easyScript.et\shell\edit"; ValueType: string; ValueName: ""; \
    ValueData: "Open in VS Code"; Flags: uninsdeletekey; Tasks: contextedit
Root: HKCR; Subkey: "easyScript.et\shell\edit\command"; ValueType: string; ValueName: ""; \
    ValueData: """{code:EZGetVSCodePath}"" ""%1"""; Tasks: contextedit

[Code]
#include "path.iss"

var
  EZVSCodePath: string;

// Locate Code.exe via the standard App Paths registry key.
function EZFindVSCode(): string;
var
  p: string;
begin
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\App Paths\Code.exe', '', p) then
    Result := p
  else if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\App Paths\Code.exe', '', p) then
    Result := p
  else
    Result := '';
end;

// Called by {code:EZGetVSCodePath} at install time.
function EZGetVSCodePath(Param: String): String;
begin
  Result := EZVSCodePath;
  if Result = '' then
    Result := 'Code.exe';
end;

// Force-clear any leftover UserChoice so our ProgId wins.
procedure EZClearUserChoice(Ext: string);
var
  Key: String;
begin
  Key := 'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\' + Ext + '\UserChoice';
  RegDeleteKeyIncludingSubkeys(HKCU, Key);
end;

// path.iss calls this at ssPostInstall. Do all our install-time
// work here: PATH registration and UserChoice cleanup.
procedure RegisterPaths();
begin
  EZVSCodePath := EZFindVSCode();

  if IsTaskSelected('addtopath') then
    RegisterPath('{app}', SystemPath, Append);

  if IsTaskSelected('openvscode') then
  begin
    EZClearUserChoice('.ej');
    EZClearUserChoice('.et');
  end;
end;