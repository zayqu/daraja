export class RequestBodyError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

function isJsonContentType(value) {
  const mediaType = String(value || "").split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json" ||
    (mediaType.startsWith("application/") && mediaType.endsWith("+json"));
}

export async function readJsonBody(request, maxBytes) {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw new RequestBodyError(415, "Content-Type must be application/json.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError(413, "Request is too large.");
  }
  if (!request.body) {
    throw new RequestBodyError(400, "Request body is required.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError(413, "Request is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400, "Request body must contain valid UTF-8 JSON.");
  }

  if (!text.trim()) {
    throw new RequestBodyError(400, "Request body is required.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestBodyError(400, "Request body must contain valid JSON.");
  }
}

export function getRequestBodyError(error) {
  if (!(error instanceof RequestBodyError)) return null;
  return { status: error.status, message: error.message };
}
