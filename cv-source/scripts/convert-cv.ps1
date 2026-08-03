# Convert CV markdown to PDF.
# Run from anywhere:
#   ./scripts/convert-cv.ps1

$ErrorActionPreference = "Stop"

# Project root is the parent folder of this script.
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location -Path $ProjectRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "First run - installing dependencies (this can take a couple of minutes, Chromium is downloaded)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

node "scripts/convert-cv.js"
exit $LASTEXITCODE
