# CLAUDE.md — wskazówki dla Claude Code

## Projekt
**SEO Analyzer** — narzędzie web dla QA. Użytkownik wpisuje URL i dostaje raport
SEO (11 sprawdzeń + wynik 0–100, struktura nagłówków, historia audytów).
Backend: Node + Express + Cheerio (TypeScript, uruchamiany natywnie przez Node).
Frontend: czysty HTML/CSS/JS w `public/`. Szczegóły w [PLAN.md](PLAN.md).

## Zasady współpracy

### Commity — PYTAJ po każdej większej zmianie
Po każdej **ważnej, większej zmianie** (np. nowa funkcja, istotna przebudowa,
poprawka wpływająca na działanie) **zapytaj użytkownika, czy zrobić commit.**
Nigdy nie commituj automatycznie ani „przy okazji" — czekaj na wyraźną zgodę.
Drobne, robocze zmiany nie wymagają pytania za każdym razem.

**Opisy commitów pisz po angielsku.**

### Najpierw plan, potem kod
Przy większych funkcjach najpierw omów plan i poczekaj na akceptację, dopiero
potem koduj. Tłumacz decyzje prosto (użytkownik zna podstawy TS/JS).

### Język
Komunikuj się po polsku.

### Testy
Projekt jest rozwijany przez QA — dbaj o testy. Logikę trzymaj w czystych,
testowalnych funkcjach (jak `analyzer.ts`, `url.ts`, `storage.ts`).

## Przydatne komendy
```bash
npm start        # uruchom serwer (http://localhost:3000)
npm run dev      # serwer w trybie watch (auto-restart po zmianie w src/)
npm test         # testy jednostkowe (node --test)
npm run typecheck # sprawdzenie typów TypeScript
```
