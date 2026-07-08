export type ProductRecord = {
  id: string;
  itemNumber: string;
  productCategory: string;
  productName: string;
  modelNumber: string;
  shelfNumber: string;
  keywords: string[];
};

export type WarehouseCell = {
  id: string;
  rowIndex: number;
  columnIndex: number;
  label: string;
  shelfNumber: string | null;
};

export type WarehouseMap = {
  id: string;
  name: string;
  rows: WarehouseCell[][];
};

export type ImportResult<T> =
  | {
      ok: true;
      value: T;
      sourceName: string;
    }
  | {
      ok: false;
      errorMessage: string;
      sourceName: string;
    };
