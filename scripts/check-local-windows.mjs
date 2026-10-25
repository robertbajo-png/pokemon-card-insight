import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
input = "";
const base = "http://127.0.0.1:5220/backend";
const created = [];
const checks = [];
const mailIds = [];
async function request(
  path,
  { token, method = "GET", body, statuses = [200] } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(45000),
    headers: {
      apikey: config.POKEMON_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  assert(
    statuses.includes(response.status),
    `${method} ${path.split("?")[0]}: unexpected HTTP ${response.status}`,
  );
  return data;
}
async function createUser() {
  const email = `pokemon-qa-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("hex")}Aa!`;
  const account = await request("/auth/v1/admin/users", {
    token: config.POKEMON_SERVICE_KEY,
    method: "POST",
    body: { email, password, email_confirm: true },
  });
  created.push(account.id);
  const login = () =>
    request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password },
    });
  return { id: account.id, login };
}
let failure;
try {
  const email = `pokemon-email-qa-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("hex")}Aa!`;
  const signup = await request("/auth/v1/signup", {
    method: "POST",
    body: { email, password },
    statuses: [200, 201],
  });
  const signupId = signup.id ?? signup.user?.id;
  assert(signupId, "Local signup did not create a fixture account");
  created.push(signupId);
  let message;
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch("http://127.0.0.1:5225/api/v1/messages", {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    assert.equal(response.status, 200, "Local email inbox unavailable");
    const mailbox = await response.json();
    message = mailbox.messages?.find((item) =>
      item.To?.some((recipient) => recipient.Address === email),
    );
    if (message) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(message?.ID, "Confirmation email did not arrive locally");
  mailIds.push(message.ID);
  const mail = await fetch(
    `http://127.0.0.1:5225/api/v1/message/${encodeURIComponent(message.ID)}`,
    { redirect: "error" },
  ).then((r) => r.json());
  const link = mail.HTML?.match(/href="([^"]+)"/i)?.[1]?.replaceAll(
    "&amp;",
    "&",
  );
  const verify = new URL(link);
  assert.equal(
    verify.origin,
    "http://127.0.0.1:5220",
    "Confirmation must stay on the local app",
  );
  assert.equal(verify.pathname, "/backend/auth/v1/verify");
  const confirmed = await fetch(verify, {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(confirmed.status, 303, "Email confirmation failed");
  const confirmedLogin = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  assert(confirmedLogin.access_token, "Confirmed account cannot sign in");
  checks.push("Public signup, local confirmation email and password sign-in");
  const a = await createUser(),
    b = await createUser();
  const a1 = await a.login(),
    a2 = await a.login(),
    b1 = await b.login();
  assert(a1.access_token && a2.access_token && b1.access_token);
  checks.push("Independent real Auth sessions");
  const id = `qa-${randomUUID()}`;
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwX8AAAAASUVORK5CYII=";
  const card = {
    id,
    name: "Local hosting QA",
    number: "58",
    set: "Base Set",
    scannedAt: new Date().toISOString(),
    quantity: 2,
    image,
    location: "Local QA",
    notes: "",
  };
  const firstMutation = randomUUID();
  const write = (token, value, revision, mutation, deleted = false) =>
    request("/rest/v1/rpc/write_collection_card", {
      token,
      method: "POST",
      body: {
        p_id: id,
        p_card: value,
        p_expected_revision: revision,
        p_deleted: deleted,
        p_mutation_id: mutation,
      },
    });
  const read = (token) =>
    request(
      `/rest/v1/collection_cards?id=eq.${id}&select=id,card,revision,deleted`,
      { token },
    );
  const inserted = await write(a1.access_token, card, 0, firstMutation);
  assert.equal(inserted[0].revision, 1);
  const remote = await read(a2.access_token);
  assert.equal(remote[0].card.image, image);
  assert.equal(remote[0].card.quantity, 2);
  assert.deepEqual(await read(b1.access_token), []);
  await request("/rest/v1/collection_cards?select=id", {
    statuses: [401, 403],
  });
  await request("/rest/v1/collection_cards", {
    token: a1.access_token,
    method: "POST",
    body: { ...inserted[0], id: `forbidden-${id}` },
    statuses: [401, 403],
  });
  checks.push(
    "Photo/quantity sync, owner isolation, anonymous and direct-write rejection",
  );
  const nextCard = { ...card, quantity: 3, notes: "Changed in session 2" },
    mutation = randomUUID();
  await write(a2.access_token, nextCard, 1, mutation);
  const retried = await write(a2.access_token, nextCard, 1, mutation);
  assert.equal(retried[0].revision, 2);
  const conflict = await request("/rest/v1/rpc/write_collection_card", {
    token: a1.access_token,
    method: "POST",
    body: {
      p_id: id,
      p_card: card,
      p_expected_revision: 1,
      p_deleted: false,
      p_mutation_id: randomUUID(),
    },
    statuses: [400, 409],
  });
  assert.equal(conflict.message, "COLLECTION_CONFLICT");
  checks.push("Idempotent retry and stale-revision conflict");
  if (config.restart) {
    const restart = spawnSync(
      config.pwsh,
      [
        "-NoProfile",
        "-NonInteractive",
        "-File",
        config.launcher,
        "-Action",
        "Restart",
      ],
      { windowsHide: true, encoding: "utf8", timeout: 240000 },
    );
    assert.equal(restart.status, 0, "Local service restart failed");
    const persisted = await read(a2.access_token);
    assert.equal(persisted[0].revision, 2);
    assert.equal(persisted[0].card.notes, "Changed in session 2");
    checks.push(
      "Database and session persistence after restarting all six services",
    );
  }
  await write(a2.access_token, nextCard, 2, randomUUID(), true);
  assert.equal((await read(a1.access_token))[0].deleted, true);
  checks.push("Versioned deletion visible in the other session");
  await request("/functions/v1/analyze-pokemon-card", {
    method: "POST",
    body: { action: "analyze", image },
    statuses: [401],
  });
  const unconfigured = await request("/functions/v1/analyze-pokemon-card", {
    token: a1.access_token,
    method: "POST",
    body: { action: "analyze", image },
    statuses: [503],
  });
  assert.match(unconfigured.error, /inte konfigurerad/);
  checks.push(
    "AI rejects anonymous access and fails closed without a provider key",
  );
} catch (error) {
  failure = error.message;
} finally {
  if (mailIds.length) {
    try {
      const removed = await fetch("http://127.0.0.1:5225/api/v1/messages", {
        method: "DELETE",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IDs: mailIds }),
      });
      assert(removed.ok);
    } catch {
      failure = `${failure ?? ""} Test email cleanup failed.`;
    }
  }
  for (const id of created) {
    try {
      await request(`/auth/v1/admin/users/${id}`, {
        token: config.POKEMON_SERVICE_KEY,
        method: "DELETE",
      });
    } catch {
      failure = `${failure ?? ""} Fixture cleanup failed.`;
    }
  }
}
console.log(
  JSON.stringify(
    {
      passed: !failure,
      checks,
      fixtureUsersRemoved: created.length,
      ...(failure ? { failure } : {}),
    },
    null,
    2,
  ),
);
config.POKEMON_SERVICE_KEY = "";
if (failure) process.exitCode = 1;
