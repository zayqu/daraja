import { handlers } from "@/auth";
import { protectMutation } from "@/lib/request-security";

export const GET = handlers.GET;

export async function POST(request) {
  const url = new URL(request.url);
  const appleConfigured =
    process.env.AUTH_APPLE_ENABLED === "true" &&
    Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);

  // Apple uses a cross-site form_post OAuth callback. The regular mutation
  // origin filter correctly blocks this kind of request, but it also blocks
  // Apple's legitimate response. Only this exact, configured callback may
  // reach Auth.js, which validates its OAuth state and provider token.
  if (appleConfigured && url.pathname === "/api/auth/callback/apple") {
    const contentType = request.headers.get("content-type") || "";
    const origin = request.headers.get("origin");
    if (
      !contentType.toLowerCase().startsWith("application/x-www-form-urlencoded") ||
      (origin && origin !== "https://appleid.apple.com")
    ) {
      return new Response("Invalid Apple sign-in callback", { status: 403 });
    }
    return handlers.POST(request);
  }

  const error = protectMutation(request, {
    scope: "authentication",
    limit: 60,
  });
  if (error) return error;
  return handlers.POST(request);
}
