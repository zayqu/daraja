import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAccountDataExport } from "@/lib/account-data-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required" },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }

  const data = await buildAccountDataExport(userId);
  if (!data) {
    return NextResponse.json(
      { error: "Account not found" },
      {
        status: 404,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }

  const body = `${JSON.stringify(data, null, 2)}\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": 'attachment; filename="daraja-account-data.json"',
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
