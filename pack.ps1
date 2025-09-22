# Remove any existing zip file
if (Test-Path youtube-playback-speed-control.zip) {
    Remove-Item youtube-playback-speed-control.zip
}

try {
    # Create new zip archive
    Compress-Archive -Path manifest.json, content.js, pages -DestinationPath youtube-playback-speed-control.zip -Force
    Write-Host "Archive created successfully" -ForegroundColor Green
}
catch {
    Write-Host "Error creating archive: $_" -ForegroundColor Red
    pause
    exit 1
}