import { NextResponse } from "next/server";
import type { ProductRecord } from "@/lib/warehouse-types";
import { getSupabaseConfig, supabaseRequest } from "@/lib/server/supabase-rest";

type ProductRow = {
  id: string;
  item_number: string;
  product_category: string;
  product_name: string;
  model_number: string;
  shelf_number: string;
  keywords: string[];
  source_name: string;
};

type ProductPostBody = {
  sourceName?: unknown;
  products?: unknown;
};

export async function GET() {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return NextResponse.json({
      ok: false,
      errorMessage: `Supabase設定が不足しています: ${config.missingKeys.join(", ")}`
    });
  }

  try {
    const rows = await supabaseRequest<ProductRow[]>(
      "products?select=*&order=product_name.asc.nullslast"
    );
    const sourceName = rows.find((row) => row.source_name)?.source_name ?? "オンライン商品マスタ";

    return NextResponse.json({
      ok: true,
      sourceName,
      products: rows.map(toProductRecord)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, errorMessage: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductPostBody;

    if (typeof body.sourceName !== "string" || !Array.isArray(body.products)) {
      return NextResponse.json(
        { ok: false, errorMessage: "商品マスタの送信形式が正しくありません。" },
        { status: 400 }
      );
    }

    const products = body.products.filter(isProductRecord);

    if (products.length === 0) {
      return NextResponse.json(
        { ok: false, errorMessage: "保存できる商品データがありません。" },
        { status: 400 }
      );
    }

    await supabaseRequest<null>("products?id=not.is.null", {
      method: "DELETE"
    });
    await supabaseRequest<ProductRow[]>("products", {
      method: "POST",
      prefer: "return=minimal",
      body: products.map((product) => toProductRow(product, body.sourceName as string))
    });

    return NextResponse.json({
      ok: true,
      sourceName: body.sourceName,
      products
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, errorMessage: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

function toProductRecord(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    itemNumber: row.item_number,
    productCategory: row.product_category,
    productName: row.product_name,
    modelNumber: row.model_number,
    shelfNumber: row.shelf_number,
    keywords: Array.isArray(row.keywords) ? row.keywords : []
  };
}

function toProductRow(product: ProductRecord, sourceName: string): ProductRow {
  return {
    id: product.id,
    item_number: product.itemNumber,
    product_category: product.productCategory,
    product_name: product.productName,
    model_number: product.modelNumber,
    shelf_number: product.shelfNumber,
    keywords: product.keywords,
    source_name: sourceName
  };
}

function isProductRecord(value: unknown): value is ProductRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const product = value as Partial<ProductRecord>;

  return (
    typeof product.id === "string" &&
    typeof product.itemNumber === "string" &&
    typeof product.productCategory === "string" &&
    typeof product.productName === "string" &&
    typeof product.modelNumber === "string" &&
    typeof product.shelfNumber === "string" &&
    Array.isArray(product.keywords) &&
    product.keywords.every((keyword) => typeof keyword === "string")
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "商品マスタのオンライン保存中にエラーが発生しました。";
}
