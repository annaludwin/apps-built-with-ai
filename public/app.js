// Frontend: wysyła URL do backendu i wyświetla raport.
// Czysty JavaScript (bez frameworka) — łatwiej zrozumieć każdy krok.

const form = document.getElementById("analyze-form");
const input = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const reportEl = document.getElementById("report");

// Ikonki dla poszczególnych statusów sprawdzeń.
const ICONS = { ok: "✅", warning: "⚠️", error: "❌" };

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // nie przeładowuj strony
  const url = input.value.trim();
  if (!url) return;

  setLoading(true);
  hide(reportEl);
  showStatus("Analizuję stronę…");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();

    if (!response.ok) {
      showStatus(data.error ?? "Wystąpił błąd.", true);
      return;
    }

    hide(statusEl);
    renderReport(data);
    loadHistory(); // odśwież listę historii po nowym audycie
  } catch {
    showStatus("Nie udało się połączyć z serwerem.", true);
  } finally {
    setLoading(false);
  }
});

/** Rysuje cały raport na podstawie danych z backendu. */
function renderReport(report) {
  // Wynik punktowy + wypełnienie kółka.
  document.getElementById("score-value").textContent = report.score;
  document
    .getElementById("score-circle")
    .style.setProperty("--pct", `${report.score}%`);

  // Metadane.
  const urlLink = document.getElementById("report-url");
  urlLink.textContent = report.url;
  urlLink.href = report.url;
  document.getElementById("report-status").textContent = report.statusCode;
  document.getElementById("report-time").textContent = report.responseTimeMs;

  // Lista sprawdzeń. Akordeon ze strukturą nagłówków wstawiamy tuż po
  // sprawdzeniu H1 — sąsiaduje z nim tematycznie, więc jest czytelniej.
  const list = document.getElementById("checks-list");
  list.innerHTML = "";
  for (const check of report.checks) {
    list.appendChild(renderCheck(check));
    if (check.id === "h1") {
      list.appendChild(renderHeadingsAccordion(report.headings ?? []));
    }
  }

  show(reportEl);
}

/**
 * Buduje akordeon ze strukturą nagłówków jako element listy.
 * Tworzymy go od nowa przy każdej analizie, więc jest domyślnie zwinięty
 * (element <details> bez atrybutu "open").
 */
function renderHeadingsAccordion(headings) {
  const li = document.createElement("li");

  const details = document.createElement("details");
  details.className = "accordion";

  const summary = document.createElement("summary");
  const title = document.createElement("span");
  title.className = "accordion-title";
  title.textContent = "Struktura nagłówków (H1–H6)";
  const count = document.createElement("span");
  count.className = "accordion-count";
  count.textContent = `${headings.length}`;
  summary.append(title, count);

  const content = document.createElement("div");
  content.className = "headings";

  if (headings.length === 0) {
    const empty = document.createElement("p");
    empty.className = "headings-empty";
    empty.textContent = "Nie znaleziono żadnych nagłówków na stronie.";
    content.appendChild(empty);
  } else {
    for (const heading of headings) {
      const row = document.createElement("div");
      row.className = "heading-row";
      // Wcięcie zależne od poziomu: H1 = 0, H2 = 1 poziom w prawo, itd.
      row.style.marginLeft = `${(heading.level - 1) * 1.25}rem`;

      const tag = document.createElement("span");
      tag.className = "heading-tag";
      tag.textContent = `H${heading.level}`;

      const text = document.createElement("span");
      text.className = "heading-text";
      // textContent (nie innerHTML) — bezpiecznie traktujemy treść jako tekst.
      text.textContent = heading.text || "(pusty nagłówek)";

      row.append(tag, text);
      content.appendChild(row);
    }
  }

  details.append(summary, content);
  li.appendChild(details);
  return li;
}

/** Tworzy jeden element listy dla pojedynczego sprawdzenia. */
function renderCheck(check) {
  const li = document.createElement("li");
  li.className = `check ${check.status}`;

  const icon = document.createElement("span");
  icon.className = "check-icon";
  icon.textContent = ICONS[check.status] ?? "•";

  const body = document.createElement("div");
  body.className = "check-body";

  const label = document.createElement("p");
  label.className = "check-label";
  label.textContent = check.label;

  const message = document.createElement("p");
  message.className = "check-message";
  message.textContent = check.message;

  body.append(label, message);

  // Używamy textContent (nie innerHTML), więc treść ze strony
  // jest bezpiecznie traktowana jako tekst — bez ryzyka wstrzyknięcia HTML.
  if (check.value) {
    const value = document.createElement("code");
    value.className = "check-value";
    value.textContent = check.value;
    body.appendChild(value);
  }

  li.append(icon, body);
  return li;
}

// ── Historia audytów ───────────────────────────────────────

/** Pobiera listę historycznych audytów z serwera i ją rysuje. */
async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    if (!response.ok) return;
    const items = await response.json();
    renderHistory(items);
  } catch {
    // Historia to dodatek — jeśli się nie wczyta, nie przerywamy działania.
  }
}

/** Rysuje listę historii (albo ukrywa sekcję, gdy pusta). */
function renderHistory(items) {
  const section = document.getElementById("history");
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  if (!items.length) {
    hide(section);
    return;
  }

  for (const item of items) {
    list.appendChild(renderHistoryItem(item));
  }
  show(section);
}

/** Tworzy jeden klikalny wiersz historii. */
function renderHistoryItem(item) {
  const li = document.createElement("li");
  li.className = "history-item";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "history-btn";
  btn.addEventListener("click", () => openHistoryEntry(item.id));

  const score = document.createElement("span");
  score.className = "history-score";
  score.dataset.level = scoreLevel(item.score);
  score.textContent = item.score;

  const info = document.createElement("div");
  info.className = "history-info";

  const url = document.createElement("span");
  url.className = "history-url";
  url.textContent = item.url;

  const date = document.createElement("span");
  date.className = "history-date";
  date.textContent = formatDate(item.savedAt);

  info.append(url, date);
  btn.append(score, info);
  li.appendChild(btn);
  return li;
}

/** Wczytuje pełny raport z historii i pokazuje go w widoku raportu. */
async function openHistoryEntry(id) {
  try {
    const response = await fetch(`/api/history/${id}`);
    if (!response.ok) {
      showStatus("Nie udało się wczytać audytu z historii.", true);
      return;
    }
    const entry = await response.json();
    hide(statusEl);
    renderReport(entry.report);
    reportEl.scrollIntoView({ behavior: "smooth" });
  } catch {
    showStatus("Nie udało się wczytać audytu z historii.", true);
  }
}

/** Zwraca poziom (kolor) na podstawie wyniku. */
function scoreLevel(score) {
  if (score >= 80) return "ok";
  if (score >= 50) return "warning";
  return "error";
}

/** Formatuje datę ISO na czytelny, polski zapis. */
function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
}

// ── Małe pomocnicze funkcje ────────────────────────────────
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Analizuję…" : "Analizuj";
}

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
  show(statusEl);
}

function show(el) {
  el.hidden = false;
}

function hide(el) {
  el.hidden = true;
}

// Wczytaj historię od razu przy otwarciu strony.
loadHistory();
