# Generate the CV PDFs (and optionally DOCX) from main.yaml.
# Run from anywhere; every argument is forwarded to convert-cv.js:
#   ./scripts/convert-cv.ps1
#   ./scripts/convert-cv.ps1 --docx
#   ./scripts/convert-cv.ps1 --lang=en --version=short --docx

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

node "scripts/convert-cv.js" @args
exit $LASTEXITCODE
