interface AuthLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

const internalOrigin = "https://card-lens.invalid";
const staticRoutes = new Set([
  "/",
  "/scanner",
  "/gallery",
  "/collection",
  "/friends",
  "/market",
  "/mobile-access",
]);

function hasForbiddenCharacters(value: string) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || (code >= 127 && code <= 159) || value[index] === "\\")
      return true;
  }
  return false;
}

function isAllowedPath(pathname: string) {
  if (staticRoutes.has(pathname)) return true;
  const match = /^\/(set|card)\/([^/]+)$/.exec(pathname);
  if (!match) return false;
  const id = decodeURIComponent(match[2]);
  return match[1] === "set"
    ? /^[A-Za-z0-9_-]{1,80}$/.test(id)
    : /^[A-Za-z0-9_!?-]{1,120}$/.test(id);
}

/** Only known app routes may be used as a post-authentication destination. */
export function validateAuthReturn(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    value.trim() !== value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    hasForbiddenCharacters(value)
  )
    return null;
  try {
    const decoded = decodeURIComponent(value);
    // Also reject encoded backslashes and controls, including nested encoding.
    const encodedUnsafe = /%(?:25)*(?:5c|0[0-9a-f]|1[0-9a-f]|7f)/i;
    if (
      hasForbiddenCharacters(decoded) ||
      encodedUnsafe.test(value) ||
      encodedUnsafe.test(decoded)
    )
      return null;
    const url = new URL(value, internalOrigin);
    const rawPath = value.split(/[?#]/, 1)[0];
    if (
      url.origin !== internalOrigin ||
      url.pathname !== rawPath ||
      !isAllowedPath(rawPath)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export function getAuthReturn(search: string): string {
  const values = new URLSearchParams(search).getAll("returnTo");
  return values.length === 1 ? (validateAuthReturn(values[0]) ?? "/") : "/";
}

/** Accepts React Router's location, including when crossing between auth pages. */
export function authLink(
  destination: "/login" | "/signup",
  location: AuthLocation,
): string {
  const returnTo =
    location.pathname === "/login" || location.pathname === "/signup"
      ? getAuthReturn(location.search ?? "")
      : (validateAuthReturn(
          location.pathname + (location.search ?? "") + (location.hash ?? ""),
        ) ?? "/");
  return returnTo === "/"
    ? destination
    : `${destination}?${new URLSearchParams({ returnTo })}`;
}
