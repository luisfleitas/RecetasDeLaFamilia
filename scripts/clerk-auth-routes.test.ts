import assert from "node:assert/strict";
import { test } from "node:test";
import { buildClerkAuthRedirectPath } from "../lib/auth/stable-auth-routes";

test("Clerk auth redirects preserve a safe relative next path", () => {
  assert.equal(
    buildClerkAuthRedirectPath("/sign-in", { next: "/recipes/1?tab=details" }),
    "/sign-in?redirect_url=%2Frecipes%2F1%3Ftab%3Ddetails",
  );
});

test("Clerk auth redirects reject unsafe next paths", () => {
  assert.equal(
    buildClerkAuthRedirectPath("/sign-up", { next: "https://evil.test/phish" }),
    "/sign-up",
  );
  assert.equal(buildClerkAuthRedirectPath("/sign-up", { next: "//evil.test" }), "/sign-up");
});
