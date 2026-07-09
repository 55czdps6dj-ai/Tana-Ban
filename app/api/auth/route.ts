import { NextResponse } from "next/server";
import { hasSharedPasswordConfig, verifySharedPassword } from "@/lib/server/supabase-rest";

export async function POST(request: Request) {
  if (!hasSharedPasswordConfig()) {
    return NextResponse.json(
      {
        ok: false,
        errorMessage:
          "サーバーにAPP_SHARED_PASSWORDが設定されていません。VercelのProduction環境変数を確認してください。"
      },
      { status: 500 }
    );
  }

  if (!verifySharedPassword(request)) {
    return NextResponse.json(
      { ok: false, errorMessage: "パスワードが違います。" },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
