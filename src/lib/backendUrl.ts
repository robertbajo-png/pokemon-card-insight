/** Keep mobile browsers on the HTTPS origin that served the local installation. */
export function resolveBackendUrl(
  configuredUrl: string,
  localHosting: boolean,
  pageOrigin?: string,
) {
  if (!localHosting || !pageOrigin) return configuredUrl;
  const page = new URL(pageOrigin);
  if (page.protocol !== "https:" && page.protocol !== "http:") {
    throw new Error("Öppna appen via dess webb-adress.");
  }
  return new URL("/backend", page.origin).toString();
}
