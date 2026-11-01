$ErrorActionPreference = 'Stop'
$catalogueRevision = '39a26a144c8b6ef6c2fb17b2c29d0bb7121e3a11'
$catalogueUpdatedAt = '2026-09-17'
$expectedSetCount = 176
$maxCardFileBytes = 4MB
$maxCatalogueBytes = 40MB
$maxArchiveBytes = 64MB
$projectRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$buildRoot = Join-Path $projectRoot '.local-build'
$catalogueRoot = Join-Path $buildRoot 'catalogue'
$utf8 = [Text.UTF8Encoding]::new($false, $true)

function Assert-CataloguePath([string]$Path) {
  $fullPath = [IO.Path]::GetFullPath($Path)
  if (-not $fullPath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Catalogue path is outside the project.'
  }
  $currentPath = $fullPath
  while ($currentPath -and $currentPath.Length -ge $projectRoot.Length) {
    if (Test-Path -LiteralPath $currentPath) {
      if ((Get-Item -LiteralPath $currentPath -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'Redirected catalogue paths are not allowed.'
      }
    }
    $currentPath = Split-Path -Parent $currentPath
  }
  return $fullPath
}

function Remove-CatalogueDirectory([string]$Path) {
  $fullPath = Assert-CataloguePath $Path
  if ((Split-Path -Parent $fullPath) -ne $buildRoot -or (Split-Path -Leaf $fullPath) -notmatch '^catalogue(?:-install-[a-f0-9]{32})?$') {
    throw 'Unexpected catalogue cleanup target.'
  }
  if (Test-Path -LiteralPath $fullPath) {
    # Reject redirections before a recursive traversal, including nested junctions.
    $pending = [Collections.Generic.Queue[string]]::new()
    $pending.Enqueue($fullPath)
    while ($pending.Count) {
      foreach ($item in Get-ChildItem -LiteralPath $pending.Dequeue() -Force) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected catalogue entry refused.' }
        if ($item.PSIsContainer) { $pending.Enqueue($item.FullName) }
      }
    }
    Remove-Item -LiteralPath $fullPath -Recurse -Force
  }
}

function Get-CardCount([object[]]$Cards, [string]$SetId) {
  $ids = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($card in $Cards) {
    if ($card.id -isnot [string] -or $card.id -notmatch ('^' + [regex]::Escape($SetId) + '-[A-Za-z0-9_!?-]{1,80}$') -or -not $ids.Add($card.id)) {
      throw "Invalid or duplicate card ID in $SetId."
    }
    # Reprint sets can legitimately repeat printed numbers (e.g. Celebrations).
    if ($card.number -isnot [string] -or $card.number.Length -lt 1 -or $card.number.Length -gt 32 -or $card.number -match '[\x00-\x1f\x7f]') {
      throw "Invalid printed card number in $SetId."
    }
    if ($card.name -isnot [string] -or -not $card.name.Trim() -or $card.name.Length -gt 200) { throw "Invalid card name in $SetId." }
  }
  return $ids.Count
}

