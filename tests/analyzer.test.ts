import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeHtml, calculateScore, extractHeadings } from "../src/analyzer.ts";
import type { Check } from "../src/types.ts";

// Pomocnik: znajduje jedno sprawdzenie po id, żeby testy były czytelne.
function find(checks: Check[], id: string): Check {
  const check = checks.find((c) => c.id === id);
  assert.ok(check, `Nie znaleziono sprawdzenia o id "${id}"`);
  return check;
}

// ── Tytuł ──────────────────────────────────────────────────
test("tytuł: brak → error", () => {
  const checks = analyzeHtml("<html><head></head><body></body></html>");
  assert.equal(find(checks, "title").status, "error");
});

test("tytuł: za krótki → warning", () => {
  const checks = analyzeHtml("<title>Krótko</title>");
  assert.equal(find(checks, "title").status, "warning");
});

test("tytuł: w zalecanym zakresie → ok", () => {
  const title = "Sklep internetowy z butami sportowymi — oferta 2026";
  const checks = analyzeHtml(`<title>${title}</title>`);
  assert.equal(find(checks, "title").status, "ok");
});

// ── Meta description ───────────────────────────────────────
test("description: brak → error", () => {
  const checks = analyzeHtml("<title>x</title>");
  assert.equal(find(checks, "description").status, "error");
});

test("description: w zakresie → ok", () => {
  const desc = "To jest przykładowy, wystarczająco długi opis strony do celów testowych SEO.";
  const checks = analyzeHtml(`<meta name="description" content="${desc}">`);
  assert.equal(find(checks, "description").status, "ok");
});

// ── H1 ─────────────────────────────────────────────────────
test("h1: brak → error", () => {
  const checks = analyzeHtml("<body><p>tekst</p></body>");
  assert.equal(find(checks, "h1").status, "error");
});

test("h1: jeden → ok", () => {
  const checks = analyzeHtml("<body><h1>Nagłówek</h1></body>");
  assert.equal(find(checks, "h1").status, "ok");
});

test("h1: wiele → warning", () => {
  const checks = analyzeHtml("<body><h1>A</h1><h1>B</h1></body>");
  assert.equal(find(checks, "h1").status, "warning");
});

// ── Obrazki bez alt ────────────────────────────────────────
test("img-alt: obrazek bez alt → warning", () => {
  const checks = analyzeHtml('<body><img src="a.jpg"></body>');
  assert.equal(find(checks, "img-alt").status, "warning");
});

test("img-alt: wszystkie z alt → ok", () => {
  const checks = analyzeHtml('<body><img src="a.jpg" alt="opis"></body>');
  assert.equal(find(checks, "img-alt").status, "ok");
});

test("img-alt: brak obrazków → ok", () => {
  const checks = analyzeHtml("<body><p>bez obrazków</p></body>");
  assert.equal(find(checks, "img-alt").status, "ok");
});

// ── Canonical ──────────────────────────────────────────────
test("canonical: ustawiony → ok", () => {
  const checks = analyzeHtml('<link rel="canonical" href="https://example.com/">');
  assert.equal(find(checks, "canonical").status, "ok");
});

test("canonical: brak → warning", () => {
  const checks = analyzeHtml("<title>x</title>");
  assert.equal(find(checks, "canonical").status, "warning");
});

// ── Robots ─────────────────────────────────────────────────
test("robots: noindex → warning", () => {
  const checks = analyzeHtml('<meta name="robots" content="noindex, nofollow">');
  assert.equal(find(checks, "robots").status, "warning");
});

test("robots: index → ok", () => {
  const checks = analyzeHtml('<meta name="robots" content="index, follow">');
  assert.equal(find(checks, "robots").status, "ok");
});

// ── Lang ───────────────────────────────────────────────────
test("lang: ustawiony → ok", () => {
  const checks = analyzeHtml('<html lang="pl"><body></body></html>');
  assert.equal(find(checks, "lang").status, "ok");
});

