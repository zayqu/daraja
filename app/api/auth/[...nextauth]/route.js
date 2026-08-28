import { handlers } from "@/auth";
import { protectMutation } from "@/lib/request-security";

export const GET = handlers.GET;

export async function POST(request) {
  const error = protectMutation(request, {
    scope: "authentication",
    limit: 60,
  });
  if (error) return error;
  return handlers.POST(request);
}
