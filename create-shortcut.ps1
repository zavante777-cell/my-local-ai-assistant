# Create desktop shortcut for My Agent Two
try {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\My Agent Two.lnk")
    $Shortcut.TargetPath = "$PWD\out\my-agent-two-win32-x64\my-agent-two.exe"
    $Shortcut.WorkingDirectory = "$PWD\out\my-agent-two-win32-x64"
    $Shortcut.Description = "My Local AI Assistant"
    $Shortcut.IconLocation = "$PWD\out\my-agent-two-win32-x64\my-agent-two.exe,0"
    $Shortcut.Save()

    Write-Host "Desktop shortcut created successfully!" -ForegroundColor Green
    Write-Host "Location: $DesktopPath\My Agent Two.lnk" -ForegroundColor Cyan
} catch {
    Write-Host "Error creating shortcut: $($_.Exception.Message)" -ForegroundColor Red
} 