. (Join-Path $PSScriptRoot 'local-windows-common.ps1')
Assert-PokemonEngine
$db = @(Get-PokemonContainers | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq 'db' })
if ($db.Count -ne 1 -or -not $db[0].State.Running) { throw 'Local database is not running.' }
$name = 'pokemon-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '.backup'
$folder = Join-Path $script:PokemonState 'backups'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$destination = Join-Path $folder $name
if (Test-Path -LiteralPath $destination) { throw 'Backup already exists.' }
Invoke-PokemonDocker -Arguments @('exec', $db[0].Id, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc', '--file', "/tmp/$name") -Private | Out-Null
try { Invoke-PokemonDocker -Arguments @('cp', "$($db[0].Id):/tmp/$name", $destination) -Private | Out-Null }
finally { Invoke-PokemonDocker -Arguments @('exec', $db[0].Id, 'rm', '--', "/tmp/$name") -Private | Out-Null }
$hash = Get-FileHash -LiteralPath $destination -Algorithm SHA256
@{ createdAt=[DateTime]::UtcNow.ToString('o'); file=$name; sha256=$hash.Hash; bytes=(Get-Item -LiteralPath $destination).Length } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $script:PokemonState 'backup-status.json') -Encoding utf8
Write-Host "Database backup saved: $destination"
