import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "alice", password: "Password123!" }),
    redirect: "manual",
  });

  assert.equal(response.status, 200, "Alice login should succeed before checking authenticated recipe pages.");

  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie, "Alice login should return an auth cookie.");
  return cookie
    .split(",")
    .map((part) => part.split(";")[0])
    .join("; ");
}

async function assertWorkspaceFrame(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie },
  });

  assert.equal(response.status, 200, `${path} should render for authenticated Alice.`);
  const html = await response.text();

  assert.match(html, /id="recipe-workspace-frame"/, `${path} should render the shared recipe workspace frame.`);
  assert.match(html, /id="recipe-workspace-top-header"/, `${path} should render the shared recipe workspace top bar.`);
  assert.match(html, /id="home-left-navigation"/, `${path} should render the refreshed left navigation.`);
}

const cookie = await login();

for (const path of ["/recipes/add", "/recipes/new", "/recipes/import", "/recipes/42", "/recipes/42/edit"]) {
  await assertWorkspaceFrame(path, cookie);
}
