param([Parameter(Mandatory)][string]$ArchivePath)
. (Join-Path $PSScriptRoot 'local-windows-common.ps1')
Assert-PokemonEngine
$archive = Get-Item -LiteralPath $ArchivePath
if ($archive.PSIsContainer -or ($archive.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'A regular database backup file is required.' }
$hash = (Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
Invoke-PokemonSql 'create table if not exists public.pokemon_local_imports(hash text primary key, imported_at timestamptz not null default now()); revoke all on public.pokemon_local_imports from public, anon, authenticated;' | Out-Null
if ((Invoke-PokemonSql "select count(*) from public.pokemon_local_imports where hash='$hash';").Trim() -eq '1') { Write-Host 'This archive has already been imported; no records changed.'; exit 0 }
if ((Invoke-PokemonSql 'select (select count(*) from auth.users)+(select count(*) from public.collection_cards);').Trim() -ne '0') { throw 'Archive import requires an empty local account/collection destination. Existing local data was not overwritten.' }
$mount = "type=bind,source=$($archive.DirectoryName),target=/backup,readonly"
$dump = Invoke-PokemonDocker -Arguments @('run', '--rm', '--network', 'none', '--label', 'pokemon.scope=archive-import', '--mount', $mount,
  'postgres:17-bookworm', 'pg_restore', '--data-only', '--schema=auth', '--schema=public', '--file=-', "/backup/$($archive.Name)") -Private
$blocks = @{}
foreach ($match in [regex]::Matches($dump, '(?ms)^COPY (?<table>[a-z_]+\.[a-z_]+) \((?<columns>[^\r\n]+)\) FROM stdin;\r?\n(?<rows>.*?)^\\\.\r?$')) {
  $blocks[$match.Groups['table'].Value] = $match
}
$tables = @('auth.users', 'auth.identities', 'auth.mfa_factors', 'auth.mfa_recovery_code_sets', 'auth.mfa_recovery_codes', 'auth.webauthn_credentials', 'public.ai_usage_windows', 'public.collection_cards')
$commands = [Collections.Generic.List[string]]::new()
$commands.Add("begin;`n")
$counts = [ordered]@{}
foreach ($table in $tables) {
  if (-not $blocks.ContainsKey($table)) { continue }
  $match = $blocks[$table]
  $rows = $match.Groups['rows'].Value.TrimEnd("`r", "`n")
  $count = if ($rows.Length) { @($rows -split '\r?\n').Count } else { 0 }
  $counts[$table] = $count
  if ($count) {
    if ($match.Groups['columns'].Value -notmatch '^[a-z_",\s]+$') { throw 'Unexpected archive column names.' }
    $commands.Add("COPY $table ($($match.Groups['columns'].Value)) FROM stdin;`n$rows`n\.`n")
  }
}
if (-not $counts.Contains('auth.users')) { throw 'Archive is missing account data.' }
$commands.Add("insert into public.pokemon_local_imports(hash) values ('$hash');`ncommit;`n")
Invoke-PokemonSql ($commands -join "`n") | Out-Null
$actual = (Invoke-PokemonSql 'select count(*) from auth.users;').Trim()
if ([int]$actual -ne $counts['auth.users']) { throw 'Imported account count does not match the archive.' }
@{ importedAt=[DateTime]::UtcNow.ToString('o'); archiveSha256=$hash; counts=$counts; sessionsMigrated=$false } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $script:PokemonState 'import-status.json') -Encoding utf8
Write-Host "Imported $actual existing accounts and $($counts['public.collection_cards']) collection records. Sign in again using the existing account password."
