import type { ProductRecord, WarehouseMap } from "@/lib/warehouse-types";

const sampleRows = [
  ["入口", "", "A-01", "A-02", "A-03", "", "B-01", "B-02", "B-03"],
  ["", "", "A-04", "A-05", "A-06", "", "B-04", "B-05", "B-06"],
  ["通路", "通路", "通路", "通路", "通路", "通路", "通路", "通路", "通路"],
  ["", "", "C-01", "C-02", "C-03", "", "D-01", "D-02", "D-03"],
  ["出荷場", "", "C-04", "C-05", "C-06", "", "D-04", "D-05", "D-06"]
];

export const sampleWarehouseMap: WarehouseMap = {
  id: "sample-map",
  name: "サンプル倉庫マップ",
  rows: sampleRows.map((row, rowIndex) =>
    row.map((label, columnIndex) => {
      const trimmedLabel = label.trim();
      const isShelf = /^[A-Z]-\d{2}$/.test(trimmedLabel);

      return {
        id: `sample-${rowIndex}-${columnIndex}`,
        rowIndex,
        columnIndex,
        label: trimmedLabel,
        shelfNumber: isShelf ? trimmedLabel : null
      };
    })
  )
};

export const sampleProducts: ProductRecord[] = [
  {
    id: "sample-product-1",
    productName: "高耐久ステンレスボルト M8",
    modelNumber: "BT-M8-SS",
    shelfNumber: "A-02",
    keywords: ["ボルト", "ステンレス", "M8"]
  },
  {
    id: "sample-product-2",
    productName: "防水コネクタ 12ピン",
    modelNumber: "CN-WP12",
    shelfNumber: "B-05",
    keywords: ["コネクタ", "防水", "12ピン"]
  },
  {
    id: "sample-product-3",
    productName: "制御盤用リレー 24V",
    modelNumber: "RY-24V-A",
    shelfNumber: "C-03",
    keywords: ["リレー", "24V", "制御盤"]
  },
  {
    id: "sample-product-4",
    productName: "樹脂スペーサー 10mm",
    modelNumber: "SP-R10",
    shelfNumber: "D-04",
    keywords: ["スペーサー", "樹脂", "10mm"]
  }
];
