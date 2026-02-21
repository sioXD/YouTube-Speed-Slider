# Remove any existing zip file
if (Test-Path youtube-playback-speed-control.zip) {
    Remove-Item youtube-playback-speed-control.zip
}

try {
    # Read version from manifest.json
    $manifest = Get-Content manifest.json | ConvertFrom-Json
    $version = $manifest.version
    $currentDate = Get-Date -Format "dd.MM.yyyy"

    # Update popup.html with version and date
    $popupPath = "popup\popup.html"
    $popupContent = Get-Content $popupPath -Raw
    $popupContent = $popupContent -replace '(<div id="version"[^>]*>).*?(</div>)', "`$1Version $version - upgraded $currentDate`$2"
    Set-Content -Path $popupPath -Value $popupContent -NoNewline

    # Create new zip archive
    Compress-Archive -Path manifest.json, content.js, img, popup -DestinationPath youtube-speed-slider.zip -Force
    Write-Host "Archive created successfully with Version $version ($currentDate)" -ForegroundColor Green
}
catch {
    Write-Host "Error creating archive: $_" -ForegroundColor Red
    pause
    exit 1
}