import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logoutButtonSource = readFileSync(new URL("../app/_components/logout-button.tsx", import.meta.url), "utf8");

test("global logout button validates the logout response before redirecting", () => {
  assert.match(logoutButtonSource, /response\s*=\s*await fetch\("\/api\/auth\/logout"/);
  assert.match(logoutButtonSource, /if\s*\(\s*!response\.ok\s*\)/);
});

test("global logout button sends the browser to the login page after logout", () => {
  assert.match(logoutButtonSource, /router\.replace\("\/login"\)/);
  assert.match(logoutButtonSource, /router\.refresh\(\)/);
});
