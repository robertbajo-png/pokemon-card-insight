$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'PowerShell 7 on Windows is required.' }
$script:PokemonRoot = Split-Path -Parent $PSScriptRoot
$script:PokemonDocker = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'
$script:PokemonState = Join-Path $env:LOCALAPPDATA 'PokemonCardHosting'
if (-not (Test-Path -LiteralPath $script:PokemonDocker -PathType Leaf)) { throw 'Docker Desktop is required.' }
if (Test-Path -LiteralPath $script:PokemonState) {
  if ((Get-Item -LiteralPath $script:PokemonState).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected state directory refused.' }
} else { New-Item -ItemType Directory -Path $script:PokemonState | Out-Null }
$taskOwner = [Security.Principal.WindowsIdentity]::GetCurrent().User
$taskAcl = [Security.AccessControl.DirectorySecurity]::new()
$taskAcl.SetOwner($taskOwner)
$taskAcl.SetAccessRuleProtection($true, $false)
foreach ($taskIdentity in @($taskOwner, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
  $taskAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($taskIdentity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
}
[IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($script:PokemonState), $taskAcl)

function Invoke-PokemonDocker {
  param([string[]]$Arguments, [hashtable]$Environment = @{}, [string]$InputText, [switch]$Private)
  $start = [Diagnostics.ProcessStartInfo]::new($script:PokemonDocker)
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.RedirectStandardInput = $true
  $start.WorkingDirectory = $script:PokemonRoot
  foreach ($taskKey in @($start.Environment.Keys)) {
    if ($taskKey -match '^(DOCKER_|COMPOSE_|POKEMON_|VITE_)') { $start.Environment.Remove($taskKey) | Out-Null }
  }
  foreach ($taskKey in $Environment.Keys) { $start.Environment[$taskKey] = [string]$Environment[$taskKey] }
  foreach ($taskArgument in @('--context', 'desktop-linux') + $Arguments) { $start.ArgumentList.Add($taskArgument) }
  if ($script:PokemonTrace) { Write-Host "Docker $($Arguments[0]): starting" }
  $process = [Diagnostics.Process]::Start($start)
  if ($script:PokemonTrace) { Write-Host "Docker child $($process.Id): started" }
  try {
    $output = $process.StandardOutput.ReadToEndAsync()
    $errors = $process.StandardError.ReadToEndAsync()
    if ($InputText) { $process.StandardInput.Write($InputText) }
    $process.StandardInput.Close()
    if ($script:PokemonTrace) { Write-Host 'Waiting for Docker child...' }
    $process.WaitForExit()
    if ($script:PokemonTrace) { Write-Host 'Docker child exited.' }
    $text = $output.GetAwaiter().GetResult()
    $diagnostic = $errors.GetAwaiter().GetResult()
    if ($process.ExitCode -ne 0) {
      if ($Private) { throw "Private local database operation failed ($($process.ExitCode)); record contents withheld." }
      foreach ($value in $Environment.Values) {
        if ([string]$value -and ([string]$value).Length -gt 8) { $diagnostic = $diagnostic.Replace([string]$value, '[local setting]') }
      }
      throw "Pokemon Docker command failed ($($process.ExitCode)): $($diagnostic.Substring([Math]::Max(0, $diagnostic.Length - 2500)))"
    }
    return $text
  } finally { $start.Environment.Clear(); $process.Dispose() }
}

function Assert-PokemonEngine {
  $context = Invoke-PokemonDocker -Arguments @('context', 'inspect', 'desktop-linux') | ConvertFrom-Json
  if ($context[0].Endpoints.docker.Host -ne 'npipe:////./pipe/dockerDesktopLinuxEngine') { throw 'Only the local Docker Desktop Linux engine is allowed.' }
}

function Get-PokemonContainers {
  $ids = (Invoke-PokemonDocker -Arguments @('ps', '--all', '--filter', 'label=com.docker.compose.project=pokemon-local', '--format', '{{.ID}}')).Trim()
  if (-not $ids) { return @() }
  $containers = Invoke-PokemonDocker -Arguments (@('inspect') + @($ids -split '\r?\n')) | ConvertFrom-Json
  foreach ($container in $containers) {
    if ($container.Config.Labels.'com.docker.compose.project' -ne 'pokemon-local' -or $container.Config.Labels.'pokemon.scope' -ne 'local-windows') { throw 'Unrelated Docker resource refused.' }
  }
  return @($containers)
}

function ConvertTo-PokemonBase64Url([byte[]]$Bytes) { return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_') }
function New-PokemonJwt([string]$Role, [string]$Secret) {
  $header = ConvertTo-PokemonBase64Url ([Text.Encoding]::UTF8.GetBytes('{"alg":"HS256","typ":"JWT"}'))
  $payload = @{ role=$Role; iss='supabase'; iat=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds(); exp=[DateTimeOffset]::UtcNow.AddYears(10).ToUnixTimeSeconds() } | ConvertTo-Json -Compress
  $body = "$header.$(ConvertTo-PokemonBase64Url ([Text.Encoding]::UTF8.GetBytes($payload)))"
  $hmac = [Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($Secret))
  try { return "$body.$(ConvertTo-PokemonBase64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))))" } finally { $hmac.Dispose() }
}

function Get-PokemonSecrets([switch]$Create) {
  $path = Join-Path $script:PokemonState 'backend.clixml'
  if (-not (Test-Path -LiteralPath $path)) {
    if (-not $Create) { throw 'Local backend has not been installed.' }
    $volumes = (Invoke-PokemonDocker -Arguments @('volume', 'ls', '--filter', 'label=com.docker.compose.project=pokemon-local', '--format', '{{.Name}}')).Trim()
    if ($volumes) { throw 'Existing database found without its credential store; refusing to replace credentials.' }
    $dbPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
    $jwtSecret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48)).ToLowerInvariant()
    $values = @{ POKEMON_DB_PASSWORD=$dbPassword; POKEMON_JWT_SECRET=$jwtSecret; POKEMON_ANON_KEY=(New-PokemonJwt 'anon' $jwtSecret); POKEMON_SERVICE_KEY=(New-PokemonJwt 'service_role' $jwtSecret) }
    $credential = [PSCredential]::new('PokemonLocalBackend', (ConvertTo-SecureString ($values | ConvertTo-Json -Compress) -AsPlainText -Force))
    $credential | Export-Clixml -LiteralPath $path
  }
  if ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected credential file refused.' }
  $credential = Import-Clixml -LiteralPath $path
  if ($credential -isnot [PSCredential] -or $credential.UserName -ne 'PokemonLocalBackend') { throw 'Unexpected credential store.' }
  return ($credential.GetNetworkCredential().Password | ConvertFrom-Json -AsHashtable)
}

function Invoke-PokemonSql([string]$Sql) {
  $db = @(Get-PokemonContainers | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq 'db' })
  if ($db.Count -ne 1 -or -not $db[0].State.Running) { throw 'Installed local database is not running.' }
  return Invoke-PokemonDocker -Arguments @('exec', '-i', $db[0].Id, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-At') -InputText $Sql -Private
}

function Test-PokemonHosting {
  $containers = @(Get-PokemonContainers)
  if ($containers.Count -ne 6 -or @($containers | Where-Object { -not $_.State.Running }).Count) { throw 'Not all six local services are running.' }
  foreach ($container in $containers) {
    foreach ($binding in $container.NetworkSettings.Ports.PSObject.Properties.Value) {
      foreach ($endpoint in @($binding)) { if ($endpoint -and $endpoint.HostIp -ne '127.0.0.1') { throw 'A local service is exposed beyond loopback.' } }
    }
    if ($container.State.Health -and $container.State.Health.Status -ne 'healthy') { throw 'A service is not healthy.' }
  }
  foreach ($path in @('/healthz', '/backend/auth/v1/health', '/backend/functions/v1/_health', '/collection')) {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5220$path" -NoProxy -TimeoutSec 30
    if ($response.StatusCode -ne 200) { throw "Local route failed: $path" }
  }
  Write-Host 'Verified: six local services, loopback only, frontend/Auth/functions ready.'
}
