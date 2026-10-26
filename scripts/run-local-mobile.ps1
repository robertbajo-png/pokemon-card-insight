param(
  [ValidateSet('Start','Stop','Suspend','Resume','Status','Verify')][string]$Action='Status',
  [string]$AllowedMail
)
. (Join-Path $PSScriptRoot 'local-windows-common.ps1')
Assert-PokemonEngine
$name='pokemon-local-mobile-tunnel'
$image='cloudflare/cloudflared@sha256:faa8e0a1475f137c910be6025f43c8e4092fdd35461b31e19fd1390657a1ff39'
$settingsFile=Join-Path $script:PokemonState 'mobile-settings.json'
$originFile=Join-Path $script:PokemonState 'mobile-origin.txt'
$statusFile=Join-Path $script:PokemonState 'mobile-status.json'
foreach($file in @($settingsFile,$originFile,$statusFile)) {
  if((Test-Path -LiteralPath $file) -and ((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::ReparsePoint)) {throw 'Redirected mobile state refused.'}
}
$saved=if(Test-Path -LiteralPath $settingsFile){Get-Content -LiteralPath $settingsFile | ConvertFrom-Json}else{$null}
function Test-ExactMail([string[]]$Mail) {
  if($Mail.Count -lt 1 -or $Mail.Count -gt 2) {throw 'Specify one or two exact approved email addresses.'}
  foreach($address in $Mail){if($address -notmatch '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'){throw 'Wildcards and invalid email addresses are refused.'}}
}
function Read-MobileTunnel {
  $id=(Invoke-PokemonDocker -Arguments @('ps','--all','--filter',"name=^/$name$",'--format','{{.ID}}')).Trim()
  if(-not $id){return $null}
  $container=@(Invoke-PokemonDocker -Arguments @('inspect',$id) | ConvertFrom-Json)[0]
  $mail=@()
  for($i=0;$i -lt $container.Config.Cmd.Count;$i++){
    if($container.Config.Cmd[$i] -eq '--allowed-mail'){
      if($i+1 -ge $container.Config.Cmd.Count){throw 'Incomplete email access gate.'}
      $mail += $container.Config.Cmd[$i+1]
    }
  }
  Test-ExactMail $mail
  if($container.Config.Labels.'pokemon.scope' -ne 'local-mobile' -or
     $container.Config.Labels.'pokemon.project' -ne 'pokemon-local' -or
     $container.Config.Image -ne $image -or
     $container.HostConfig.NetworkMode -ne 'pokemon-local-mobile' -or
     -not $container.HostConfig.ReadonlyRootfs -or
     @($container.Mounts).Count -ne 0 -or
     $container.HostConfig.PublishAllPorts -or
     @($container.HostConfig.PortBindings.PSObject.Properties).Count -ne 0 -or
     $container.Config.Cmd -notcontains 'http://pokemon-local-web-1:8080' -or
     $container.Config.Cmd -notcontains '--http-host-header' -or
     $container.Config.Cmd -notcontains 'web') {throw 'Unrelated or unprotected tunnel refused.'}
  return @{container=$container;mail=$mail}
}
function Save-MobileSettings([bool]$Enabled,[string[]]$Mail){
  @{enabled=$Enabled;allowedMail=@($Mail);temporary=$true} | ConvertTo-Json | Set-Content -LiteralPath $settingsFile -Encoding utf8
}
$entry=Read-MobileTunnel
if($Action -in @('Stop','Suspend')){
  if($entry -and $entry.container.State.Running){Invoke-PokemonDocker -Arguments @('stop',$entry.container.Id) | Out-Null}
  if($Action -eq 'Stop'){
    Save-MobileSettings $false @($saved.allowedMail)
    'http://127.0.0.1:5220' | Set-Content -LiteralPath $originFile -Encoding utf8
    Sync-PokemonAuthOrigin
  }
  Write-Host 'Only the Pokemon mobile tunnel was stopped.'
  return
}
if($Action -eq 'Resume' -and (-not $saved -or -not $saved.enabled)){return}
if($Action -in @('Status','Verify') -and (-not $entry -or -not $entry.container.State.Running)){
  Write-Host 'Pokemon mobile access is not running.'
  if($Action -eq 'Verify'){throw 'Mobile access has not been enabled.'}
  return
}
if($Action -in @('Start','Resume')){
  Test-PokemonHosting
  $mail=if($AllowedMail){@($AllowedMail.Split(',') | ForEach-Object {$_.Trim().ToLowerInvariant()} | Sort-Object -Unique)}else{@($saved.allowedMail)}
  Test-ExactMail $mail
  if($entry -and @(Compare-Object @($entry.mail | Sort-Object) @($mail | Sort-Object)).Count){
    if($Action -eq 'Resume'){throw 'Saved mobile access list does not match its container.'}
    Invoke-PokemonDocker -Arguments @('stop',$entry.container.Id) | Out-Null
    Invoke-PokemonDocker -Arguments @('rm',$entry.container.Id) | Out-Null
    $entry=$null
  }
  if(-not $entry){
    $network=@(Invoke-PokemonDocker -Arguments @('network','inspect','pokemon-local-mobile') | ConvertFrom-Json)[0]
    if($network.Labels.'com.docker.compose.project' -ne 'pokemon-local' -or $network.Labels.'pokemon.scope' -ne 'local-mobile-network'){throw 'Unrelated mobile bridge refused.'}
    $tunnelArguments=@('run','--detach','--name',$name,'--network','pokemon-local-mobile',
      '--label','pokemon.scope=local-mobile','--label','pokemon.project=pokemon-local',
      '--restart','unless-stopped','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','128m','--cpus','0.5','--pids-limit','64','--log-opt','max-size=5m','--log-opt','max-file=2',
      $image,'tunnel','--no-autoupdate','--protocol','http2','--metrics','127.0.0.1:20241',
      '--url','http://pokemon-local-web-1:8080','--http-host-header','web')
    foreach($address in $mail){$tunnelArguments+=@('--allowed-mail',$address)}
    Invoke-PokemonDocker -Arguments $tunnelArguments -Private | Out-Null
  }elseif(-not $entry.container.State.Running){Invoke-PokemonDocker -Arguments @('start',$entry.container.Id) | Out-Null}
}
$handler=[Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect=$false; $handler.UseProxy=$false
$client=[Net.Http.HttpClient]::new($handler); $client.Timeout=[TimeSpan]::FromSeconds(10)
$verified=$false
try{
  $deadline=[DateTime]::UtcNow.AddSeconds(120)
  do{
    $entry=Read-MobileTunnel
    if(-not $entry -or -not $entry.container.State.Running){throw 'Pokemon mobile tunnel exited.'}
    $startedAt=$entry.container.State.StartedAt
    $since=if($startedAt -is [DateTime]){$startedAt.ToUniversalTime().ToString('o')}else{[string]$startedAt}
    $logs=Invoke-PokemonDocker -Arguments @('logs','--since',$since,$entry.container.Id) -CombinedOutput -Private
    $urls=@([regex]::Matches($logs,'https://[a-z0-9-]+\.trycloudflare\.com') | Where-Object {$_.Value -ne 'https://login.trycloudflare.com'})
    if($urls.Count){
      $url=$urls[$urls.Count-1].Value
      try{
        $verified=$true
        foreach($path in @('/mobile-access','/scanner','/backend/auth/v1/health','/backend/rest/v1/collection_cards?select=id','/backend/functions/v1/_health')){
          $response=$client.GetAsync($url+$path).GetAwaiter().GetResult()
          try{
            $location=$response.Headers.Location
            if([int]$response.StatusCode -eq 200){throw 'Unprotected mobile access refused.'}
            if([int]$response.StatusCode -notin @(302,303,307) -or -not $location -or -not $location.IsAbsoluteUri -or $location.Host -ne 'login.trycloudflare.com' -or $location.AbsolutePath -ne '/authorize'){$verified=$false;break}
          }finally{$response.Dispose()}
        }
      }catch{if($_.Exception.Message -eq 'Unprotected mobile access refused.'){throw};$verified=$false}
    }
    if($verified){break}
    Start-Sleep -Seconds 3
  }while([DateTime]::UtcNow -lt $deadline)
  if(-not $verified){throw 'Could not verify the mobile email access gate.'}
  if($Action -in @('Start','Resume')){
    $url | Set-Content -LiteralPath $originFile -Encoding utf8
    Sync-PokemonAuthOrigin
    Test-PokemonHosting
    Save-MobileSettings $true @($entry.mail)
  }
  @{url=$url;checkedAt=[DateTime]::UtcNow.ToString('o');emailProtected=$true;temporary=$true;allowedAccountCount=@($entry.mail).Count} | ConvertTo-Json | Set-Content -LiteralPath $statusFile -Encoding utf8
  Write-Host "Email-protected Pokemon mobile URL: $url/mobile-access"
  Write-Host 'The computer must be running. This temporary address changes when its tunnel restarts.'
}catch{
  if($Action -in @('Start','Resume') -or $_.Exception.Message -eq 'Unprotected mobile access refused.'){
    if($entry){Invoke-PokemonDocker -Arguments @('stop',$entry.container.Id) -Private | Out-Null}
    Save-MobileSettings $false @($entry.mail)
    'http://127.0.0.1:5220' | Set-Content -LiteralPath $originFile -Encoding utf8
    try{Sync-PokemonAuthOrigin}catch{Write-Host 'Mobile access stopped; local Auth origin requires verification.'}
  }
  throw
}finally{$client.Dispose();$handler.Dispose()}
