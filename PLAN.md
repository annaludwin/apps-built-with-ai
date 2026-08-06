# Plan projektu: SEO Analyzer (narzędzie web dla QA)

## Cel

Strona web, którą **każdy** może otworzyć w przeglądarce, wkleić adres URL
i dostać czytelny raport SEO. Narzędzie dla QA — do sprawdzania stron na
środowiskach dev / staging / produkcja.

- **Autor:** Anna Ludwin (QA, podstawy TS/JS) — pierwszy projekt w Claude Code
- **Wejście:** jeden adres URL
- **Wyjście:** raport na ekranie (lista sprawdzeń ✅/⚠️/❌ + wynik 0–100)

---

## Krok 1 — Zakres (MVP)

Robimy minimalną, ale realnie użyteczną wersję. Zaprojektowaną tak, by łatwo
ją później rozszerzać.

**12 sprawdzeń SEO w MVP:**

1. `<title>` — obecność i długość (zalecane 30–60 znaków)
2. Meta description — obecność i długość (zalecane 50–160 znaków)
3. H1 — czy jest dokładnie jeden
4. Obrazki bez atrybutu `alt`
5. Link canonical
6. Meta robots (ostrzeżenie przy `noindex`)
7. `lang` na `<html>`
8. Viewport (mobile)
9. Charset (kodowanie znaków)
10. Open Graph (og:title, og:description, og:image)
11. Dane strukturalne JSON-LD
12. Kod odpowiedzi HTTP + czas ładowania

**Świadomie NA PÓŹNIEJ (rozszerzenia po MVP):**

- analiza wielu URL-i naraz / crawling całej strony
- eksport raportu do PDF / CSV
- sprawdzanie linków (wykrywanie 404)
- historia analiz / baza danych
- logowanie użytkowników

---

## Krok 2 — Architektura

Przeglądarka nie może sama pobrać cudzej strony (ograniczenie CORS), więc
potrzebny jest backend, który pobierze stronę po stronie serwera.

```
 PRZEGLĄDARKA               SERWER (Node.js)              INTERNET
 ┌──────────────┐  POST     ┌─────────────────────┐  fetch ┌────────────┐
 │ FRONTEND     │ ────────► │ BACKEND             │ ─────► │ badana     │
 │ formularz +  │  /api/    │ 1. pobiera stronę   │ ◄───── │ strona     │
 │ raport       │ ◄──────── │ 2. parsuje HTML     │  HTML  └────────────┘
 └──────────────┘  JSON     │ 3. liczy sprawdzenia│
                            │ 4. odsyła raport    │
                            └─────────────────────┘
```

**Decyzja:** jeden serwer Node serwuje frontend i obsługuje API
(prościej: jedno uruchomienie, jedno wdrożenie, brak CORS między częściami).

---

## Krok 3 — Stack

| Element            | Wybór                     | Dlaczego                                             |
| ------------------ | ------------------------- | ---------------------------------------------------- |
| Język              | **TypeScript**            | Typy wyłapują błędy przed uruchomieniem              |
| Serwer             | **Express**               | Najpopularniejszy — najwięcej materiałów do nauki    |
| Parser HTML        | **Cheerio**               | Składnia jak jQuery, idealna do wyciągania elementów |
| Pobieranie stron   | **wbudowany `fetch`**     | Node 26 ma go w zestawie — zero dodatkowych bibliotek |
| Uruchamianie TS    | **Node natywnie**         | Node 26 uruchamia `.ts` bez kompilacji               |
| Testy              | **wbudowany `node --test`** | Zero konfiguracji, poznajemy fundamenty            |

**Zależności produkcyjne (`dependencies`):** `express`, `cheerio`
**Zależności deweloperskie (`devDependencies`):** `typescript`, `@types/express`, `@types/node`

---

## Krok 4 — Struktura plików

```
seo/
├── package.json         # zależności + komendy (start, dev, test)
├── tsconfig.json        # ustawienia TypeScript
├── .gitignore           # np. node_modules/
├── PLAN.md              # ten plik
│
├── .upsun/
│   └── config.yaml      # konfiguracja wdrożenia na Upsun
│
├── src/                 # BACKEND
│   ├── server.ts        # Express: serwuje frontend + endpoint /api/analyze
│   ├── analyzer.ts      # logika SEO — czysta funkcja (serce narzędzia)
│   └── types.ts         # wspólne typy (Check, SeoReport)
│
├── public/              # FRONTEND
│   ├── index.html       # formularz + miejsce na raport
│   ├── style.css        # wygląd
│   └── app.js           # wysyłka URL + rysowanie raportu
│
└── tests/               # TESTY
    └── analyzer.test.ts # testy jednostkowe logiki SEO
```

**Zasada projektowa:** logika SEO (`analyzer.ts`) jest oddzielona od serwera i
od wyglądu. Nie wie nic o Express ani o przeglądarce — dostaje HTML, oddaje raport.

**Trik na łatwe rozszerzanie:** wewnątrz `analyzer.ts` każde sprawdzenie to mała
funkcja, a wszystkie trzymamy na liście. Dodanie 13. sprawdzenia = dopisanie
jednej funkcji do listy. Gdy plik urośnie (~30 sprawdzeń), rozbijemy go na folder
`src/checks/` (jeden plik na sprawdzenie) — ale nie wcześniej.

---

## Krok 5 — Testy

Piramida testów:

```
   E2E (Playwright)            ← LATER
   Integracyjne (endpoint)     ← LATER
   Jednostkowe (analyzer.ts)   ← TERAZ ✅
```

**MVP — testy jednostkowe `analyzer.ts`** (czysta funkcja = łatwe, szybkie,
deterministyczne). Dla każdego sprawdzenia schemat AAA (Arrange–Act–Assert)
i 3 ścieżki:

- ✅ dobrze → status `ok`
- ⚠️ do poprawy → status `warning`
- ❌ źle → status `error`

Plus testy funkcji liczącej wynik 0–100. Razem ~25–30 testów.

**LATER:**

- integracyjne: `POST /api/analyze` zwraca poprawny JSON, obsługuje zły URL (400)
  i timeout (502)
- E2E: Playwright wpisuje URL, klika „Analizuj", sprawdza raport

---

## Krok 6 — Wdrożenie na Upsun

Kolejność: najpierw wszystko działa **lokalnie**, potem wdrażamy.

**Przygotowuje kod (Claude):**

1. `.upsun/config.yaml` — typ `nodejs`, build `npm install`, start `npm start`,
   routing publicznego URL do aplikacji
2. serwer czyta `process.env.PORT` (Upsun sam podaje port)

**Robi Anna (z instrukcją krok po kroku):**

```
1. Instalacja Upsun CLI        (jednorazowo)
2. upsun login                 (logowanie na konto)
3. upsun project:create        (utworzenie projektu → git remote)
4. git push upsun main         (wypchnięcie → Upsun buduje i publikuje)
   → publiczny adres, np. https://main-xxxx.upsun.app
```

**Do sprawdzenia przy wdrożeniu:** czy Upsun CLI jest już zainstalowane.

---

## Kolejność realizacji (po akceptacji planu)

1. `package.json`, `tsconfig.json`, `.gitignore`
2. `src/types.ts` — typy
3. `src/analyzer.ts` — logika SEO (serce)
4. `tests/analyzer.test.ts` — testy jednostkowe → `npm test`
5. `src/server.ts` — serwer Express
6. `public/` — frontend (HTML, CSS, JS)
7. Uruchomienie i test lokalny w przeglądarce
8. `.upsun/config.yaml` + wdrożenie na Upsun
