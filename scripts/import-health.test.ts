import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeHealthStatus } from "../lib/application/recipes/import-health";

test("summarizeHealthStatus returns disabled when feature is disabled", () => {
  const status = summarizeHealthStatus([{ status: "ok" }], false);
  assert.equal(status, "disabled");
});

test("summarizeHealthStatus returns ok when all checks pass and feature enabled", () => {
  const status = summarizeHealthStatus(
    [{ status: "ok" }, { status: "ok" }, { status: "ok" }],
    true,
  );
  assert.equal(status, "ok");
});

test("summarizeHealthStatus returns degraded when any check fails and feature enabled", () => {
  const status = summarizeHealthStatus(
    [{ status: "ok" }, { status: "missing" }, { status: "ok" }],
    true,
  );
  assert.equal(status, "degraded");
});
