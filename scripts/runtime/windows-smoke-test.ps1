param(
  [string]$AppRoot = "release/win-unpacked",
  [int]$BootTimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"

$report = @()

function Add-Result {
  param(
    [string]$Check,
    [string]$Status,
    [string]$Message
  )
  $report += [pscustomobject]@{
    check = $Check
    status = $Status
    message = $Message
  }
}

function Test-RequiredPath {
  param(
    [string]$Check,
    [string]$TargetPath
  )

  if (Test-Path $TargetPath) {
    Add-Result -Check $Check -Status "OK" -Message "Encontrado: $TargetPath"
    return $true
  }

  Add-Result -Check $Check -Status "ERROR" -Message "No existe: $TargetPath"
  return $false
}

$absoluteRoot = Resolve-Path -Path $AppRoot -ErrorAction SilentlyContinue
if (-not $absoluteRoot) {
  Add-Result -Check "app_root" -Status "ERROR" -Message "No existe AppRoot: $AppRoot"
  $report | Format-Table -AutoSize
  exit 1
}

$absoluteRoot = $absoluteRoot.Path
$exeCandidates = Get-ChildItem -Path $absoluteRoot -Filter *.exe -File
$mainExe = $exeCandidates | Where-Object { $_.Name -notlike "*portable*" } | Select-Object -First 1
if (-not $mainExe) {
  $mainExe = $exeCandidates | Select-Object -First 1
}

$hasExe = $false
if ($mainExe) {
  Add-Result -Check "main_exe" -Status "OK" -Message "EXE principal detectado: $($mainExe.FullName)"
  $hasExe = $true
} else {
  Add-Result -Check "main_exe" -Status "ERROR" -Message "No se encontró ejecutable principal en $absoluteRoot"
}

$asarPath = Join-Path $absoluteRoot "resources/app.asar"
$dumpPath = Join-Path $absoluteRoot "resources/bin/mysqldump.exe"
$runtimeDir = Join-Path $absoluteRoot "resources/runtime"

$hasAsar = Test-RequiredPath -Check "app_asar" -TargetPath $asarPath
$hasDump = Test-RequiredPath -Check "mysqldump" -TargetPath $dumpPath

if (Test-Path $runtimeDir) {
  Add-Result -Check "runtime_dir" -Status "OK" -Message "Directorio runtime detectado: $runtimeDir"
} else {
  Add-Result -Check "runtime_dir" -Status "WARN" -Message "No existe runtime dir: $runtimeDir (solo afecta features con credenciales runtime)"
}

if ($hasExe) {
  try {
    $process = Start-Process -FilePath $mainExe.FullName -PassThru
    Start-Sleep -Seconds $BootTimeoutSeconds

    if ($process.HasExited) {
      Add-Result -Check "app_boot" -Status "WARN" -Message "La app cerró antes de $BootTimeoutSeconds segundos (revisar logs)."
    } else {
      Add-Result -Check "app_boot" -Status "OK" -Message "La app arrancó y sigue en ejecución después de $BootTimeoutSeconds segundos."
      Stop-Process -Id $process.Id -Force
    }
  } catch {
    Add-Result -Check "app_boot" -Status "ERROR" -Message "No se pudo iniciar la app: $($_.Exception.Message)"
  }
}

$report | Format-Table -AutoSize
$reportPath = Join-Path $absoluteRoot "smoke-test-report.json"
$report | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "Reporte generado en: $reportPath"

$hasError = $report | Where-Object { $_.status -eq "ERROR" }
if ($hasError) {
  exit 1
}

exit 0