test("lang: brak → warning", () => {
  const checks = analyzeHtml("<html><body></body></html>");
  assert.equal(find(checks, "lang").status, "warning");
});

// ── Viewport ───────────────────────────────────────────────
test("viewport: ustawiony → ok", () => {
  const checks = analyzeHtml('<meta name="viewport" content="width=device-width, initial-scale=1">');
  assert.equal(find(checks, "viewport").status, "ok");
});

test("viewport: brak → warning", () => {
  const checks = analyzeHtml("<title>x</title>");
  assert.equal(find(checks, "viewport").status, "warning");
});

// ── Charset ────────────────────────────────────────────────
test("charset: ustawiony → ok", () => {
  const checks = analyzeHtml('<meta charset="utf-8">');
  assert.equal(find(checks, "charset").status, "ok");
});

test("charset: brak → warning", () => {
  const checks = analyzeHtml("<title>x</title>");
  assert.equal(find(checks, "charset").status, "warning");
});

// ── Open Graph ─────────────────────────────────────────────
test("open-graph: komplet 3 tagów → ok", () => {
  const html = `
    <meta property="og:title" content="Tytuł">
    <meta property="og:description" content="Opis">
    <meta property="og:image" content="https://example.com/img.png">`;
  const checks = analyzeHtml(html);
  assert.equal(find(checks, "open-graph").status, "ok");
});

test("open-graph: brak → warning", () => {
  const checks = analyzeHtml("<title>x</title>");
  assert.equal(find(checks, "open-graph").status, "warning");
});

test("open-graph: niekompletny → warning", () => {
  const checks = analyzeHtml('<meta property="og:title" content="Tytuł">');
  assert.equal(find(checks, "open-graph").status, "warning");
});

// ── Dane strukturalne ──────────────────────────────────────
test("structured-data: obecne → ok", () => {
  const checks = analyzeHtml('<script type="application/ld+json">{}</script>');
  assert.equal(find(checks, "structured-data").status, "ok");
});

test("structured-data: brak → warning", () => {
  const checks = analyzeHtml("<title>x</title>");
  assert.equal(find(checks, "structured-data").status, "warning");
});

// ── Struktura nagłówków (extractHeadings) ──────────────────
test("extractHeadings: brak nagłówków → pusta lista", () => {
  assert.deepEqual(extractHeadings("<body><p>tekst</p></body>"), []);
});

test("extractHeadings: zachowuje kolejność i poziomy", () => {
  const html = "<body><h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2></body>";
  assert.deepEqual(extractHeadings(html), [
    { level: 1, text: "A" },
    { level: 2, text: "B" },
    { level: 3, text: "C" },
    { level: 2, text: "D" },
  ]);
});

test("extractHeadings: przycina i zbija białe znaki", () => {
  const html = "<h2>   Ala   ma    kota   </h2>";
  assert.deepEqual(extractHeadings(html), [{ level: 2, text: "Ala ma kota" }]);
});

test("extractHeadings: obsługuje wszystkie poziomy H1–H6", () => {
  const html = "<h1>1</h1><h2>2</h2><h3>3</h3><h4>4</h4><h5>5</h5><h6>6</h6>";
  const levels = extractHeadings(html).map((h) => h.level);
  assert.deepEqual(levels, [1, 2, 3, 4, 5, 6]);
});

// ── Wynik punktowy ─────────────────────────────────────────
test("score: same ok = 100", () => {
  const checks: Check[] = [
    { id: "a", label: "A", status: "ok", message: "" },
    { id: "b", label: "B", status: "ok", message: "" },
  ];
  assert.equal(calculateScore(checks), 100);
});

test("score: ok + error = 50", () => {
  const checks: Check[] = [
    { id: "a", label: "A", status: "ok", message: "" },
    { id: "b", label: "B", status: "error", message: "" },
  ];
  assert.equal(calculateScore(checks), 50);
});

test("score: warning liczy się jako pół punktu", () => {
  const checks: Check[] = [{ id: "a", label: "A", status: "warning", message: "" }];
  assert.equal(calculateScore(checks), 50);
});
