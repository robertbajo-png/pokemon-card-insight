#requires -Version 7.2
[CmdletBinding()]
param(
  [ValidateSet('Debug', 'Release')][string]$Configuration = 'Debug',
  [string]$JavaHome,
  [string]$AndroidSdk
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'The Android APK builder requires Windows and PowerShell 7.2 or later.' }

$appId = 'com.robertbajo.cardlens'
$appVersion = '0.1.0-preview.1'
$keyAlias = 'cardlens-release'
$nodeCommand = Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1
$nodePath = $nodeCommand.Source

# Resolve existing ancestors, including junctions, before creating a new path.
# This also refuses redirected OneDrive roots whose folder has another name.
$resolvePathScript = @'
const fs = require('node:fs');
const path = require('node:path');
function resolveProspective(value) {
  let current = path.resolve(value);
  const missing = [];
  while (true) {
    try { fs.lstatSync(current); break; }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw new Error('No existing path ancestor');
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
  return path.resolve(fs.realpathSync.native(current), ...missing);
}
function inside(value, root) {
  const relative = path.relative(root, value);
  return !relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
try {
  const original = path.resolve(process.argv[1]);
  const resolved = resolveProspective(original);
  const oneDriveSegment = /(?:^|[\\/])OneDrive[^\\/]*(?:[\\/]|$)/i;
  if (oneDriveSegment.test(original) || oneDriveSegment.test(resolved)) throw new Error('OneDrive is not a build or signing destination');
  for (const name of ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial']) {
    if (!process.env[name]) continue;
    const logicalRoot = path.resolve(process.env[name]);
    const realRoot = resolveProspective(logicalRoot);
    if (inside(original, logicalRoot) || inside(resolved, realRoot)) throw new Error('OneDrive destination refused');
  }
  console.log(resolved);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
'@

function Resolve-SafePath([string]$LiteralPath) {
  $result = & $nodePath -e $resolvePathScript $LiteralPath
  if ($LASTEXITCODE -ne 0 -or -not $result) { throw "Unsafe or unresolved path: $LiteralPath" }
  return [IO.Path]::GetFullPath(($result -join "`n").Trim())
}

function Assert-Within([string]$Candidate, [string]$Root) {
  $prefix = $Root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if ($Candidate -ne $Root -and -not $Candidate.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Path escaped its approved directory: $Candidate"
  }
}

function Get-SafeChild([string]$Root, [string]$RelativePath) {
  $candidate = Resolve-SafePath (Join-Path $Root $RelativePath)
  Assert-Within $candidate $Root
  return $candidate
}

function New-SafeDirectory([string]$Root, [string]$RelativePath) {
  $candidate = Get-SafeChild $Root $RelativePath
  [IO.Directory]::CreateDirectory($candidate) | Out-Null
  $resolved = Resolve-SafePath $candidate
  Assert-Within $resolved $Root
  return $resolved
}

function Set-PrivateDirectoryAcl([string]$LiteralPath) {
  $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($identity in @($owner, $system)) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
      $identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
  }
  [IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($LiteralPath), $acl)
}

function Set-PrivateFileAcl([string]$LiteralPath) {
  $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
  $acl = [Security.AccessControl.FileSecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($identity in @($owner, $system)) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'Allow'))
  }
  [IO.FileSystemAclExtensions]::SetAccessControl([IO.FileInfo]::new($LiteralPath), $acl)
}

function Assert-OutsideGit([string]$LiteralPath) {
  $current = $LiteralPath
  while ($current) {
    if (Test-Path -LiteralPath (Join-Path $current '.git')) { throw 'Signing material must be outside every Git checkout.' }
    $parent = [IO.Directory]::GetParent($current)
    $current = if ($parent) { $parent.FullName } else { $null }
  }
}

function Invoke-BuildTool([string]$Executable, [string[]]$ToolArguments) {
  & $Executable @ToolArguments
  if ($LASTEXITCODE -ne 0) { throw "Build command failed with exit code $LASTEXITCODE." }
}

# Passwords are passed only through the child environment. Never echo keytool's
# diagnostic output, command environment, or the decrypted DPAPI value.
function Invoke-PrivateKeytool([string[]]$ToolArguments) {
  $start = [Diagnostics.ProcessStartInfo]::new($keytoolPath)
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardInput = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  foreach ($argument in $ToolArguments) { $start.ArgumentList.Add($argument) }
  $process = [Diagnostics.Process]::Start($start)
  try {
    $process.StandardInput.Close()
    $output = $process.StandardOutput.ReadToEndAsync()
    $errors = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(60000)) {
      $process.Kill($true)
      throw 'Keytool timed out; existing signing material has been retained.'
    }
    $text = $output.GetAwaiter().GetResult()
    $null = $errors.GetAwaiter().GetResult()
    if ($process.ExitCode -ne 0) { throw "Keytool failed with exit code $($process.ExitCode); signing material has been retained." }
    return $text
  } finally { $process.Dispose() }
}

