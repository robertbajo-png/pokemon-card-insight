$ErrorActionPreference = 'Stop'
$dockerRoot = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop'
$docker = Join-Path $dockerRoot 'resources/bin/docker.exe'
$ready = (& $docker --context desktop-linux info --format '{{.OSType}}' 2>$null) -eq 'linux'
if (-not $ready) {
  Start-Process -FilePath (Join-Path $dockerRoot 'Docker Desktop.exe') -WindowStyle Hidden | Out-Null
  $deadline = [DateTime]::UtcNow.AddMinutes(5)
  do { Start-Sleep -Seconds 5; $ready = (& $docker --context desktop-linux info --format '{{.OSType}}' 2>$null) -eq 'linux' } while (-not $ready -and [DateTime]::UtcNow -lt $deadline)
}
if (-not $ready) { throw 'Local Docker engine did not become ready.' }
& (Join-Path $PSScriptRoot 'run-local-windows.ps1') -Action Resume
if ($LASTEXITCODE -ne 0) { throw 'Local Pokemon did not resume.' }
