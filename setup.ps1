#!/usr/bin/env pwsh
<#
.SYNOPSIS
    RakshaMarg Setup Script - Configures and runs all services
.DESCRIPTION
    Automatically sets up Python dependencies and starts all required services
.EXAMPLE
    .\setup.ps1
#>

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        RakshaMarg - Complete Setup Script                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Colors
$Success = "Green"
$Error = "Red"
$Warning = "Yellow"
$Info = "Cyan"

# Step 1: Check Python Installation
Write-Host "Step 1: Checking Python Installation..." -ForegroundColor $Info

$pythonFound = $false
$pythonPath = $null

# Try different Python locations
$pythonLocations = @(
    "C:\Program Files\Python311\python.exe",
    "C:\Program Files\Python310\python.exe",
    "C:\Program Files\Python39\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python311\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python310\python.exe"
)

foreach ($location in $pythonLocations) {
    if (Test-Path $location) {
        $pythonPath = $location
        $pythonFound = $true
        Write-Host "✓ Found Python at: $location" -ForegroundColor $Success
        break
    }
}

if (-not $pythonFound) {
    Write-Host "✗ Python not found!" -ForegroundColor $Error
    Write-Host ""
    Write-Host "Please install Python 3.10 or higher:" -ForegroundColor $Warning
    Write-Host "  1. Visit https://www.python.org/downloads/" -ForegroundColor $Info
    Write-Host "  2. Download Python 3.11 (latest)" -ForegroundColor $Info
    Write-Host "  3. During installation, CHECK 'Add Python to PATH'" -ForegroundColor $Warning
    Write-Host "  4. Run this script again" -ForegroundColor $Info
    Write-Host ""
    exit 1
}

Write-Host ""

# Step 2: Install Python Dependencies
Write-Host "Step 2: Installing Python Dependencies..." -ForegroundColor $Info

$nirBhayaPath = "d:\Frontend Projects\RakshaMarg Github\nirbhaya_bot"

if (-not (Test-Path "$nirBhayaPath\requirements.txt")) {
    Write-Host "✗ requirements.txt not found at $nirBhayaPath" -ForegroundColor $Error
    exit 1
}

Push-Location $nirBhayaPath
& $pythonPath -m pip install -r requirements.txt --quiet
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python dependencies installed successfully" -ForegroundColor $Success
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor $Error
    exit 1
}

Write-Host ""

# Step 3: Check Node.js
Write-Host "Step 3: Checking Node.js Installation..." -ForegroundColor $Info

$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor $Success
} else {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor $Error
    exit 1
}

Write-Host ""

# Step 4: Backend Dependencies
Write-Host "Step 4: Checking Backend Dependencies..." -ForegroundColor $Info

$backendPath = "d:\Frontend Projects\RakshaMarg Github"
if (Test-Path "$backendPath\node_modules") {
    Write-Host "✓ Backend dependencies already installed" -ForegroundColor $Success
} else {
    Write-Host "Installing backend dependencies..." -ForegroundColor $Warning
    Push-Location $backendPath
    npm install --silent
    Pop-Location
    Write-Host "✓ Backend dependencies installed" -ForegroundColor $Success
}

Write-Host ""

# Step 5: Frontend Dependencies
Write-Host "Step 5: Checking Frontend Dependencies..." -ForegroundColor $Info

$frontendPath = "d:\Frontend Projects\RakshaMarg Github\frontend"
if (Test-Path "$frontendPath\node_modules") {
    Write-Host "✓ Frontend dependencies already installed" -ForegroundColor $Success
} else {
    Write-Host "Installing frontend dependencies..." -ForegroundColor $Warning
    Push-Location $frontendPath
    npm install --silent
    Pop-Location
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor $Success
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Success
Write-Host "║            Setup Complete! Ready to Start Services         ║" -ForegroundColor $Success
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $Success
Write-Host ""

Write-Host "To start the project, open 3 SEPARATE PowerShell terminals:" -ForegroundColor $Info
Write-Host ""

Write-Host "Terminal 1 - Python Nirbhaya Bot:" -ForegroundColor Magenta
Write-Host "  cd `"$nirBhayaPath`"" -ForegroundColor White
Write-Host "  python main.py" -ForegroundColor White
Write-Host ""

Write-Host "Terminal 2 - Node.js Backend:" -ForegroundColor Magenta
Write-Host "  cd `"$backendPath`"" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "Terminal 3 - React Frontend:" -ForegroundColor Magenta
Write-Host "  cd `"$frontendPath`"" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "Once all services are running:" -ForegroundColor $Info
Write-Host "  🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  📡 Backend: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "  🤖 Python Bot: http://localhost:8001/health" -ForegroundColor Cyan
Write-Host "  📚 API Docs: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
