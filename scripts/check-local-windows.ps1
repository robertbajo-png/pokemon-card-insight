param([switch]$RestartRoundTrip, [string]$ScanImage, [string]$ExpectedName)
. (Join-Path $PSScriptRoot 'local-windows-common.ps1')
Assert-PokemonEngine
Test-PokemonHosting
$settings = Get-PokemonSecrets
try {
  $settings.aiConfigured = (Get-PokemonAiState).configured
  if ($ScanImage) {
    if (-not $settings.aiConfigured) { throw 'Configure the local AI provider before requesting a live scan.' }
    $imageFile = Get-Item -LiteralPath $ScanImage
    if (-not ($imageFile -is [IO.FileInfo]) -or $imageFile.Length -gt 2MB) { throw 'A card image of at most 2 MB is required.' }
    $mime = switch ($imageFile.Extension.ToLowerInvariant()) { '.jpg' { 'image/jpeg' } '.jpeg' { 'image/jpeg' } '.png' { 'image/png' } '.webp' { 'image/webp' } default { throw 'Unsupported card image extension.' } }
    $settings.scanImage = 'data:' + $mime + ';base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($imageFile.FullName))
    $settings.expectedName = $ExpectedName
  }
} catch { $settings.Clear(); throw }
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$node = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $node)) { throw 'Node.js 22 is required for the acceptance test.' }
$settings.restart = [bool]$RestartRoundTrip
$settings.pwsh = (Get-Process -Id $PID).Path
$settings.launcher = Join-Path $PSScriptRoot 'run-local-windows.ps1'
$start = [Diagnostics.ProcessStartInfo]::new($node)
$start.UseShellExecute=$false; $start.CreateNoWindow=$true
$start.RedirectStandardInput=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
$start.ArgumentList.Add((Join-Path $PSScriptRoot 'check-local-windows.mjs'))
$process = [Diagnostics.Process]::Start($start)
try {
  $output=$process.StandardOutput.ReadToEndAsync(); $errors=$process.StandardError.ReadToEndAsync()
  $process.StandardInput.Write(($settings | ConvertTo-Json -Compress)); $process.StandardInput.Close()
  $process.WaitForExit()
  $report=$output.GetAwaiter().GetResult()
  if (-not $report.TrimStart().StartsWith('{')) { throw 'Acceptance test did not produce a safe report.' }
  $report | Set-Content -LiteralPath (Join-Path $script:PokemonState 'acceptance.json') -Encoding utf8
  Write-Host $report
  if ($process.ExitCode -ne 0) { throw 'Local acceptance failed.' }
} finally { $settings.Clear(); $process.Dispose() }
