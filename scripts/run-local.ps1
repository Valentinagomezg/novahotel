<#
.SYNOPSIS
    Ejecuta NOVA Hotels contra el Azure SQL local de floci-az.

.DESCRIPTION
    1. Si .env.floci no existe, levanta Floci AZ y crea SQL Server + NovaHotelDB.
    2. Carga .env.floci como variables de entorno del proceso.
    3. Compila (opcional) y arranca Spring Boot.

.EXAMPLE
    .\scripts\run-local.ps1
    .\scripts\run-local.ps1 -SkipBuild
#>
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env.floci"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Host "No existe .env.floci; inicializando Floci AZ..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "floci-local.ps1") all
}

Get-Content -LiteralPath $EnvFile | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
    $key, $value = $_ -split "=", 2
    Set-Item -Path "Env:$($key.Trim())" -Value $value.Trim()
}

Write-Host "DB_URL=$env:DB_URL"

if (-not $SkipBuild) {
    & (Join-Path $ProjectRoot "mvnw.cmd") -DskipTests package
    if ($LASTEXITCODE -ne 0) { throw "La compilacion fallo." }
}

Push-Location $ProjectRoot
try {
    & java -jar "target\novahotel-0.0.1-SNAPSHOT.jar"
} finally {
    Pop-Location
}
