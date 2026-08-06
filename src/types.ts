// Wspólne typy używane przez analyzer i serwer.
// Trzymanie typów w jednym miejscu to dobra praktyka — masz jedno źródło prawdy.

/** Wynik pojedynczego sprawdzenia SEO. */
export type CheckStatus = "ok" | "warning" | "error";

export interface Check {
  /** Techniczny identyfikator, np. "title". */
  id: string;
  /** Czytelna nazwa dla człowieka, np. "Tytuł strony". */
  label: string;
  /** ok = dobrze, warning = do poprawy, error = poważny problem. */
  status: CheckStatus;
  /** Wyjaśnienie wyniku pokazywane w raporcie. */
  message: string;
  /** Opcjonalnie: znaleziona wartość (np. treść tytułu). */
  value?: string;
}

/** Pojedynczy nagłówek znaleziony na stronie. */
export interface Heading {
  /** Poziom nagłówka: 1 dla H1, 2 dla H2, ... 6 dla H6. */
  level: number;
  /** Tekst nagłówka. */
  text: string;
}

/** Kompletny raport SEO dla jednego adresu URL. */
export interface SeoReport {
  url: string;
  /** Kod odpowiedzi HTTP, np. 200. */
  statusCode: number;
  /** Czas pobrania strony w milisekundach. */
  responseTimeMs: number;
  /** Wynik 0–100 wyliczony ze sprawdzeń. */
  score: number;
  checks: Check[];
  /** Struktura nagłówków H1–H6 w kolejności występowania na stronie. */
  headings: Heading[];
}
