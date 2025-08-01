# Pin My Agent Two to taskbar
try {
    $AppPath = "$PWD\out\my-agent-two-win32-x64\my-agent-two.exe"
    
    # Check if the executable exists
    if (Test-Path $AppPath) {
        # Pin to taskbar using PowerShell
        $Shell = New-Object -ComObject Shell.Application
        $Folder = $Shell.Namespace((Split-Path $AppPath))
        $Item = $Folder.ParseName((Split-Path $AppPath -Leaf))
        $Item.InvokeVerb("pintotaskbar")
        
        Write-Host "App pinned to taskbar successfully!" -ForegroundColor Green
        Write-Host "App path: $AppPath" -ForegroundColor Cyan
    } else {
        Write-Host "Error: App executable not found at $AppPath" -ForegroundColor Red
    }
} catch {
    Write-Host "Error pinning to taskbar: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "You may need to manually pin the app from the desktop shortcut" -ForegroundColor Yellow
} 