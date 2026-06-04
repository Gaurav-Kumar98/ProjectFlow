param(
  [string]$TargetUrl = "",
  [string]$ProjectId = "",
  [int]$Port = 3344,
  [ValidateSet("default", "edge-app", "chrome-app")]
  [string]$OpenMode = "edge-app"
)

$ErrorActionPreference = "Stop"

function Test-ProjectFlowServer {
  param([int]$CheckPort)

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$CheckPort/api/health" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-ProjectFlowPage {
  param(
    [string]$Url,
    [int]$TimeoutSec = 60
  )

  # In dev mode Next.js compiles each route lazily on its first request, so the
  # server can answer /api/health long before the page route is ready. Request
  # the actual page (and let it compile) before opening the browser, otherwise
  # the first launch opens against a not-yet-served route.
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
      if ($response.StatusCode -eq 200) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  return $false
}

function Open-ProjectFlowUrl {
  param(
    [string]$Url,
    [string]$Mode
  )

  if ($Mode -eq "edge-app") {
    $edge = Get-Command "msedge.exe" -ErrorAction SilentlyContinue
    if ($edge) {
      Start-Process -FilePath $edge.Source -ArgumentList "--app=$Url"
      return
    }
  }

  if ($Mode -eq "chrome-app") {
    $chrome = Get-Command "chrome.exe" -ErrorAction SilentlyContinue
    if ($chrome) {
      Start-Process -FilePath $chrome.Source -ArgumentList "--app=$Url"
      return
    }
  }

  Start-Process $Url
}

$AppRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($TargetUrl)) {
  $TargetUrl = "http://127.0.0.1:$Port"
}

if (-not (Test-ProjectFlowServer -CheckPort $Port)) {
  $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if (-not $npm) {
    $npm = Get-Command "npm" -ErrorAction SilentlyContinue
  }
  if (-not $npm) {
    throw "npm was not found. Install Node.js, then run setup.ps1 again."
  }

  $scriptName = "start:local"
  if (-not (Test-Path (Join-Path $AppRoot ".next\BUILD_ID"))) {
    $scriptName = "dev:local"
  }

  $command = @"
Set-Location '$AppRoot'
`$env:PORT = '$Port'
& '$($npm.Source)' run $scriptName *> '$(Join-Path $env:LOCALAPPDATA "ProjectFlow\logs\server.log")'
"@

  $logDir = Join-Path $env:LOCALAPPDATA "ProjectFlow\logs"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $command
  )

  $ready = $false
  for ($i = 0; $i -lt 80; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-ProjectFlowServer -CheckPort $Port) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    throw "ProjectFlow did not become ready on port $Port. Check $logDir\server.log."
  }
}

# Ensure the page route is actually compiled and serving (dev mode compiles
# lazily), so the browser doesn't open against a not-yet-ready route.
Wait-ProjectFlowPage -Url $TargetUrl | Out-Null

Open-ProjectFlowUrl -Url $TargetUrl -Mode $OpenMode
