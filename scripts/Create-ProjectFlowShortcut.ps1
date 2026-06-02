param(
  [string]$ShortcutName = "ProjectFlow",
  [string]$TargetUrl = "http://127.0.0.1:3344",
  [int]$Port = 3344,
  [ValidateSet("default", "edge-app", "chrome-app")]
  [string]$OpenMode = "edge-app",
  [string]$IconPath = "",
  [string]$IconText = "PF",
  [string]$Color = "#38bdf8"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Convert-HexColor {
  param([string]$Hex)

  if ($Hex -notmatch "^#[0-9a-fA-F]{6}$") {
    $Hex = "#38bdf8"
  }
  return [System.Drawing.Color]::FromArgb(
    [Convert]::ToInt32($Hex.Substring(1, 2), 16),
    [Convert]::ToInt32($Hex.Substring(3, 2), 16),
    [Convert]::ToInt32($Hex.Substring(5, 2), 16)
  )
}

function Save-BitmapAsIcon {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Destination
  )

  $handle = $Bitmap.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($handle)
  $stream = [System.IO.File]::Open($Destination, [System.IO.FileMode]::Create)
  try {
    $icon.Save($stream)
  } finally {
    $stream.Dispose()
    $icon.Dispose()
    $Bitmap.Dispose()
  }
}

function New-TextIcon {
  param(
    [string]$Text,
    [string]$Destination,
    [string]$FillColor
  )

  $bitmap = New-Object System.Drawing.Bitmap 256, 256
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(18, 18, 20))

  $accent = Convert-HexColor -Hex $FillColor
  $brush = New-Object System.Drawing.SolidBrush $accent
  $graphics.FillRectangle($brush, 22, 22, 212, 212)

  $inner = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 34, 38))
  $graphics.FillRectangle($inner, 38, 38, 180, 180)

  $display = $Text
  if ([string]::IsNullOrWhiteSpace($display)) {
    $display = "PF"
  }
  if ($display.Length -gt 3) {
    $display = $display.Substring(0, 3)
  }

  $fontSize = if ($display.Length -eq 1) { 102 } elseif ($display.Length -eq 2) { 82 } else { 62 }
  $font = New-Object System.Drawing.Font "Segoe UI", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $graphics.DrawString($display, $font, $textBrush, (New-Object System.Drawing.RectangleF 0, 0, 256, 256), $format)

  $graphics.Dispose()
  $brush.Dispose()
  $inner.Dispose()
  $font.Dispose()
  $format.Dispose()
  $textBrush.Dispose()

  Save-BitmapAsIcon -Bitmap $bitmap -Destination $Destination
}

function Convert-ImageToIcon {
  param(
    [string]$Source,
    [string]$Destination
  )

  $extension = [System.IO.Path]::GetExtension($Source).ToLowerInvariant()
  if ($extension -eq ".ico") {
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
    return
  }

  if ($extension -in @(".png", ".jpg", ".jpeg", ".bmp", ".gif")) {
    $sourceBitmap = [System.Drawing.Bitmap]::FromFile($Source)
    $bitmap = New-Object System.Drawing.Bitmap 256, 256
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($sourceBitmap, 0, 0, 256, 256)
    $graphics.Dispose()
    $sourceBitmap.Dispose()
    Save-BitmapAsIcon -Bitmap $bitmap -Destination $Destination
    return
  }

  New-TextIcon -Text $IconText -Destination $Destination -FillColor $Color
}

function Get-SafeShortcutName {
  param([string]$Name)
  $safe = $Name -replace '[<>:"/\\|?*]', "_"
  if ([string]::IsNullOrWhiteSpace($safe)) {
    return "ProjectFlow"
  }
  return $safe
}

$DataRoot = Join-Path $env:LOCALAPPDATA "ProjectFlow"
$ProjectIconRoot = Join-Path $DataRoot "icons\projects"
New-Item -ItemType Directory -Force -Path $ProjectIconRoot | Out-Null

$safeName = Get-SafeShortcutName -Name $ShortcutName
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "$safeName.lnk"
$launcher = Join-Path $PSScriptRoot "Start-ProjectFlow.ps1"
$iconDestination = Join-Path $DataRoot "icons\projectflow_v2.ico"

if (-not [string]::IsNullOrWhiteSpace($IconPath) -and (Test-Path -LiteralPath $IconPath)) {
  Convert-ImageToIcon -Source $IconPath -Destination $iconDestination
} else {
  New-TextIcon -Text $IconText -Destination $iconDestination -FillColor $Color
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.WorkingDirectory = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -TargetUrl `"$TargetUrl`" -Port $Port -OpenMode $OpenMode"
$shortcut.IconLocation = $iconDestination
$shortcut.Save()

[PSCustomObject]@{
  shortcutPath = $shortcutPath
  iconPath = $iconDestination
  targetUrl = $TargetUrl
} | ConvertTo-Json -Compress