function Test-InstalledCatalogue {
  if (-not (Test-Path -LiteralPath $catalogueRoot -PathType Container)) { return $false }
  try {
    $null = Assert-CataloguePath $catalogueRoot
    $indexPath = Assert-CataloguePath (Join-Path $catalogueRoot 'index.json')
    if ((Get-Item -LiteralPath $indexPath).Length -gt 1MB) { return $false }
    $manifest = [IO.File]::ReadAllText($indexPath, $utf8) | ConvertFrom-Json -AsHashtable
    if ($manifest.schemaVersion -ne 1 -or $manifest.revision -ne $catalogueRevision -or $manifest.updatedAt -ne $catalogueUpdatedAt -or $manifest.sets.Count -ne $expectedSetCount -or $manifest.files.Count -ne $expectedSetCount) { return $false }
    $rootEntries = @(Get-ChildItem -LiteralPath $catalogueRoot -Force)
    if ($rootEntries.Count -ne 2 -or @($rootEntries | Where-Object { $_.Name -cnotin @('index.json', 'cards') -or ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) }).Count) { return $false }
    $cardDirectory = Assert-CataloguePath (Join-Path $catalogueRoot 'cards')
    $cardEntries = @(Get-ChildItem -LiteralPath $cardDirectory -Force)
    if ($cardEntries.Count -ne $expectedSetCount) { return $false }
    foreach ($entry in $cardEntries) {
      if ($entry.PSIsContainer -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $entry.Name -cnotmatch '^[a-z0-9]{1,32}\.json$' -or -not $manifest.files.ContainsKey($entry.BaseName)) { return $false }
    }
    $setIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    [long]$totalBytes = 0
    foreach ($set in $manifest.sets) {
      if ($set.id -notmatch '^[a-z0-9]{1,32}$' -or -not $setIds.Add($set.id)) { return $false }
      $record = $manifest.files[$set.id]
      if (-not $record -or $record.path -cne "cards/$($set.id).json" -or $record.sha256 -notmatch '^[a-f0-9]{64}$' -or $record.bytes -lt 2 -or $record.bytes -gt $maxCardFileBytes) { return $false }
      $cardPath = Assert-CataloguePath (Join-Path $catalogueRoot $record.path)
      $file = Get-Item -LiteralPath $cardPath
      if ($file.PSIsContainer -or $file.Length -ne $record.bytes) { return $false }
      $totalBytes += $file.Length
      if ($totalBytes -gt $maxCatalogueBytes -or (Get-FileHash -LiteralPath $cardPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $record.sha256) { return $false }
      $json = [IO.File]::ReadAllText($cardPath, $utf8)
      if (-not $json.TrimStart().StartsWith('[')) { return $false }
      $cards = @($json | ConvertFrom-Json)
      $count = Get-CardCount $cards $set.id
      if ($count -ne $set.total -or $count -ne $record.cardCount) { return $false }
    }
    return $true
  } catch { return $false }
}

$null = Assert-CataloguePath $buildRoot
if (-not (Test-Path -LiteralPath $buildRoot)) { New-Item -ItemType Directory -Path $buildRoot | Out-Null }
if (Test-InstalledCatalogue) {
  Write-Host "Local catalogue verified: $expectedSetCount sets, revision $catalogueRevision (offline)."
  return
}

