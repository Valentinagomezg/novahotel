<#
.SYNOPSIS
    Levanta floci-az, crea el SQL Server + la base NovaHotelDB y genera .env.floci.

.DESCRIPTION
    Floci AZ emula Azure en local (http://localhost:4577). El servicio Azure SQL
    se ejecuta con el proveedor "managed" (SQL Server 2025 real en Docker), por
    lo que el backend de Spring Boot puede conectarse por JDBC sin cambiar codigo.

.EXAMPLE
    .\scripts\floci-local.ps1 up
    .\scripts\floci-local.ps1 init
    .\scripts\floci-local.ps1 status
    .\scripts\floci-local.ps1 down
#>
param(
    [ValidateSet("up", "init", "env", "status", "down", "all")]
    [string]$Action = "all"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ComposeFile = Join-Path $ProjectRoot "docker-compose.floci.yml"
$EnvFile = Join-Path $ProjectRoot ".env.floci"

$Endpoint = "http://localhost:4577"
$Account = "devstoreaccount1"
$Subscription = "local"
$ResourceGroup = "novahotel"
$ServerName = "novahotel-sql"
$DatabaseName = "NovaHotelDB"
$AdminUser = "sa"
$AdminPassword = "NovaHotel!2026"
$ApiVersion = "2021-11-01"

$ArmBase = "$Endpoint/subscriptions/$Subscription/resourceGroups/$ResourceGroup/providers/Microsoft.Sql/servers"
$ServerPath = "$ArmBase/$ServerName"
$DatabasePath = "$ServerPath/databases/$DatabaseName"
$ConnectPath = "$Endpoint/$Account-sql/servers/$ServerName/databases/$DatabaseName/connect"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Wait-Floci([int]$TimeoutSeconds = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-RestMethod -Uri "$Endpoint/" -Method Get -TimeoutSec 5 -UseBasicParsing | Out-Null
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    throw "floci-az no respondio en $Endpoint. Revisa 'docker compose -f docker-compose.floci.yml logs'."
}

function Get-ArmResource([string]$Path) {
    try {
        return Invoke-RestMethod -Uri "$Path`?api-version=$ApiVersion" -Method Get -UseBasicParsing
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status -eq 404) { return $null }
        throw
    }
}

function Wait-ServerReady([int]$TimeoutSeconds = 300) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $server = Get-ArmResource $ServerPath
        if ($server -ne $null) {
            $state = $server.properties.state
            Write-Host "   estado del servidor SQL: $state"
            if ($state -eq "Ready" -or $state -eq "Succeeded") { return }
            if ($state -eq "Failed") { throw "El SQL Server no pudo iniciar. Revisa los logs de floci-az." }
        }
        Start-Sleep -Seconds 5
    }
    throw "El SQL Server no estuvo listo en $TimeoutSeconds segundos."
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $lines = @()
    if (Test-Path -LiteralPath $EnvFile) {
        $lines = @(Get-Content -LiteralPath $EnvFile)
    }

    $found = $false
    $updated = foreach ($line in $lines) {
        if ($line -match "^\s*$([regex]::Escape($Key))=") {
            $found = $true
            "$Key=$Value"
        } else {
            $line
        }
    }

    if (-not $found) {
        $updated = @($updated) + "$Key=$Value"
    }

    Set-Content -LiteralPath $EnvFile -Value $updated -Encoding UTF8
}

function Write-EnvFile([int]$Port) {
    Set-EnvValue "DB_URL" "jdbc:sqlserver://localhost:$Port;databaseName=$DatabaseName;encrypt=true;trustServerCertificate=true;loginTimeout=30;"
    Set-EnvValue "DB_USERNAME" $AdminUser
    Set-EnvValue "DB_PASSWORD" $AdminPassword
    Set-EnvValue "APP_BASE_URL" "http://localhost:8080"
    Set-EnvValue "SERVER_PORT" "8080"
    Set-EnvValue "MAIL_HOST" "smtp.gmail.com"
    Set-EnvValue "MAIL_PORT" "587"
    Set-EnvValue "MAIL_ENABLED" "true"
    Write-Host "   variables escritas en $EnvFile" -ForegroundColor Green
}

