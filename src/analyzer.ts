import * as cheerio from "cheerio";
import type { Check, Heading, SeoReport } from "./types.ts";

// ── Progi SEO (wg powszechnie przyjętych dobrych praktyk) ──────────────────
// Trzymamy je jako stałe na górze, żeby łatwo było je zmienić w jednym miejscu.
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

/**
 * Typ pojedynczego sprawdzenia: dostaje sparsowany dokument (Cheerio),
 * zwraca wynik jako obiekt Check.
 */
type CheckFn = ($: cheerio.CheerioAPI) => Check;

// ── Poszczególne sprawdzenia ────────────────────────────────────────────────
// Każde to mała, samodzielna funkcja. Żeby dodać nowe sprawdzenie:
//   1. napisz funkcję poniżej,
//   2. dopisz jej nazwę do listy CHECKS na dole.

/** 1. Tytuł strony — obecność i długość. */
function checkTitle($: cheerio.CheerioAPI): Check {
  const label = "Tytuł strony (<title>)";
  const title = $("head > title").first().text().trim();
  if (!title) {
    return { id: "title", label, status: "error", message: "Brak tagu <title>. To jeden z najważniejszych elementów SEO." };
  }
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { id: "title", label, status: "warning", value: title, message: `Tytuł ma ${title.length} znaków. Zalecane ${TITLE_MIN}–${TITLE_MAX}.` };
  }
  return { id: "title", label, status: "ok", value: title, message: `Tytuł ma ${title.length} znaków — w zalecanym zakresie.` };
}

/** 2. Meta description — obecność i długość. */
function checkDescription($: cheerio.CheerioAPI): Check {
  const label = "Meta opis (meta description)";
  const desc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!desc) {
    return { id: "description", label, status: "error", message: "Brak meta description. Wpływa na to, co widać w wynikach wyszukiwania." };
  }
  if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
    return { id: "description", label, status: "warning", value: desc, message: `Opis ma ${desc.length} znaków. Zalecane ${DESC_MIN}–${DESC_MAX}.` };
  }
  return { id: "description", label, status: "ok", value: desc, message: `Opis ma ${desc.length} znaków — w zalecanym zakresie.` };
}

/** 3. Nagłówek H1 — powinien być dokładnie jeden. */
function checkH1($: cheerio.CheerioAPI): Check {
  const label = "Nagłówek H1";
  const h1s = $("h1");
  if (h1s.length === 0) {
    return { id: "h1", label, status: "error", message: "Brak nagłówka H1. Strona powinna mieć dokładnie jeden." };
  }
  if (h1s.length > 1) {
    return { id: "h1", label, status: "warning", value: h1s.first().text().trim(), message: `Znaleziono ${h1s.length} nagłówków H1. Zalecany jest dokładnie jeden.` };
  }
  return { id: "h1", label, status: "ok", value: h1s.first().text().trim(), message: "Dokładnie jeden nagłówek H1 — idealnie." };
}

/** 4. Obrazki bez atrybutu alt. */
function checkImgAlt($: cheerio.CheerioAPI): Check {
  const label = "Atrybuty alt obrazków";
  const images = $("img");
  const withoutAlt = images.filter((_, el) => {
    const alt = $(el).attr("alt");
    return alt === undefined || alt.trim() === "";
  });
  if (images.length === 0) {
    return { id: "img-alt", label, status: "ok", message: "Brak obrazków na stronie." };
  }
  if (withoutAlt.length > 0) {
    return { id: "img-alt", label, status: "warning", message: `${withoutAlt.length} z ${images.length} obrazków nie ma tekstu alt (ważne dla dostępności i SEO).` };
  }
  return { id: "img-alt", label, status: "ok", message: `Wszystkie ${images.length} obrazków mają tekst alt.` };
}

/** 5. Link canonical — pomaga uniknąć duplikatów treści. */
function checkCanonical($: cheerio.CheerioAPI): Check {
  const label = "Link canonical";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  if (canonical) {
    return { id: "canonical", label, status: "ok", value: canonical, message: "Ustawiony link canonical (pomaga uniknąć duplikatów treści)." };
  }
  return { id: "canonical", label, status: "warning", message: "Brak linku canonical. Może prowadzić do problemów z duplikatami treści." };
}

/** 6. Meta robots — ostrzegamy przy noindex. */
function checkRobots($: cheerio.CheerioAPI): Check {
  const label = "Meta robots";
  const robots = $('meta[name="robots"]').attr("content")?.trim().toLowerCase() ?? "";
  if (robots.includes("noindex")) {
    return { id: "robots", label, status: "warning", value: robots, message: 'Strona ma "noindex" — nie będzie indeksowana. Upewnij się, że to celowe!' };
  }
  return {
    id: "robots", label, status: "ok", value: robots || undefined,
    message: robots ? `Meta robots: "${robots}" — strona może być indeksowana.` : "Brak meta robots — domyślnie strona może być indeksowana.",
  };
}

/** 7. Atrybut lang na <html>. */
function checkLang($: cheerio.CheerioAPI): Check {
  const label = "Język strony (html lang)";
  const lang = $("html").attr("lang")?.trim() ?? "";
  if (lang) {
    return { id: "lang", label, status: "ok", value: lang, message: `Ustawiony język strony: "${lang}".` };
  }
  return { id: "lang", label, status: "warning", message: "Brak atrybutu lang na <html>. Ważny dla dostępności i SEO." };
}

