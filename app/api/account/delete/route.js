import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AccountDeletionError,
  eraseAccount,
} from "@/lib/account-deletion";
import { readProtectedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in required" },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const { body, error } = await readProtectedJson(request, {
    scope: "account-deletion",
    limit: 5,
    windowMs: 60 * 60 * 1000,
    maxBytes: 2_048,
  });
  if (error) return error;

  try {
    const result = await eraseAccount({
      userId,
      email: body.email,
      confirmation: body.confirmation,
      acknowledgeDataLoss: body.acknowledgeDataLoss,
    });

    return NextResponse.json(
      {
        deleted: true,
        fileCleanupPending: result.pendingFileCleanup > 0,
      },
      {
        status: result.pendingFileCleanup > 0 ? 202 : 200,
        headers: PRIVATE_HEADERS,
      },
    );
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: PRIVATE_HEADERS },
      );
    }

    return NextResponse.json(
      { error: "Account deletion could not be completed safely." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
