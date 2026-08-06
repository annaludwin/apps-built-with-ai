import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SeoReport } from "./types.ts";

// Maksymalna liczba przechowywanych audytów. Starsze są usuwane,
// żeby plik nie rósł w nieskończoność.
const MAX_ENTRIES = 100;

/** Pojedynczy wpis w historii: raport + metadane zapisu. */
export interface HistoryEntry {
  id: string;
  /** Data zapisu w formacie ISO (np. "2026-08-06T12:00:00.000Z"). */
  savedAt: string;
  report: SeoReport;
}

/** Skrót wpisu — na listę historii (bez pełnego raportu). */
export interface HistorySummary {
  id: string;
  savedAt: string;
  url: string;
  score: number;
  statusCode: number;
}

/** Zamienia pełny wpis na skrót do listy. */
export function toSummary(entry: HistoryEntry): HistorySummary {
  return {
    id: entry.id,
    savedAt: entry.savedAt,
    url: entry.report.url,
    score: entry.report.score,
    statusCode: entry.report.statusCode,
  };
}

/**
 * Wczytuje całą historię z pliku.
 * Jeśli plik jeszcze nie istnieje — zwraca pustą listę.
 */
export async function readHistory(file: string): Promise<HistoryEntry[]> {
  try {
    const content = await readFile(file, "utf8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? (data as HistoryEntry[]) : [];
  } catch (err) {
    // Brak pliku (pierwsze uruchomienie) traktujemy jako pustą historię.
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * Dodaje raport do historii i zapisuje plik.
 * Nowe wpisy trafiają na początek; lista jest przycinana do MAX_ENTRIES.
 * Zwraca utworzony wpis (z nadanym id i datą).
 */
export async function addEntry(file: string, report: SeoReport): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: randomUUID(),
    savedAt: new Date().toISOString(),
    report,
  };

  const history = await readHistory(file);
  history.unshift(entry); // najnowszy na górze
  const trimmed = history.slice(0, MAX_ENTRIES);

  // Upewnij się, że katalog istnieje, zanim zapiszemy plik.
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(trimmed, null, 2), "utf8");

  return entry;
}

/** Zwraca pełny wpis po id lub undefined, jeśli nie znaleziono. */
export async function getEntry(file: string, id: string): Promise<HistoryEntry | undefined> {
  const history = await readHistory(file);
  return history.find((e) => e.id === id);
}

/** Zwraca skróty wszystkich wpisów (najnowsze pierwsze). */
export async function listSummaries(file: string): Promise<HistorySummary[]> {
  const history = await readHistory(file);
  return history.map(toSummary);
}