/** 8. Viewport — responsywność / mobile. */
function checkViewport($: cheerio.CheerioAPI): Check {
  const label = "Viewport (mobile)";
  const viewport = $('meta[name="viewport"]').attr("content")?.trim() ?? "";
  if (viewport) {
    return { id: "viewport", label, status: "ok", value: viewport, message: "Ustawiony meta viewport — strona przystosowana do urządzeń mobilnych." };
  }
  return { id: "viewport", label, status: "warning", message: "Brak meta viewport. Google faworyzuje strony mobilne (mobile-first)." };
}

/** 9. Kodowanie znaków (charset). */
function checkCharset($: cheerio.CheerioAPI): Check {
  const label = "Kodowanie znaków";
  const charset =
    $("meta[charset]").attr("charset")?.trim() ||
    $('meta[http-equiv="Content-Type"]').attr("content")?.trim() ||
    "";
  if (charset) {
    return { id: "charset", label, status: "ok", value: charset, message: `Zadeklarowane kodowanie: "${charset}".` };
  }
  return { id: "charset", label, status: "warning", message: 'Brak deklaracji kodowania znaków (np. <meta charset="utf-8">).' };
}

/** 10. Open Graph — podgląd przy udostępnianiu w social media. */
function checkOpenGraph($: cheerio.CheerioAPI): Check {
  const label = "Open Graph (social media)";
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDesc = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() ?? "";
  const count = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  if (count === 3) {
    return { id: "open-graph", label, status: "ok", message: "Komplet tagów og:title, og:description i og:image." };
  }
  if (count === 0) {
    return { id: "open-graph", label, status: "warning", message: "Brak tagów Open Graph. Linki będą źle wyglądać po udostępnieniu." };
  }
  const missing = [!ogTitle && "og:title", !ogDesc && "og:description", !ogImage && "og:image"].filter(Boolean).join(", ");
  return { id: "open-graph", label, status: "warning", message: `Niekompletne tagi Open Graph (${count}/3). Brakuje: ${missing}.` };
}

/** 11. Dane strukturalne JSON-LD. */
function checkStructuredData($: cheerio.CheerioAPI): Check {
  const label = "Dane strukturalne (JSON-LD)";
  const jsonLd = $('script[type="application/ld+json"]');
  if (jsonLd.length > 0) {
    return { id: "structured-data", label, status: "ok", message: `Znaleziono ${jsonLd.length} blok(i) danych strukturalnych.` };
  }
  return { id: "structured-data", label, status: "warning", message: "Brak danych strukturalnych JSON-LD (mogą dać bogatsze wyniki w Google)." };
}

// ── Lista wszystkich sprawdzeń ────────────────────────────────────────────────
// TU dopisujesz nowe sprawdzenia w przyszłości.
// (Sprawdzenie #12 — kod HTTP i czas ładowania — nie zależy od HTML,
//  więc dokładamy je w buildReport na podstawie danych sieciowych.)
const CHECKS: CheckFn[] = [
  checkTitle,
  checkDescription,
  checkH1,
  checkImgAlt,
  checkCanonical,
  checkRobots,
  checkLang,
  checkViewport,
  checkCharset,
  checkOpenGraph,
  checkStructuredData,
];

/**
 * Analizuje surowy HTML strony i zwraca listę sprawdzeń SEO.
 *
 * To czysta funkcja: te same dane wejściowe = ten sam wynik.
 * Dzięki temu można ją testować bez serwera i bez internetu.
 */
export function analyzeHtml(html: string): Check[] {
  const $ = cheerio.load(html);
  return CHECKS.map((check) => check($));
}

/**
 * Wyciąga wszystkie nagłówki H1–H6 w kolejności ich występowania na stronie.
 * Czysta funkcja — łatwa do przetestowania.
 */
export function extractHeadings(html: string): Heading[] {
  const $ = cheerio.load(html);
  const headings: Heading[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    if (!("tagName" in el)) return;
    // np. "h2" -> 2
    const level = Number(String(el.tagName).replace(/[^0-9]/g, ""));
    // Zbijamy wielokrotne białe znaki do pojedynczych spacji.
    const text = $(el).text().trim().replace(/\s+/g, " ");
    headings.push({ level, text });
  });
  return headings;
}

/**
 * Wylicza wynik 0–100 na podstawie sprawdzeń.
 * ok = 1 pkt, warning = 0.5 pkt, error = 0 pkt.
 */
export function calculateScore(checks: Check[]): number {
  if (checks.length === 0) return 0;
  const points = checks.reduce((sum, c) => {
    if (c.status === "ok") return sum + 1;
    if (c.status === "warning") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / checks.length) * 100);
}

/** Składa kompletny raport z danych sieciowych i wyniku analizy HTML. */
export function buildReport(params: {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  html: string;
}): SeoReport {
  const checks = analyzeHtml(params.html);
  return {
    url: params.url,
    statusCode: params.statusCode,
    responseTimeMs: params.responseTimeMs,
    score: calculateScore(checks),
    checks,
    headings: extractHeadings(params.html),
  };
}
