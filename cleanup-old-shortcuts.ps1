# Clean up old shortcuts and ensure new version is accessible
try {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $StartMenuPath = [Environment]::GetFolderPath("StartMenu")
    
    # Remove old desktop shortcuts
    $OldShortcuts = @(
        "$DesktopPath\My Agent Two.lnk",
        "$DesktopPath\my-agent-two.lnk",
        "$StartMenuPath\Programs\My Agent Two.lnk"
    )
    
    foreach ($shortcut in $OldShortcuts) {
        if (Test-Path $shortcut) {
            Remove-Item $shortcut -Force
            Write-Host "Removed old shortcut: $shortcut" -ForegroundColor Yellow
        }
    }
    
    # Create new desktop shortcut
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\My Agent Two.lnk")
    $Shortcut.TargetPath = "$PWD\out\my-agent-two-win32-x64\my-agent-two.exe"
    $Shortcut.WorkingDirectory = "$PWD\out\my-agent-two-win32-x64"
    $Shortcut.Description = "My Local AI Assistant - Updated Version"
    $Shortcut.IconLocation = "$PWD\out\my-agent-two-win32-x64\my-agent-two.exe,0"
    $Shortcut.Save()
    
    Write-Host "Updated desktop shortcut created!" -ForegroundColor Green
    Write-Host "Location: $DesktopPath\My Agent Two.lnk" -ForegroundColor Cyan
    Write-Host "The shortcut now points to the latest version with all new features!" -ForegroundColor Green
    
} catch {
    Write-Host "Error during cleanup: $($_.Exception.Message)" -ForegroundColor Red
} 