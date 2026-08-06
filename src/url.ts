/**
 * Normalizuje adres wpisany przez użytkownika.
 *
 * Jeśli użytkownik nie podał protokołu (np. "example.com"),
 * dodajemy "https://". Jeśli podał jakikolwiek protokół
 * (http://, https://, a nawet ftp://), zostawiamy bez zmian —
 * poprawność protokołu weryfikuje później serwer.
 *
 * To czysta funkcja — łatwa do przetestowania w izolacji.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // Czy adres zaczyna się od "jakiśprotokół://"?
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  return hasProtocol ? trimmed : `https://${trimmed}`;
}
