import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimit } from "../lib/phase3/rate-limit";
import { getRequestId, withRequestId } from "../lib/phase3/observability";

test("rate limiter blocks requests above threshold within window", () => {
  const key = `phase3-test-${Date.now()}`;
  const first = checkRateLimit("unit", key, 2, 60_000);
  const second = checkRateLimit("unit", key, 2, 60_000);
  const third = checkRateLimit("unit", key, 2, 60_000);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds > 0);
});

test("request id helper preserves inbound header when provided", () => {
  const request = new Request("http://localhost/test", {
    headers: {
      "x-request-id": "phase3-request-id",
    },
  });

  const requestId = getRequestId(request);
  assert.equal(requestId, "phase3-request-id");
});

test("response helper attaches request id header", () => {
  const response = withRequestId(new Response("ok"), "phase3-response-id");
  assert.equal(response.headers.get("x-request-id"), "phase3-response-id");
});
