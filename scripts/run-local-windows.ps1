param([ValidateSet('Start', 'Stop', 'Status', 'Restart', 'Resume', 'Verify')][string]$Action = 'Start', [switch]$Trace)
. (Join-Path $PSScriptRoot 'local-windows-common.ps1')
$script:PokemonTrace = [bool]$Trace
Write-Host 'Checking local Docker engine...'
Assert-PokemonEngine
Write-Host 'Reading installed Pokemon services...'
$containers = @(Get-PokemonContainers)
if ($Action -eq 'Status') {
  foreach ($container in $containers) { Write-Host "$($container.Name.TrimStart('/')): $($container.State.Status)" }
  Write-Host 'App: http://127.0.0.1:5220/ ; local email inbox: http://127.0.0.1:5225/'
  exit 0
}
if ($Action -eq 'Stop') {
  $mobileScript = Join-Path $PSScriptRoot 'run-local-mobile.ps1'
  if (Test-Path -LiteralPath $mobileScript) { & $mobileScript -Action Suspend }
  if ($containers.Count) { Invoke-PokemonDocker -Arguments (@('stop') + @($containers.Id)) | Out-Null }
  Write-Host 'Local Pokemon stopped; its database volume is retained.'
  exit 0
}
if ($Action -eq 'Start') {
  Write-Host 'Preparing private local backend settings...'
  $secrets = Get-PokemonSecrets -Create
  try {
    $secrets.POKEMON_PUBLIC_ORIGIN = Get-PokemonPublicOrigin
    $aiSettings = Get-PokemonAiSettings
    foreach ($key in $aiSettings.Keys) { $secrets[$key] = $aiSettings[$key] }
    $aiSettings.Clear()
    $compose = @('compose', '--project-name', 'pokemon-local', '--file', (Join-Path $script:PokemonRoot 'config/local-windows/compose.json'), '--env-file', (Join-Path $script:PokemonRoot 'config/local-windows/compose.env'))
    Write-Host 'Building and starting local Pokemon services...'
    Invoke-PokemonDocker -Arguments ($compose + @('up', '--detach', '--build', '--wait', '--wait-timeout', '180')) -Environment $secrets | Out-Null
  } finally { if ($secrets) { $secrets.Clear() } }
  Invoke-PokemonSql ([IO.File]::ReadAllText((Join-Path $script:PokemonRoot 'config/local-windows/auth-helpers.sql'))) | Out-Null
  Invoke-PokemonSql 'create table if not exists public.pokemon_local_migrations(id text primary key); revoke all on public.pokemon_local_migrations from public, anon, authenticated;' | Out-Null
  foreach ($migration in Get-ChildItem -LiteralPath (Join-Path $script:PokemonRoot 'supabase/migrations') -Filter '*.sql' | Sort-Object Name) {
    if ($migration.BaseName -notmatch '^\d{14}_[a-z_]+$') { throw 'Unexpected migration name.' }
    $exists = (Invoke-PokemonSql "select count(*) from public.pokemon_local_migrations where id='$($migration.BaseName)';").Trim()
    if ($exists -eq '0') {
      $sql = [IO.File]::ReadAllText($migration.FullName)
      Invoke-PokemonSql "begin;`n$sql`ninsert into public.pokemon_local_migrations values ('$($migration.BaseName)');`ncommit;" | Out-Null
    }
  }
} elseif ($Action -in @('Resume', 'Restart')) {
  if ($containers.Count -ne 6) { throw 'Run Start once to install the local application.' }
  if ($Action -eq 'Restart') { Invoke-PokemonDocker -Arguments (@('restart') + @($containers.Id)) | Out-Null }
  else {
    foreach ($service in @('db', 'mail', 'auth', 'rest', 'functions', 'web')) {
      $container = $containers | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq $service }
      if (-not $container.State.Running) { Invoke-PokemonDocker -Arguments @('start', $container.Id) | Out-Null }
    }
  }
}
if ($Action -eq 'Resume') { Sync-PokemonAuthOrigin }
$deadline = [DateTime]::UtcNow.AddMinutes(3)
do {
  try { Test-PokemonHosting; $ready=$true; break } catch { $ready=$false; $failure=$_.Exception.Message; Start-Sleep -Seconds 3 }
} while ([DateTime]::UtcNow -lt $deadline)
if (-not $ready) { throw "Local Pokemon did not become ready: $failure" }
if ($Action -in @('Start','Resume')) {
  $mobileScript = Join-Path $PSScriptRoot 'run-local-mobile.ps1'
  if (Test-Path -LiteralPath $mobileScript) { & $mobileScript -Action Resume }
}
$aiState = Get-PokemonAiState
@{ checkedAt=[DateTime]::UtcNow.ToString('o'); status='ready'; url='http://127.0.0.1:5220/'; backend='local'; aiConfigured=$aiState.configured; aiProvider=$aiState.provider } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $script:PokemonState 'status.json') -Encoding utf8
Write-Host 'Pokemon Card Lens: http://127.0.0.1:5220/'
