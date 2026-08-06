import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl } from "../src/url.ts";

test("bez protokołu → dodaje https://", () => {
  assert.equal(normalizeUrl("example.com"), "https://example.com");
});

test("z www bez protokołu → dodaje https://", () => {
  assert.equal(normalizeUrl("www.wikipedia.org"), "https://www.wikipedia.org");
});

test("już z https:// → bez zmian", () => {
  assert.equal(normalizeUrl("https://example.com"), "https://example.com");
});

test("z http:// → bez zmian (nie wymuszamy https)", () => {
  assert.equal(normalizeUrl("http://example.com"), "http://example.com");
});

test("obcina białe znaki dookoła", () => {
  assert.equal(normalizeUrl("  example.com  "), "https://example.com");
});

test("inny protokół (ftp) → zostaje (serwer odrzuci go później)", () => {
  assert.equal(normalizeUrl("ftp://example.com"), "ftp://example.com");
});

test("pusty ciąg → pusty ciąg", () => {
  assert.equal(normalizeUrl("   "), "");
});

test("adres ze ścieżką → dodaje https://", () => {
  assert.equal(normalizeUrl("example.com/blog/post"), "https://example.com/blog/post");
});
