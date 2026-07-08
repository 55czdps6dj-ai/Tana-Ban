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
    set({
      products,
      productSourceName: sourceName,
      selectedShelfNumber: null,
      errorMessage: null
    });
  },
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  hydrateStoredProducts: () => undefined,
  resetSampleData: () => {
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
