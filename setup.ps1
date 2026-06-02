param(
  [switch]$SkipInstall,
  [switch]$SkipBuild,
  [int]$Port = 3344
)

$ErrorActionPreference = "Stop"
$AppRoot = $PSScriptRoot
$DataRoot = Join-Path $env:LOCALAPPDATA "ProjectFlow"

New-Item -ItemType Directory -Force -Path $DataRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataRoot "attachments") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataRoot "icons\projects") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataRoot "backups") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataRoot "logs") | Out-Null

$npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $npm) {
  $npm = Get-Command "npm" -ErrorAction SilentlyContinue
}
if (-not $npm) {
  throw "npm was not found. Install Node.js first."
}

Set-Location $AppRoot

if (-not $SkipInstall) {
  & $npm.Source install
}

if (-not $SkipBuild) {
  & $npm.Source run build
}

& (Join-Path $AppRoot "scripts\Create-ProjectFlowShortcut.ps1") `
  -ShortcutName "ProjectFlow" `
  -TargetUrl "http://127.0.0.1:$Port" `
  -Port $Port `
  -IconPath (Join-Path $AppRoot "public\logo.png") `
  -Color "#38bdf8"

Write-Host ""
Write-Host "ProjectFlow is ready."
Write-Host "Use the ProjectFlow desktop shortcut, or run: npm run dev"
