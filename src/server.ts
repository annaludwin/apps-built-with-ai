import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildReport } from "./analyzer.ts";
import { normalizeUrl } from "./url.ts";
import { addEntry, getEntry, listSummaries } from "./storage.ts";

const app = express();
// Upsun (i inne platformy) same podają port przez zmienną PORT.
// Lokalnie, gdy jej nie ma, używamy 3000.
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Pozwól odczytać JSON z ciała żądania (potrzebne dla POST /api/analyze).
app.use(express.json());

// Serwuj pliki frontendu z katalogu public/ (index.html, style.css, app.js).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Plik z historią audytów. Na Upsun katalog "data" będzie zapisywalnym mountem.
const HISTORY_FILE = path.join(__dirname, "..", "data", "history.json");

/**
 * Endpoint analizy: przyjmuje { url }, pobiera stronę i zwraca raport SEO.
 * Pobieranie dzieje się TU (na serwerze), bo przeglądarka nie może
 * pobrać cudzej strony z powodu ograniczeń CORS.
 */
app.post("/api/analyze", async (req, res) => {
  const rawUrl = typeof req.body?.url === "string" ? req.body.url : "";
  // Pozwól wpisać adres bez protokołu (np. "example.com") — dodajemy https://.
  const normalized = normalizeUrl(rawUrl);

  // 1. Walidacja adresu URL.
  let target: URL;
  try {
    target = new URL(normalized);
  } catch {
    return res.status(400).json({ error: "Podaj poprawny adres URL, np. https://example.com" });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return res.status(400).json({ error: "Obsługiwane są tylko adresy http:// i https://" });
  }

  // 2. Pobranie strony z limitem czasu (timeout 10 s), żeby serwer się nie zawiesił.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const startedAt = performance.now();

  try {
    const response = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "SEO-Analyzer-QA/1.0 (edukacyjne narzedzie QA)" },
    });
    const responseTimeMs = Math.round(performance.now() - startedAt);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return res.status(415).json({
        error: `Adres nie zwrócił strony HTML (typ: ${contentType || "nieznany"}).`,
      });
    }

    const html = await response.text();
    const report = buildReport({
      url: response.url || target.href,
      statusCode: response.status,
      responseTimeMs,
      html,
    });

    // Zapisz audyt do historii. Błąd zapisu nie powinien psuć analizy —
    // logujemy go i mimo to zwracamy raport użytkownikowi.
    try {
      await addEntry(HISTORY_FILE, report);
    } catch (err) {
      console.error("Nie udało się zapisać audytu do historii:", err);
    }

    return res.json(report);
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return res.status(502).json({
      error: isAbort
        ? "Przekroczono limit czasu (10 s) podczas pobierania strony."
        : "Nie udało się pobrać strony. Sprawdź adres i spróbuj ponownie.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

/** Lista historycznych audytów (skróty, najnowsze pierwsze). */
app.get("/api/history", async (_req, res) => {
  try {
    const summaries = await listSummaries(HISTORY_FILE);
    return res.json(summaries);
  } catch (err) {
    console.error("Błąd odczytu historii:", err);
    return res.status(500).json({ error: "Nie udało się odczytać historii." });
  }
});

/** Pełny raport z historii po id. */
app.get("/api/history/:id", async (req, res) => {
  try {
    const entry = await getEntry(HISTORY_FILE, req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Nie znaleziono audytu o podanym id." });
    }
    return res.json(entry);
  } catch (err) {
    console.error("Błąd odczytu audytu:", err);
    return res.status(500).json({ error: "Nie udało się odczytać audytu." });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ SEO Analyzer działa!  Otwórz w przeglądarce:  http://localhost:${PORT}\n`);
});