$repository = Resolve-SafePath (Join-Path $PSScriptRoot '..')
$gitExecutable = (Get-Command git -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$sourceCommit = & $gitExecutable -C $repository rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $sourceCommit -notmatch '^[0-9a-f]{40,64}$') { throw 'Could not identify the source commit.' }
$sourceStatus = @(& $gitExecutable --no-optional-locks -C $repository status --porcelain=v1)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the source worktree status.' }
$sourceDirty = $sourceStatus.Count -gt 0
$sourceStatus = $null
$localData = Resolve-SafePath ([Environment]::GetFolderPath('LocalApplicationData'))
$statePath = Get-SafeChild $localData 'CardLensAndroid'
Assert-OutsideGit $statePath

if (-not $JavaHome) {
  $studioJbr = Join-Path ${env:ProgramFiles} 'Android/Android Studio/jbr'
  $JavaHome = if (Test-Path -LiteralPath $studioJbr -PathType Container) { $studioJbr } else { $env:JAVA_HOME }
}
if (-not $JavaHome) { throw 'Specify -JavaHome pointing to JDK 21.' }
$jdk = Resolve-SafePath $JavaHome
$javaPath = Get-SafeChild $jdk 'bin/java.exe'
$keytoolPath = Get-SafeChild $jdk 'bin/keytool.exe'
$jdkRelease = Get-SafeChild $jdk 'release'
if (-not (Test-Path -LiteralPath $javaPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $keytoolPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $jdkRelease -PathType Leaf) -or
    [IO.File]::ReadAllText($jdkRelease) -notmatch '(?m)^JAVA_VERSION="21(?:\.|\+|")') {
  throw 'A complete JDK 21 installation is required.'
}
if (-not $AndroidSdk) {
  $AndroidSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $localData 'Android/Sdk' }
}
$sdk = Resolve-SafePath $AndroidSdk
if (-not (Test-Path -LiteralPath (Get-SafeChild $sdk 'platforms/android-36/android.jar') -PathType Leaf)) {
  throw 'Android SDK platform 36 must already be installed.'
}

$modules = Get-SafeChild $repository 'node_modules'
if (-not (Test-Path -LiteralPath $modules -PathType Container)) { throw 'Install this checkout''s own dependencies before building.' }
$capacitorCli = Get-SafeChild $repository 'node_modules/@capacitor/cli/bin/capacitor'
$androidDirectory = Get-SafeChild $repository 'android'
$gradle = Get-SafeChild $repository 'android/gradlew.bat'
if (-not (Test-Path -LiteralPath $capacitorCli -PathType Leaf) -or -not (Test-Path -LiteralPath $gradle -PathType Leaf)) {
  throw 'The local Capacitor CLI and Android project must be prepared before building.'
}
foreach ($destination in @('dist-android', 'artifacts', 'artifacts/android', 'android/.gradle', 'android/build',
    'android/app/build', 'android/app/src/main/assets', 'android/app/src/main/assets/public',
    'android/app/src/main/assets/capacitor.config.json', 'android/app/src/main/assets/capacitor.plugins.json',
    'android/capacitor-cordova-android-plugins', 'android/capacitor.settings.gradle', 'android/app/capacitor.build.gradle')) {
  $null = Get-SafeChild $repository $destination
}

