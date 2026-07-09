import { NextResponse } from "next/server";
import { supabaseRequest } from "@/lib/server/supabase-rest";

type RequestStatus = "pending" | "completed";

type RepickRequestPatchBody = {
  status?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as RepickRequestPatchBody;

  if (!isRequestStatus(body.status)) {
    return NextResponse.json(
      { ok: false, errorMessage: "更新する状態が正しくありません。" },
      { status: 400 }
    );
  }

  try {
    await supabaseRequest<null>(`repick_requests?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        status: body.status,
        updated_at: new Date().toISOString()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, errorMessage: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await supabaseRequest<null>(`repick_requests?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, errorMessage: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

function isRequestStatus(value: unknown): value is RequestStatus {
  return value === "pending" || value === "completed";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "再ピック依頼の更新中にエラーが発生しました。";
}
