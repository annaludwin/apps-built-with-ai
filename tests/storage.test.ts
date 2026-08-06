import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import {
  readHistory,
  addEntry,
  getEntry,
  listSummaries,
  toSummary,
} from "../src/storage.ts";
import type { SeoReport } from "../src/types.ts";
import type { HistoryEntry } from "../src/storage.ts";

// Tworzy przykładowy raport do testów.
function fakeReport(url: string, score = 80): SeoReport {
  return {
    url,
    statusCode: 200,
    responseTimeMs: 123,
    score,
    checks: [],
    headings: [],
  };
}

// Zwraca ścieżkę do unikalnego pliku tymczasowego (inny dla każdego testu).
function tempFile(): string {
  return path.join(tmpdir(), `seo-history-${randomUUID()}.json`);
}

test("readHistory: nieistniejący plik → pusta lista", async () => {
  const file = tempFile();
  assert.deepEqual(await readHistory(file), []);
});

test("addEntry: zapisuje raport i nadaje id oraz datę", async () => {
  const file = tempFile();
  try {
    const entry = await addEntry(file, fakeReport("https://a.pl"));
    assert.ok(entry.id, "wpis powinien mieć id");
    assert.ok(entry.savedAt, "wpis powinien mieć datę");
    assert.equal(entry.report.url, "https://a.pl");

    const history = await readHistory(file);
    assert.equal(history.length, 1);
    assert.equal(history[0].report.url, "https://a.pl");
  } finally {
    await rm(file, { force: true });
  }
});

test("addEntry: najnowszy wpis jest pierwszy", async () => {
  const file = tempFile();
  try {
    await addEntry(file, fakeReport("https://pierwszy.pl"));
    await addEntry(file, fakeReport("https://drugi.pl"));
    const history = await readHistory(file);
    assert.equal(history.length, 2);
    assert.equal(history[0].report.url, "https://drugi.pl");
    assert.equal(history[1].report.url, "https://pierwszy.pl");
  } finally {
    await rm(file, { force: true });
  }
});

test("getEntry: znajduje po id oraz zwraca undefined dla nieznanego id", async () => {
  const file = tempFile();
  try {
    const entry = await addEntry(file, fakeReport("https://a.pl"));
    const found = await getEntry(file, entry.id);
    assert.equal(found?.report.url, "https://a.pl");
    assert.equal(await getEntry(file, "nie-istnieje"), undefined);
  } finally {
    await rm(file, { force: true });
  }
});

test("listSummaries: zwraca skróty (bez pełnego raportu)", async () => {
  const file = tempFile();
  try {
    await addEntry(file, fakeReport("https://a.pl", 90));
    const summaries = await listSummaries(file);
    assert.equal(summaries.length, 1);
    assert.deepEqual(Object.keys(summaries[0]).sort(), [
      "id",
      "savedAt",
      "score",
      "statusCode",
      "url",
    ]);
    assert.equal(summaries[0].score, 90);
  } finally {
    await rm(file, { force: true });
  }
});

test("addEntry: historia jest przycinana do 100 wpisów", async () => {
  const file = tempFile();
  try {
    for (let i = 0; i < 105; i++) {
      await addEntry(file, fakeReport(`https://strona-${i}.pl`));
    }
    const history = await readHistory(file);
    assert.equal(history.length, 100);
    // Najnowszy (105. dodany, indeks 104) powinien być na górze.
    assert.equal(history[0].report.url, "https://strona-104.pl");
  } finally {
    await rm(file, { force: true });
  }
});

test("toSummary: mapuje pola z wpisu", () => {
  const entry: HistoryEntry = {
    id: "abc",
    savedAt: "2026-08-06T12:00:00.000Z",
    report: fakeReport("https://a.pl", 75),
  };
  assert.deepEqual(toSummary(entry), {
    id: "abc",
    savedAt: "2026-08-06T12:00:00.000Z",
    url: "https://a.pl",
    score: 75,
    statusCode: 200,
  });
});
