#!/usr/bin/env pwsh
<#
Quick Python Bot Launcher
#>

Write-Host "🤖 Starting Nirbhaya Python Bot..." -ForegroundColor Cyan

# Find Python
$pythonLocations = @(
    "C:\Program Files\Python311\python.exe",
    "C:\Program Files\Python310\python.exe",
    "C:\Program Files\Python39\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python311\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python310\python.exe"
)

$pythonPath = $null
foreach ($location in $pythonLocations) {
    if (Test-Path $location) {
        $pythonPath = $location
        break
    }
}

if (-not $pythonPath) {
    Write-Host "❌ Python not found! Please install Python 3.10+" -ForegroundColor Red
    Write-Host "   Visit: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Python found: $pythonPath" -ForegroundColor Green

# Install requirements if needed
$reqFile = "d:\Frontend Projects\RakshaMarg Github\nirbhaya_bot\requirements.txt"
Write-Host "📦 Installing/Updating dependencies..." -ForegroundColor Cyan
& $pythonPath -m pip install -r $reqFile --quiet

# Start bot
Write-Host "🚀 Starting Nirbhaya Bot on port 8001..." -ForegroundColor Green
Write-Host "📚 API Docs will be available at: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host ""

cd "d:\Frontend Projects\RakshaMarg Github\nirbhaya_bot"
& $pythonPath main.py
