# Mobile camera access

The Windows app can optionally use an email-protected HTTPS Quick Tunnel, using
the same Cloudflare mechanism as WineSnap's local test installation. The owner
must explicitly choose the allowed email addresses. There is no public/anonymous
tunnel mode, domain wildcard or automatic invitation/email send.

The host computer and Docker must be running. This is a temporary family-use
address: it changes when its tunnel process restarts and has no production
uptime guarantee. A stable hostname requires a separately configured named tunnel
and owned domain. The old Lovable and Sites deployments are not changed.

## Enable after choosing the approved email addresses

From the source checkout in PowerShell 7:

```powershell
./scripts/run-local-windows.ps1 -Action Start
./scripts/run-local-mobile.ps1 -Action Start -AllowedMail 'owner@example.com,child@example.com'
./scripts/run-local-mobile.ps1 -Action Status
./scripts/run-local-mobile.ps1 -Action Verify
./scripts/run-local-mobile.ps1 -Action Stop
```

Use the actual approved addresses, not the examples. Cloudflare receives the
allowlist to require an email one-time PIN. Visitors then sign into their own
existing app accounts. App-account confirmation mail remains in the private
inbox on the host computer; it is not exposed through the mobile tunnel.

Open the printed `/mobile-access` URL in Safari or Chrome on the phone, enter
the email PIN, sign into the app, and choose the camera. Allow camera permission
on that phone. The camera prefers the rear lens, requests no microphone, and
supports direct photo selection/capture if live camera access is unavailable.
Physical iPhone/Android camera acceptance requires testing on the actual device;
a desktop viewport or mocked media stream is not that verification.

After enabling mobile access, reinstall the startup helper. It resumes the six
local services and the opted-in tunnel after Windows sign-in, updates the current
public address and reconciles Auth callback origins. The private status is at
`%LOCALAPPDATA%/PokemonCardHosting/mobile-status.json`. `Stop` disables mobile
autostart; stopping the whole app merely suspends the opted-in tunnel.

## Scope and verification

- Only a labelled, pinned Cloudflare tunnel container is operated by the helper.
  It publishes no ports and mounts no host folders, Docker socket or credentials.
- Its separate network reaches the frontend proxy. Database/Auth/function/mail
  services remain on the backend network. The mail inbox stays loopback-only.
- Start/resume verifies that scanner, Auth, REST and function paths redirect
  unauthenticated requests to Cloudflare's email gate. Unverifiable startup is
  stopped. This does not claim an authenticated browser or physical phone test.
- The local client uses its current page origin for `/backend`; a phone never
  attempts to reach its own `127.0.0.1`. Hosted Supabase configuration is preserved.
- Auth callback/confirmation URLs track the verified tunnel origin and retain
  localhost as an allowed redirect. Root JWTs, accounts, data and provider keys
  are not regenerated or changed. The OpenAI key stays in the function container.
- `/mobile-access` and `/backend` are excluded from the offline navigation
  fallback. A home-screen launch can therefore reach the email gate again.
  Cached collection data remains tied to its browser origin; account sync is
  important because a new temporary hostname is a different origin.

References: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/),
[camera secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
