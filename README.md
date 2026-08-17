# SEO Analyzer for QA

Web tool for QA: paste a page URL and get a readable SEO report (pass / warning / fail + score 0–100).

Built in TypeScript (Express + Cheerio). The SEO checks live in a pure function, covered by unit tests.

## Checks (MVP)

- Title — present, length 30–60
- Meta description — present, length 50–160
- Exactly one H1
- Images missing `alt`
- Canonical link
- Meta robots (`noindex` warning)
- `lang` on `<html>`
- Viewport (mobile)
- Charset
- Open Graph (`og:title`, `og:description`, `og:image`)
- JSON-LD structured data
- HTTP status + load time

## Requirements

- Node.js (LTS)

## Install and run

```bash
npm install
npm start
```

Then open the local URL printed in the terminal (default: `http://localhost:3000`, or the port in `PORT`).

## Tests

```bash
npm test
```

Typecheck:

```bash
npm run typecheck
```

## Project structure

| Path | What it is |
|------|------------|
| `src/analyzer.ts` | SEO checks (pure function) |
| `src/server.ts` | Express: UI + `POST /api/analyze` |
| `src/types.ts` | Shared types |
| `public/` | Form and report UI |
| `tests/analyzer.test.ts` | Unit tests for the analyzer |

## Scripts

| Script | Command |
|--------|---------|
| `start` | `node src/server.ts` |
| `dev` | watch mode |
| `test` | unit tests |
| `typecheck` | `tsc --noEmit` |
