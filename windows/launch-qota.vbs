' QOTA Silent Background Launcher
' Starts Electron/Node HUD without keeping a command prompt window open.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if bundled electron exists
ElectronExe = ScriptDir & "\node_modules\electron\dist\electron.exe"

If fso.FileExists(ElectronExe) Then
    Cmd = """" & ElectronExe & """ """ & ScriptDir & """"
Else
    ' Fallback to globally installed electron or npm start
    Cmd = "cmd.exe /c cd /d """ & ScriptDir & """ && npx electron ."
End If

' Run invisible (0 = hide window, False = do not wait)
WshShell.Run Cmd, 0, False
