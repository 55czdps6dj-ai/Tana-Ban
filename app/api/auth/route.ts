import { NextResponse } from "next/server";
import { verifySharedPassword } from "@/lib/server/supabase-rest";

export async function POST(request: Request) {
  if (!verifySharedPassword(request)) {
    return NextResponse.json(
      { ok: false, errorMessage: "パスワードが違います。" },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
