import * as XLSX from "xlsx";
import type { ImportResult, ProductRecord, WarehouseMap } from "@/lib/warehouse-types";

type SheetRow = Record<string, unknown>;

const productNameHeaders = ["商品名", "品名", "productName", "product_name", "name"];
const modelNumberHeaders = ["型番", "方番号", "品番", "modelNumber", "model_number", "sku"];
const shelfNumberHeaders = ["棚番号", "棚番", "棚", "shelfNumber", "shelf_number", "location"];
const keywordHeaders = ["キーワード", "検索語", "keywords", "keyword", "備考"];

export async function importWarehouseMapFromExcel(file: File): Promise<ImportResult<WarehouseMap>> {
  try {
    const workbook = await readWorkbook(file);
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return {
        ok: false,
        sourceName: file.name,
        errorMessage: "Excel内にシートがありません。"
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: ""
    });

    const rows = rawRows
      .map((row) => row.map((cell) => String(cell ?? "").trim()))
      .filter((row) => row.some((cell) => cell.length > 0));

    if (rows.length === 0) {
      return {
        ok: false,
        sourceName: file.name,
        errorMessage: "地図シートに読み取れるセルがありません。"
      };
    }

    const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);

    return {
      ok: true,
      sourceName: file.name,
      value: {
        id: `map-${Date.now()}`,
        name: firstSheetName,
        rows: rows.map((row, rowIndex) =>
          Array.from({ length: maxColumns }, (_, columnIndex) => {
            const label = row[columnIndex] ?? "";
            const normalizedLabel = normalizeShelfNumber(label);

            return {
              id: `cell-${rowIndex}-${columnIndex}`,
              rowIndex,
              columnIndex,
              label,
              shelfNumber: normalizedLabel.length > 0 ? normalizedLabel : null
            };
          })
        )
      }
    };
  } catch (error) {
    return {
      ok: false,
      sourceName: file.name,
      errorMessage: getErrorMessage(error)
    };
  }
}

export async function importProductsFromExcel(file: File): Promise<ImportResult<ProductRecord[]>> {
  try {
    const workbook = await readWorkbook(file);
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return {
        ok: false,
        sourceName: file.name,
        errorMessage: "Excel内にシートがありません。"
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
      defval: ""
    });

    if (rows.length === 0) {
      return {
        ok: false,
        sourceName: file.name,
        errorMessage: "商品データを読み取れませんでした。1行目に見出しを入れてください。"
      };
    }

    const products = rows
      .map((row, index) => toProductRecord(row, index))
      .filter((product): product is ProductRecord => product !== null);

    if (products.length === 0) {
      return {
        ok: false,
        sourceName: file.name,
        errorMessage: "商品名・型番・棚番号の列を確認してください。対応列名: 商品名、型番、棚番号。"
      };
    }

    return {
      ok: true,
      sourceName: file.name,
      value: products
    };
  } catch (error) {
    return {
      ok: false,
      sourceName: file.name,
      errorMessage: getErrorMessage(error)
    };
  }
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeShelfNumber(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase();
}

function toProductRecord(row: SheetRow, index: number): ProductRecord | null {
  const productName = readStringValue(row, productNameHeaders);
  const modelNumber = readStringValue(row, modelNumberHeaders);
  const shelfNumber = normalizeShelfNumber(readStringValue(row, shelfNumberHeaders));
  const rawKeywords = readStringValue(row, keywordHeaders);

  if (!productName && !modelNumber && !shelfNumber) {
    return null;
  }

  if (!shelfNumber) {
    return null;
  }

  const keywords = rawKeywords
    .split(/[,\s、，]+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  return {
    id: `product-${Date.now()}-${index}`,
    productName,
    modelNumber,
    shelfNumber,
    keywords
  };
}

function readStringValue(row: SheetRow, candidates: string[]): string {
  const entries = Object.entries(row);
  const match = entries.find(([key]) =>
    candidates.some((candidate) => normalizeHeader(key) === normalizeHeader(candidate))
  );

  return String(match?.[1] ?? "").trim();
}

function normalizeHeader(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s_-]/g, "");
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, {
    type: "array",
    cellDates: false
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Excelファイルの読み込み中に不明なエラーが発生しました。";
}
