export function requestIsSameOrigin(request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  if (!origin) return fetchSite === null;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function requestHasJsonContentType(request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.split(";", 1)[0].trim().toLowerCase() === "application/json";
}