$stageRoot = Assert-CataloguePath (Join-Path $buildRoot ('catalogue-install-' + [Guid]::NewGuid().ToString('N')))
New-Item -ItemType Directory -Path $stageRoot | Out-Null
$archivePath = Join-Path $stageRoot 'source.zip'
$client = [Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromMinutes(3)
$downloadTimeout = [Threading.CancellationTokenSource]::new([TimeSpan]::FromMinutes(3))
$client.DefaultRequestHeaders.UserAgent.ParseAdd('PokemonCardLens-LocalCatalogue/1.0')
try {
  Write-Host 'Installing the pinned public Pokemon card catalogue...'
  $source = "https://codeload.github.com/PokemonTCG/pokemon-tcg-data/zip/$catalogueRevision"
  $response = $client.GetAsync($source, [Net.Http.HttpCompletionOption]::ResponseHeadersRead, $downloadTimeout.Token).GetAwaiter().GetResult()
  try {
    $response.EnsureSuccessStatusCode() | Out-Null
    if ($response.Content.Headers.ContentLength -gt $maxArchiveBytes) { throw 'Catalogue archive is too large.' }
    $inputStream = $response.Content.ReadAsStreamAsync($downloadTimeout.Token).GetAwaiter().GetResult()
    $outputStream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
      $buffer = [byte[]]::new(65536)
      [long]$downloaded = 0
      while (($read = $inputStream.ReadAsync($buffer, 0, $buffer.Length, $downloadTimeout.Token).GetAwaiter().GetResult()) -gt 0) {
        $downloaded += $read
        if ($downloaded -gt $maxArchiveBytes) { throw 'Catalogue archive exceeded its size limit.' }
        $outputStream.Write($buffer, 0, $read)
      }
    } finally { $outputStream.Dispose(); $inputStream.Dispose() }
  } finally { $response.Dispose() }

  $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    if ($archive.Entries.Count -gt 20000) { throw 'Unexpected catalogue archive entry count.' }
    $prefix = "pokemon-tcg-data-$catalogueRevision/"
    function Read-CatalogueEntry([string]$Name, [long]$Limit) {
      $matches = @($archive.Entries | Where-Object { $_.FullName -ceq ($prefix + $Name) })
      if ($matches.Count -ne 1) { throw "Missing or duplicate source file: $Name" }
      $entry = $matches[0]
      $unixType = ($entry.ExternalAttributes -shr 16) -band 0xf000
      if ($unixType -notin @(0, 0x8000) -or $entry.Length -lt 2 -or $entry.Length -gt $Limit) { throw 'Unsafe catalogue archive entry.' }
      $stream = $entry.Open()
      $memory = [IO.MemoryStream]::new()
      try {
        $buffer = [byte[]]::new(65536)
        while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
          if ($memory.Length + $read -gt $Limit) { throw 'Catalogue file exceeded its size limit.' }
          $memory.Write($buffer, 0, $read)
        }
        if ($memory.Length -ne $entry.Length) { throw 'Incomplete catalogue archive entry.' }
        return ,$memory.ToArray()
      } finally { $stream.Dispose(); $memory.Dispose() }
    }
    $setsBytes = Read-CatalogueEntry 'sets/en.json' 1MB
    $sets = @($utf8.GetString($setsBytes) | ConvertFrom-Json -AsHashtable)
    if ($sets.Count -ne $expectedSetCount) { throw 'Unexpected number of catalogue sets.' }
    $sourceCards = @($archive.Entries | Where-Object { $_.FullName -cmatch ('^' + [regex]::Escape($prefix) + 'cards/en/[a-z0-9]+\.json$') })
    if ($sourceCards.Count -ne $expectedSetCount) { throw 'Unexpected number of English card files.' }
    New-Item -ItemType Directory -Path (Join-Path $stageRoot 'cards') | Out-Null
    $setIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $files = [ordered]@{}
    [long]$totalBytes = 0
    foreach ($set in $sets) {
      if ($set.id -notmatch '^[a-z0-9]{1,32}$' -or -not $setIds.Add($set.id)) { throw 'Invalid or duplicate catalogue set ID.' }
      $bytes = Read-CatalogueEntry "cards/en/$($set.id).json" $maxCardFileBytes
      $totalBytes += $bytes.Length
      if ($totalBytes -gt $maxCatalogueBytes) { throw 'Catalogue exceeded its size limit.' }
      $json = $utf8.GetString($bytes)
      if (-not $json.TrimStart().StartsWith('[')) { throw 'Card file must contain an array.' }
      $cards = @($json | ConvertFrom-Json)
      $set.total = Get-CardCount $cards $set.id
      $relativePath = "cards/$($set.id).json"
      $filePath = Assert-CataloguePath (Join-Path $stageRoot $relativePath)
      [IO.File]::WriteAllBytes($filePath, $bytes)
      $files[$set.id] = [ordered]@{ path = $relativePath; bytes = $bytes.Length; sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant(); cardCount = $set.total }
    }
    $manifest = [ordered]@{ schemaVersion = 1; revision = $catalogueRevision; updatedAt = $catalogueUpdatedAt; source = $source; sets = $sets; files = $files }
    [IO.File]::WriteAllText((Join-Path $stageRoot 'index.json'), ($manifest | ConvertTo-Json -Depth 30), [Text.UTF8Encoding]::new($false))
  } finally { $archive.Dispose() }
  Remove-Item -LiteralPath (Assert-CataloguePath $archivePath) -Force
  Remove-CatalogueDirectory $catalogueRoot
  $null = Assert-CataloguePath $stageRoot
  $null = Assert-CataloguePath $catalogueRoot
  Move-Item -LiteralPath $stageRoot -Destination $catalogueRoot
  Write-Host "Local catalogue installed: $expectedSetCount sets, $totalBytes bytes, revision $catalogueRevision."
} finally {
  $downloadTimeout.Dispose()
  $client.Dispose()
  if (Test-Path -LiteralPath $stageRoot) { Remove-CatalogueDirectory $stageRoot }
}
