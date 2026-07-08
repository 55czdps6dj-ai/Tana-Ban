import { NextResponse } from "next/server";
import { supabaseRequest, verifySharedPassword } from "@/lib/server/supabase-rest";

type RequestStatus = "pending" | "completed";
type PackagingCategory = "一般" | "簡易" | "完全" | "抱き合せ";

type RepickRequest = {
  id: string;
  itemNumber: string;
  productCategory: string;
  productName: string;
  modelNumber: string;
  shelfNumber: string;
  packagingCategory: PackagingCategory;
  quantity: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

type RepickRequestRow = {
  id: string;
  item_number: string;
  product_category: string;
  product_name: string;
  model_number: string;
  shelf_number: string;
  packaging_category: PackagingCategory;
  quantity: number;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
};

type RepickRequestPostBody = {
  items?: unknown;
};

export async function GET(request: Request) {
  if (!verifySharedPassword(request)) {
    return NextResponse.json(
      { ok: false, errorMessage: "パスワードが違います。" },
      { status: 401 }
    );
  }

  try {
    const rows = await supabaseRequest<RepickRequestRow[]>(
      "repick_requests?select=*&order=updated_at.desc"
    );

    return NextResponse.json({
      ok: true,
      requests: rows.map(toRepickRequest)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, errorMessage: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!verifySharedPassword(request)) {
    return NextResponse.json(
      { ok: false, errorMessage: "パスワードが違います。" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as RepickRequestPostBody;

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { ok: false, errorMessage: "再ピック依頼の送信形式が正しくありません。" },
        { status: 400 }
      );
    }

    const items = body.items.filter(isWritableRepickRequest);

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, errorMessage: "保存できる再ピック依頼がありません。" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    for (const item of items) {
      const existingRows = await supabaseRequest<RepickRequestRow[]>(
        [
          "repick_requests?select=*",
          "status=eq.pending",
          `item_number=eq.${encodeURIComponent(item.itemNumber)}`,
          `shelf_number=eq.${encodeURIComponent(item.shelfNumber)}`,
          `packaging_category=eq.${encodeURIComponent(item.packagingCategory)}`,
          "limit=1"
        ].join("&")
      );
      const existingRow = existingRows[0];

      if (existingRow) {
        await supabaseRequest<RepickRequestRow[]>(
          `repick_requests?id=eq.${encodeURIComponent(existingRow.id)}`,
          {
            method: "PATCH",
            prefer: "return=minimal",
            body: {
              quantity: existingRow.quantity + item.quantity,
              updated_at: now
            }
          }
        );
        continue;
      }

      await supabaseRequest<RepickRequestRow[]>("repick_requests", {
        method: "POST",
        prefer: "return=minimal",
        body: toRepickRequestRow({
          ...item,
          id: item.id,
          status: "pending",
          createdAt: now,
          updatedAt: now
        })
      });
    }

    const rows = await supabaseRequest<RepickRequestRow[]>(
      "repick_requests?select=*&order=updated_at.desc"
    );

    return NextResponse.json({
      ok: true,
      requests: rows.map(toRepickRequest)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, errorMessage: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

function toRepickRequest(row: RepickRequestRow): RepickRequest {
  return {
    id: row.id,
    itemNumber: row.item_number,
    productCategory: row.product_category,
    productName: row.product_name,
    modelNumber: row.model_number,
    shelfNumber: row.shelf_number,
    packagingCategory: row.packaging_category,
    quantity: row.quantity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRepickRequestRow(request: RepickRequest): RepickRequestRow {
  return {
    id: request.id,
    item_number: request.itemNumber,
    product_category: request.productCategory,
    product_name: request.productName,
    model_number: request.modelNumber,
    shelf_number: request.shelfNumber,
    packaging_category: request.packagingCategory,
    quantity: request.quantity,
    status: request.status,
    created_at: request.createdAt,
    updated_at: request.updatedAt
  };
}

function isWritableRepickRequest(value: unknown): value is RepickRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<RepickRequest>;

  return (
    typeof request.id === "string" &&
    typeof request.itemNumber === "string" &&
    typeof request.productCategory === "string" &&
    typeof request.productName === "string" &&
    typeof request.modelNumber === "string" &&
    typeof request.shelfNumber === "string" &&
    isPackagingCategory(request.packagingCategory) &&
    typeof request.quantity === "number" &&
    request.quantity > 0
  );
}

function isPackagingCategory(value: unknown): value is PackagingCategory {
  return ["一般", "簡易", "完全", "抱き合せ"].some((option) => option === value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "再ピック依頼のオンライン保存中にエラーが発生しました。";
}
