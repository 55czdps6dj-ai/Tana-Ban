"use client";

import { create } from "zustand";
import { normalizeSearchText, normalizeShelfNumber } from "@/lib/excel-import";
import { sampleProducts, sampleWarehouseMap } from "@/lib/sample-data";
import type { ProductRecord, WarehouseMap } from "@/lib/warehouse-types";

type WarehouseState = {
  query: string;
  selectedShelfNumber: string | null;
  warehouseMap: WarehouseMap;
  products: ProductRecord[];
  mapSourceName: string;
  productSourceName: string;
  errorMessage: string | null;
  setQuery: (query: string) => void;
  setSelectedShelfNumber: (shelfNumber: string | null) => void;
  setWarehouseMap: (warehouseMap: WarehouseMap, sourceName: string) => void;
  setProducts: (products: ProductRecord[], sourceName: string) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  hydrateStoredProducts: () => void;
  resetSampleData: () => void;
};

type StoredProductData = {
  version: 1;
  sourceName: string;
  products: ProductRecord[];
};

const productStorageKey = "tana-ban-product-master";

export const useWarehouseStore = create<WarehouseState>((set) => ({
  query: "",
  selectedShelfNumber: null,
  warehouseMap: sampleWarehouseMap,
  products: sampleProducts,
  mapSourceName: "サンプル地図",
  productSourceName: "サンプル商品",
  errorMessage: null,
  setQuery: (query) => set({ query }),
  setSelectedShelfNumber: (selectedShelfNumber) => set({ selectedShelfNumber }),
  setWarehouseMap: (warehouseMap, sourceName) =>
    set({
      warehouseMap,
      mapSourceName: sourceName,
      selectedShelfNumber: null,
      errorMessage: null
    }),
  setProducts: (products, sourceName) => {
    saveStoredProductData(products, sourceName);
    set({
      products,
      productSourceName: sourceName,
      selectedShelfNumber: null,
      errorMessage: null
    });
  },
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  hydrateStoredProducts: () => {
    const storedProductData = loadStoredProductData();

    if (storedProductData.productSourceName === "サンプル商品") {
      return;
    }

    set({
      products: storedProductData.products,
      productSourceName: storedProductData.productSourceName,
      selectedShelfNumber: null,
      errorMessage: null
    });
  },
  resetSampleData: () => {
    clearStoredProductData();
    set({
      query: "",
      selectedShelfNumber: null,
      warehouseMap: sampleWarehouseMap,
      products: sampleProducts,
      mapSourceName: "サンプル地図",
      productSourceName: "サンプル商品",
      errorMessage: null
    });
  }
}));

function loadStoredProductData(): Pick<WarehouseState, "products" | "productSourceName"> {
  if (typeof window === "undefined") {
    return {
      products: sampleProducts,
      productSourceName: "サンプル商品"
    };
  }

  try {
    const rawData = window.localStorage.getItem(productStorageKey);

    if (!rawData) {
      return {
        products: sampleProducts,
        productSourceName: "サンプル商品"
      };
    }

    const parsedData = JSON.parse(rawData) as Partial<StoredProductData>;

    if (
      parsedData.version !== 1 ||
      typeof parsedData.sourceName !== "string" ||
      !Array.isArray(parsedData.products)
    ) {
      window.localStorage.removeItem(productStorageKey);
      return {
        products: sampleProducts,
        productSourceName: "サンプル商品"
      };
    }

    const products = parsedData.products.filter(isProductRecord);

    if (products.length === 0) {
      window.localStorage.removeItem(productStorageKey);
      return {
        products: sampleProducts,
        productSourceName: "サンプル商品"
      };
    }

    return {
      products,
      productSourceName: parsedData.sourceName
    };
  } catch {
    window.localStorage.removeItem(productStorageKey);
    return {
      products: sampleProducts,
      productSourceName: "サンプル商品"
    };
  }
}

function saveStoredProductData(products: ProductRecord[], sourceName: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storedData: StoredProductData = {
      version: 1,
      sourceName,
      products
    };

    window.localStorage.setItem(productStorageKey, JSON.stringify(storedData));
  } catch {
    setTimeout(() => {
      useWarehouseStore.setState({
        errorMessage:
          "商品マスタをブラウザに保存できませんでした。端末の空き容量またはブラウザ設定を確認してください。"
      });
    }, 0);
  }
}

function clearStoredProductData(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(productStorageKey);
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

export function selectFilteredProducts(products: ProductRecord[], query: string): ProductRecord[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => {
    const searchableText = normalizeSearchText(
      [
        product.productName,
        product.itemNumber,
        product.productCategory,
        product.modelNumber,
        product.shelfNumber,
        product.keywords.join(" ")
      ].join(" ")
    );

    return searchableText.includes(normalizedQuery);
  });
}

export function selectMatchedShelfNumbers(
  products: ProductRecord[],
  selectedShelfNumber: string | null
): Set<string> {
  if (selectedShelfNumber) {
    return new Set([normalizeShelfNumber(selectedShelfNumber)]);
  }

  return new Set(products.map((product) => normalizeShelfNumber(product.shelfNumber)));
}
