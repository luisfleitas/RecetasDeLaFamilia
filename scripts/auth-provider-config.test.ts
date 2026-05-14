import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAuthProviderName } from "../lib/auth/provider-config";

test("auth provider defaults to local", () => {
  assert.equal(resolveAuthProviderName({}), "local");
});

test("auth provider accepts local and clerk", () => {
  assert.equal(resolveAuthProviderName({ AUTH_PROVIDER: "local" }), "local");
  assert.equal(resolveAuthProviderName({ AUTH_PROVIDER: "clerk" }), "clerk");
});

test("auth provider rejects unsupported values clearly", () => {
  assert.throws(
    () => resolveAuthProviderName({ AUTH_PROVIDER: "oauth" }),
    /Unsupported AUTH_PROVIDER: oauth/,
  );
});
