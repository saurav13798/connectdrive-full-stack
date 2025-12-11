@echo off
echo Creating ConnectDrive desktop shortcut...

set "SCRIPT_DIR=%~dp0"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\ConnectDrive.lnk"

:: Create VBS script to create shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%SHORTCUT%" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%SCRIPT_DIR%setup-and-start.bat" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "Start ConnectDrive Application" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.IconLocation = "%SCRIPT_DIR%setup-and-start.bat,0" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

:: Execute VBS script
cscript "%TEMP%\CreateShortcut.vbs" >nul

:: Clean up
del "%TEMP%\CreateShortcut.vbs"

if exist "%SHORTCUT%" (
    echo ✓ Desktop shortcut created successfully!
    echo You can now double-click "ConnectDrive" on your desktop to start the application.
) else (
    echo ✗ Failed to create desktop shortcut.
)

pause