#!/usr/bin/env pwsh

# Clean previous build artifacts
if (Test-Path web-ext-artifacts) {
	Remove-Item web-ext-artifacts -Recurse -Force
}

try {
	# Read version from manifest.json
	$manifest = Get-Content manifest.json | ConvertFrom-Json
	$version = $manifest.version
	$currentDate = Get-Date -Format "dd.MM.yy"

	# Stamp version and date into popup.html
	$popupPath = "src/popup/popup.html"
	$popupContent = Get-Content $popupPath -Raw
	$popupContent = $popupContent -replace '(<div id="version"[^>]*>)[\s\S]*?(</div>)', "`$1v$version - upgraded on $currentDate`$2"
	Set-Content -Path $popupPath -Value $popupContent -NoNewline

	# Build with web-ext
	try {
		web-ext build --ignore-files docs META-INF CHANGELOG.md CONTRIBUTING.md LICENSE original_README.md pack.ps1 README.md SECURITY.md
	}
	catch {
		Write-Host "web-ext not found" -ForegroundColor Red
		Write-Host "Install it with: " -NoNewline
		Write-Host "npm install --global web-ext" -ForegroundColor Blue
		throw "canceled"
	}

	$builtArchive = Get-ChildItem -Path web-ext-artifacts -Filter *.zip | Sort-Object LastWriteTime -Descending | Select-Object -First 1
	if (-not $builtArchive) {
		throw "web-ext did not produce a build artifact"
	}

	Write-Host "Package created successfully with Version $version ($currentDate)" -ForegroundColor Green
	exit 0
}
catch {
	Write-Host "Error: $_" -ForegroundColor Red
	if ($Host.UI.RawUI.WindowTitle) { Read-Host "Press Enter to exit" }
	exit 1
}