if ($env:npm_execpath) {
  $npmEntry = Resolve-SafePath $env:npm_execpath
  if (-not (Test-Path -LiteralPath $npmEntry -PathType Leaf)) { throw 'npm_execpath does not identify the current npm CLI.' }
  $npmExecutable = $nodePath
  $npmArguments = @($npmEntry, 'run', 'build:android')
} else {
  $npmExecutable = (Get-Command npm.cmd -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
  $npmArguments = @('run', 'build:android')
}

$state = New-SafeDirectory $localData 'CardLensAndroid'
Set-PrivateDirectoryAcl $state
$lockPath = Get-SafeChild $state 'build.lock'
$buildLock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$environmentNames = @('JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'ANDROID_USER_HOME', 'GRADLE_USER_HOME', 'npm_config_cache', 'TEMP', 'TMP', 'PATH')
$savedEnvironment = @{}
foreach ($name in $environmentNames) { $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$plainPassword = $null
$securePassword = $null
$keyCreated = $false
$expectedCertificate = $null
try {
  $gradleHome = New-SafeDirectory $state 'gradle'
  $androidHome = New-SafeDirectory $state 'android-user'
  $npmCache = New-SafeDirectory $state 'npm-cache'
  $temporary = New-SafeDirectory $state 'tmp'
  $environment = @{
    JAVA_HOME = $jdk; ANDROID_HOME = $sdk; ANDROID_SDK_ROOT = $sdk
    ANDROID_USER_HOME = $androidHome; GRADLE_USER_HOME = $gradleHome
    npm_config_cache = $npmCache; TEMP = $temporary; TMP = $temporary
    PATH = (Join-Path $jdk 'bin') + ';' + (Split-Path -Parent $nodePath) + ';' + $savedEnvironment['PATH']
  }
  foreach ($name in $environment.Keys) { [Environment]::SetEnvironmentVariable($name, $environment[$name], 'Process') }
  # Do not leak inherited signing credentials to npm or Capacitor.
  foreach ($name in @('CARDLENS_KEYSTORE_PATH', 'CARDLENS_KEYSTORE_PASSWORD', 'CARDLENS_KEY_ALIAS')) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
  Push-Location -LiteralPath $repository
  try {
    Invoke-BuildTool $npmExecutable $npmArguments
    Invoke-BuildTool $nodePath @($capacitorCli, 'sync', 'android')
    $nativeConfigPath = Get-SafeChild $repository 'android/app/src/main/assets/capacitor.config.json'
    $nativeConfig = [IO.File]::ReadAllText($nativeConfigPath) | ConvertFrom-Json
    if ($nativeConfig.appId -ne $appId) { throw 'The generated Android app ID differs from the permanent Card Lens identity.' }

    if ($Configuration -eq 'Release') {
      $signingCandidate = Get-SafeChild $state 'signing'
      Assert-OutsideGit $signingCandidate
      $signing = New-SafeDirectory $state 'signing'
      Set-PrivateDirectoryAcl $signing
      $keystore = Get-SafeChild $signing 'cardlens-release.p12'
      $passwordFile = Get-SafeChild $signing 'cardlens-release.password.clixml'
      $hasKey = Test-Path -LiteralPath $keystore -PathType Leaf
      $hasPassword = Test-Path -LiteralPath $passwordFile -PathType Leaf
      if ($hasKey -ne $hasPassword) { throw 'Incomplete release signing pair. Restore the original keystore/password pair; no replacement identity will be generated.' }
      if ((Test-Path -LiteralPath $keystore) -and -not $hasKey) { throw 'The release keystore is not a regular file.' }
      if ((Test-Path -LiteralPath $passwordFile) -and -not $hasPassword) { throw 'The protected signing password is not a regular file.' }
      if ($hasKey) {
        Set-PrivateFileAcl $keystore
        Set-PrivateFileAcl $passwordFile
        $securePassword = Import-Clixml -LiteralPath $passwordFile
        if ($securePassword -isnot [Security.SecureString]) { throw 'The signing password file is not a DPAPI-protected SecureString.' }
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        try { $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
      } else {
        $plainPassword = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
        $securePassword = ConvertTo-SecureString -String $plainPassword -AsPlainText -Force
        # Save recovery information first. A failed/interrupted key generation
        # intentionally leaves an incomplete pair and is never silently retried.
        $securePassword | Export-Clixml -LiteralPath $passwordFile
        Set-PrivateFileAcl $passwordFile
        [Environment]::SetEnvironmentVariable('CARDLENS_KEYSTORE_PASSWORD', $plainPassword, 'Process')
        $null = Invoke-PrivateKeytool @('-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', $keystore,
          '-alias', $keyAlias, '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA', '-validity', '10000',
          '-dname', 'CN=Card Lens, OU=Family App', '-storepass:env', 'CARDLENS_KEYSTORE_PASSWORD', '-keypass:env', 'CARDLENS_KEYSTORE_PASSWORD')
        Set-PrivateFileAcl $keystore
        $keyCreated = $true
      }
      [Environment]::SetEnvironmentVariable('CARDLENS_KEYSTORE_PASSWORD', $plainPassword, 'Process')
      $certificateText = Invoke-PrivateKeytool @('-exportcert', '-rfc', '-storetype', 'PKCS12', '-keystore', $keystore,
        '-alias', $keyAlias, '-storepass:env', 'CARDLENS_KEYSTORE_PASSWORD')
      $certificateMatch = [regex]::Match($certificateText, '(?s)-----BEGIN CERTIFICATE-----\s*(.*?)\s*-----END CERTIFICATE-----')
      if (-not $certificateMatch.Success) { throw 'Could not verify the existing release certificate.' }
      $certificateBytes = [Convert]::FromBase64String(($certificateMatch.Groups[1].Value -replace '\s', ''))
      $expectedCertificate = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($certificateBytes)).ToLowerInvariant()
      [Environment]::SetEnvironmentVariable('CARDLENS_KEYSTORE_PATH', $keystore, 'Process')
      [Environment]::SetEnvironmentVariable('CARDLENS_KEY_ALIAS', $keyAlias, 'Process')
    }

    Push-Location -LiteralPath $androidDirectory
    try { Invoke-BuildTool $gradle @('--no-daemon', "assemble$Configuration") }
    finally { Pop-Location }
  } finally { Pop-Location }
  foreach ($name in @('CARDLENS_KEYSTORE_PATH', 'CARDLENS_KEYSTORE_PASSWORD', 'CARDLENS_KEY_ALIAS')) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
  $plainPassword = $null

  $variant = $Configuration.ToLowerInvariant()
  $sourceApk = Get-SafeChild $repository "android/app/build/outputs/apk/$variant/app-$variant.apk"
  if (-not (Test-Path -LiteralPath $sourceApk -PathType Leaf)) { throw 'Gradle did not produce the expected signed APK.' }
  $certificateSha256 = $null
  $signatureVerified = $false
  # Match the pinned Gradle build tools; newer SDKs can change output formats.
  $signerCandidate = Get-SafeChild $sdk 'build-tools/36.0.0/apksigner.bat'
  $signer = if (Test-Path -LiteralPath $signerCandidate -PathType Leaf) { $signerCandidate } else { $null }
  if ($signer) {
    $verification = & $signer verify --print-certs $sourceApk 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    $fingerprint = [regex]::Match(($verification -join "`n"), '(?im)^Signer #1 certificate SHA-256 digest:\s*([0-9a-f:]+)\s*$')
    if (-not $fingerprint.Success) { throw 'APK signature verification did not return its public certificate fingerprint.' }
    $certificateSha256 = $fingerprint.Groups[1].Value.Replace(':', '').ToLowerInvariant()
    if ($expectedCertificate -and $certificateSha256 -ne $expectedCertificate) { throw 'The APK was not signed with the preserved Card Lens release identity.' }
    $signatureVerified = $true
  } elseif ($Configuration -eq 'Release') {
    throw 'apksigner is required for Release; no unverified release artifact will be copied.'
  } else { Write-Warning 'apksigner was not found; APK signature verification was not performed.' }

  $artifactDirectory = New-SafeDirectory $repository 'artifacts/android'
  $artifactName = "cardlens-$appVersion-$variant.apk"
  $artifact = Get-SafeChild $artifactDirectory $artifactName
  $reportPath = Get-SafeChild $artifactDirectory ($artifactName -replace '\.apk$', '.json')
  Copy-Item -LiteralPath $sourceApk -Destination $artifact -Force
  $hash = Get-FileHash -LiteralPath $artifact -Algorithm SHA256
  $report = [ordered]@{
    builtAt = [DateTime]::UtcNow.ToString('o'); appId = $appId; version = $appVersion
    sourceCommit = $sourceCommit; sourceDirty = $sourceDirty
    configuration = $Configuration; artifact = "artifacts/android/$artifactName"
    sha256 = $hash.Hash.ToLowerInvariant(); bytes = (Get-Item -LiteralPath $artifact).Length
    signatureVerified = $signatureVerified; certificateSha256 = $certificateSha256
    releaseSigningKeyCreated = $keyCreated; externalSigningBackupVerified = $false
    physicalPhoneInstallationVerified = $false
  }
  [IO.File]::WriteAllText($reportPath, ($report | ConvertTo-Json -Depth 4) + "`n", [Text.UTF8Encoding]::new($false))
  Write-Host "APK: $artifact"
  Write-Host "Build report: $reportPath"
  if ($Configuration -eq 'Release') {
    Write-Warning 'External release-key backup has not been verified. A portable backup needs the keystore and a separately protected recovery password; the DPAPI file alone is tied to this Windows user. This script does not export the password or distribute the APK to a phone.'
  }
} finally {
  foreach ($name in @('CARDLENS_KEYSTORE_PATH', 'CARDLENS_KEYSTORE_PASSWORD', 'CARDLENS_KEY_ALIAS')) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
  $plainPassword = $null
  if ($securePassword) { $securePassword.Dispose() }
  foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process') }
  $buildLock.Dispose()
}