function Initialize-Sql {
    Write-Step "Esperando a floci-az en $Endpoint"
    Wait-Floci

    $existing = Get-ArmResource $ServerPath
    if ($existing -eq $null) {
        Write-Step "Creando SQL Server logico '$ServerName' (contenedor SQL Server 2025)"
        $body = @{
            location   = "eastus"
            properties = @{
                administratorLogin         = $AdminUser
                administratorLoginPassword = $AdminPassword
            }
        } | ConvertTo-Json -Depth 8

        try {
            Invoke-WebRequest -Uri "$ServerPath`?api-version=$ApiVersion" -Method Put `
                -ContentType "application/json" -Body $body -UseBasicParsing | Out-Null
        } catch {
            $status = 0
            if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
            $detail = ""
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $detail = $reader.ReadToEnd()
            } catch { }
            if ($detail -notmatch "NameAlreadyExists") {
                throw "No se pudo crear el servidor SQL (HTTP $status). $detail"
            }
            Write-Host "   el servidor ya existia; se reutiliza"
        }
    } else {
        Write-Host "   el servidor '$ServerName' ya existe; se reutiliza"
    }

    Wait-ServerReady

    $database = Get-ArmResource $DatabasePath
    if ($database -eq $null) {
        Write-Step "Creando base de datos '$DatabaseName'"
        $body = @{ location = "eastus"; properties = @{} } | ConvertTo-Json -Depth 5
        try {
            Invoke-WebRequest -Uri "$DatabasePath`?api-version=$ApiVersion" -Method Put `
                -ContentType "application/json" -Body $body -UseBasicParsing | Out-Null
        } catch {
            $status = 0
            if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
            if ($status -ne 409) { throw "No se pudo crear la base de datos (HTTP $status)." }
        }
    } else {
        Write-Host "   la base '$DatabaseName' ya existe; se reutiliza"
    }

    # En algunas versiones de floci-az la base creada por ARM queda solo en el
    # plano de control. Nos aseguramos de que exista tambien en el contenedor
    # SQL Server real antes de conectar Spring Boot.
    $sqlContainer = (& docker ps --filter "name=floci-az-sql-$ServerName" --format "{{.Names}}" | Select-Object -First 1)
    if ($sqlContainer) {
        Write-Step "Verificando la base '$DatabaseName' en el contenedor SQL Server"
        & docker exec $sqlContainer /opt/mssql-tools18/bin/sqlcmd `
            -S localhost -U $AdminUser -P $AdminPassword -C `
            -Q "IF DB_ID('$DatabaseName') IS NULL CREATE DATABASE [$DatabaseName];" | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   no se pudo verificar con sqlcmd; se continua con /connect" -ForegroundColor Yellow
        }
    }

    Write-Step "Obteniendo cadena de conexion del data plane"
    $connect = $null
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
        try {
            $connect = Invoke-RestMethod -Uri $ConnectPath -Method Get -UseBasicParsing
            break
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    if ($connect -eq $null) {
        throw "No se pudo obtener /connect. Verifica que FLOCI_AZ_SERVICES_SQL_DATA_PLANE_PROVIDER=managed y la EULA."
    }

    # /connect devuelve el puerto interno del contenedor y su hostname de Docker.
    # Para conectarnos desde Windows/Mac usamos el puerto publicado en el host.
    $hostPort = [int]$connect.port
    $sqlContainer = (& docker ps --filter "name=floci-az-sql-$ServerName" --format "{{.Names}}" | Select-Object -First 1)
    if ($sqlContainer) {
        $mapping = (& docker port $sqlContainer 1433 | Select-Object -First 1)
        if ($mapping -match ":(\d+)$") {
            $hostPort = [int]$Matches[1]
        }
    }

    Write-Host "   host: localhost"
    Write-Host "   puerto SQL Server (host): $hostPort"
    Write-EnvFile $hostPort

    Write-Host ""
    Write-Host "Base de datos local lista." -ForegroundColor Green
    Write-Host "  DB_URL=jdbc:sqlserver://localhost:$hostPort;databaseName=$DatabaseName;encrypt=true;trustServerCertificate=true;loginTimeout=30;"
    Write-Host "  DB_USERNAME=$AdminUser"
    Write-Host "  DB_PASSWORD=$AdminPassword"
}

function Show-Status {
    Write-Step "Contenedor floci-az"
    & docker compose -f $ComposeFile ps
    Write-Step "Conexion Azure SQL"
    try {
        $connect = Invoke-RestMethod -Uri $ConnectPath -Method Get -UseBasicParsing
        Write-Host "   host=$($connect.host) port=$($connect.port)"
        Write-Host "   jdbcUrl=$($connect.jdbcUrl)"
    } catch {
        Write-Host "   aun no hay una base de datos inicializada. Ejecuta: .\scripts\floci-local.ps1 init"
    }
}

switch ($Action) {
    "up" {
        Write-Step "Levantando floci-az"
        & docker compose -f $ComposeFile up -d
        if ($LASTEXITCODE -ne 0) { throw "docker compose fallo al levantar floci-az." }
        Wait-Floci
        Write-Host "floci-az listo en $Endpoint" -ForegroundColor Green
    }
    "init" { Initialize-Sql }
    "env" { Initialize-Sql }
    "status" { Show-Status }
    "down" {
        Write-Step "Deteniendo floci-az"
        & docker compose -f $ComposeFile down
    }
    "all" {
        Write-Step "Levantando floci-az"
        & docker compose -f $ComposeFile up -d
        if ($LASTEXITCODE -ne 0) { throw "docker compose fallo al levantar floci-az." }
        Initialize-Sql
    }
}
