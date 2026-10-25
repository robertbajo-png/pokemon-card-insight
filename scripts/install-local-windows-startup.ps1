param([switch]$Remove)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'PowerShell 7 on Windows is required.' }
$startup = [Environment]::GetFolderPath('Startup')
$path = Join-Path $startup 'Pokemon Card Lens Local.lnk'
$marker = 'Pokemon Card Lens isolated local hosting'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($path)
if ((Test-Path -LiteralPath $path) -and $shortcut.Description -ne $marker) { throw 'Unrelated startup shortcut refused.' }
if ($Remove) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }; Write-Host 'Pokemon startup removed.'; exit 0 }
. (Join-Path $PSScriptRoot 'local-windows-common.ps1')
$runtime = Join-Path $script:PokemonState 'runtime/scripts'
if ((Test-Path -LiteralPath $runtime) -and ((Get-Item -LiteralPath $runtime).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Redirected runtime directory refused.' }
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
foreach ($name in @('local-windows-common.ps1', 'run-local-windows.ps1', 'start-local-windows-session.ps1')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $runtime $name) -Force
}
$entry = Join-Path $runtime 'start-local-windows-session.ps1'
$shortcut.TargetPath = (Get-Process -Id $PID).Path
$shortcut.Arguments = "-NoProfile -NonInteractive -WindowStyle Hidden -File `"$entry`""
$shortcut.WorkingDirectory = Split-Path -Parent $runtime
$shortcut.WindowStyle = 7
$shortcut.Description = $marker
$shortcut.Save()
$check = $shell.CreateShortcut($path)
if ($check.TargetPath -ne $shortcut.TargetPath -or $check.Arguments -ne $shortcut.Arguments) { throw 'Startup verification failed.' }
Write-Host 'Pokemon starts after this Windows user signs in. No saved Windows password or administrator privilege is required.'
