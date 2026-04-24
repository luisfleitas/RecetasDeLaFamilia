import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTH_MESSAGE_CODES, AuthValidationError } from "../lib/application/auth/errors";
import {
  parseChangePasswordInput,
  parseLoginInput,
  parseRegisterInput,
} from "../lib/application/auth/validation";
import { normalizeLocale } from "../lib/i18n/config";
import { formatDate } from "../lib/i18n/format";
import { buildLocaleSwitchHref, resolveLocaleRedirectTarget } from "../lib/i18n/locale-switcher";

test("normalizeLocale accepts exact and language-tag locale values", () => {
  assert.equal(normalizeLocale("es"), "es");
  assert.equal(normalizeLocale("es-MX"), "es");
  assert.equal(normalizeLocale("EN"), "en");
});

test("normalizeLocale falls back to the default locale for unsupported values", () => {
  assert.equal(normalizeLocale("fr"), "en");
  assert.equal(normalizeLocale(""), "en");
  assert.equal(normalizeLocale(undefined), "en");
});

test("formatDate uses the selected locale", () => {
  const isoDate = "2026-04-21T00:00:00.000Z";

  assert.equal(formatDate(isoDate, "en"), new Intl.DateTimeFormat("en").format(new Date(isoDate)));
  assert.equal(formatDate(isoDate, "es"), new Intl.DateTimeFormat("es").format(new Date(isoDate)));
});

test("buildLocaleSwitchHref preserves the current path and query string", () => {
  assert.equal(buildLocaleSwitchHref("es", "/", ""), "/api/locale?locale=es&redirect=%2F");
  assert.equal(
    buildLocaleSwitchHref("en", "/recipes/23", "tab=family&filter=recent"),
    "/api/locale?locale=en&redirect=%2Frecipes%2F23%3Ftab%3Dfamily%26filter%3Drecent",
  );
});

test("resolveLocaleRedirectTarget keeps safe internal redirects only", () => {
  assert.equal(resolveLocaleRedirectTarget("http://example.test/api/locale?redirect=%2Frecipes%2F23%3Ftab%3Dfamily"), "/recipes/23?tab=family");
  assert.equal(resolveLocaleRedirectTarget("http://example.test/api/locale?redirect=https%3A%2F%2Fevil.example"), "/");
  assert.equal(resolveLocaleRedirectTarget("http://example.test/api/locale?redirect=%2F%2Fevil.example"), "/");
});

test("parseRegisterInput raises stable validation codes", () => {
  assert.throws(
    () => parseRegisterInput({ first_name: "Luis", last_name: "Fleitas", email: "luis@example.com", username: "luis" }),
    (error: unknown) => error instanceof AuthValidationError && error.code === AUTH_MESSAGE_CODES.REQUIRED_PASSWORD,
  );

  assert.throws(
    () =>
      parseRegisterInput({
        first_name: "Luis",
        last_name: "Fleitas",
        email: "luis@example.com",
        username: "luis",
        password: "short",
      }),
    (error: unknown) => error instanceof AuthValidationError && error.code === AUTH_MESSAGE_CODES.PASSWORD_TOO_SHORT,
  );
});

test("parseLoginInput and parseChangePasswordInput use stable validation codes", () => {
  assert.throws(
    () => parseLoginInput({ password: "Password123!" }),
    (error: unknown) =>
      error instanceof AuthValidationError && error.code === AUTH_MESSAGE_CODES.REQUIRED_USERNAME_OR_EMAIL,
  );

  assert.throws(
    () => parseChangePasswordInput({ current_password: "Password123!", new_password: "short" }),
    (error: unknown) =>
      error instanceof AuthValidationError && error.code === AUTH_MESSAGE_CODES.NEW_PASSWORD_TOO_SHORT,
  );
});
