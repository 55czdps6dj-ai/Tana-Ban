"use client";

import {
  AlertTriangle,
  FileSpreadsheet,
  LocateFixed,
  RotateCcw,
  Search,
  Upload
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  importProductsFromExcel,
  importWarehouseMapFromExcel,
  normalizeShelfNumber
} from "@/lib/excel-import";
import { formatShelfDescription } from "@/lib/shelf-label";
import type { ProductRecord, WarehouseCell } from "@/lib/warehouse-types";
import {
  selectFilteredProducts,
  selectMatchedShelfNumbers,
  useWarehouseStore
} from "@/stores/warehouse-store";

export function WarehouseShelfFinder() {
  const {
    query,
    selectedShelfNumber,
    warehouseMap,
    products,
    mapSourceName,
    productSourceName,
    errorMessage,
    setQuery,
    setSelectedShelfNumber,
    setWarehouseMap,
    setProducts,
    setErrorMessage,
    resetSampleData
  } = useWarehouseStore();
  const [isImporting, setIsImporting] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [hasSearched, setHasSearched] = useState(false);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(
    () => (hasSearched && query.trim().length > 0 ? selectFilteredProducts(products, query) : []),
    [hasSearched, products, query]
  );
  const highlightedShelves = useMemo(
    () => selectMatchedShelfNumbers(filteredProducts, selectedShelfNumber),
    [filteredProducts, selectedShelfNumber]
  );
  const totalShelfCount = useMemo(() => {
    const shelfNumbers = new Set<string>();

    warehouseMap.rows.forEach((row) => {
      row.forEach((cell) => {
        if (cell.shelfNumber) {
          shelfNumbers.add(cell.shelfNumber);
        }
      });
    });

    return shelfNumbers.size;
  }, [warehouseMap.rows]);

  const handleMapImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImporting(true);
    const result = await importWarehouseMapFromExcel(file);
    setIsImporting(false);

    if (result.ok) {
      setWarehouseMap(result.value, result.sourceName);
      setHasSearched(false);
    } else {
      setErrorMessage(result.errorMessage);
    }

    event.target.value = "";
  };

  const handleProductImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImporting(true);
    const result = await importProductsFromExcel(file);
    setIsImporting(false);

    if (result.ok) {
      setProducts(result.value, result.sourceName);
      setQuery("");
      setSearchInput("");
      setHasSearched(false);
    } else {
      setErrorMessage(result.errorMessage);
    }

    event.target.value = "";
  };

  const handleShelfClick = (cell: WarehouseCell) => {
    if (!cell.shelfNumber) {
      return;
    }

    const normalizedShelfNumber = normalizeShelfNumber(cell.shelfNumber);
    setSelectedShelfNumber(
      selectedShelfNumber === normalizedShelfNumber ? null : normalizedShelfNumber
    );
  };

  const handleSearch = () => {
    const trimmedQuery = searchInput.trim();

    setQuery(trimmedQuery);
    setSelectedShelfNumber(null);
    setHasSearched(trimmedQuery.length > 0);
  };

  const handleResetSampleData = () => {
    resetSampleData();
    setSearchInput("");
    setHasSearched(false);
  };

  const selectedShelfProducts = selectedShelfNumber
    ? products.filter((product) => product.shelfNumber === selectedShelfNumber)
    : [];

  return (
    <main className="shell">
      <section className="toolbar" aria-label="検索と取り込み">
        <div className="titleBlock">
          <div className="appMark">
            <LocateFixed size={24} aria-hidden="true" />
          </div>
          <div>
            <h1>棚入れ検索</h1>
            <p>商品名・型番・棚番号で検索し、倉庫マップ上の棚をハイライトします。</p>
          </div>
        </div>

        <div className="actions">
          <input
            ref={mapInputRef}
            className="visuallyHidden"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleMapImport}
          />
          <input
            ref={productInputRef}
            className="visuallyHidden"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleProductImport}
          />
          <button
            className="secondaryButton"
            type="button"
            onClick={() => mapInputRef.current?.click()}
            disabled={isImporting}
            title="倉庫マップExcelを取り込む"
          >
            <FileSpreadsheet size={18} aria-hidden="true" />
            地図Excel
          </button>
          <button
            className="secondaryButton"
            type="button"
            onClick={() => productInputRef.current?.click()}
            disabled={isImporting}
            title="商品Excelを取り込む"
          >
            <Upload size={18} aria-hidden="true" />
            商品Excel
          </button>
          <button
            className="iconButton"
            type="button"
            onClick={handleResetSampleData}
            title="サンプルに戻す"
            aria-label="サンプルに戻す"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="searchPanel" aria-label="商品検索">
        <form
          className="searchBox"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setHasSearched(false);
              setSelectedShelfNumber(null);
            }}
            placeholder="例: ボルト、BT-M8、A-02"
            aria-label="商品名、型番、棚番号で検索"
          />
          <button
            className="searchButton"
            type="submit"
            title="検索する"
            aria-label="検索する"
          >
            <Search size={20} aria-hidden="true" />
          </button>
        </form>
        <div className="dataStatus" aria-label="取り込み状況">
          <span>地図: {mapSourceName}</span>
          <span>商品: {productSourceName}</span>
        </div>
      </section>

      {errorMessage ? (
        <div className="errorBanner" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <section className="workspace">
        <div className="mapPane" aria-label="倉庫マップ">
          <div className="paneHeader">
            <div>
              <h2>倉庫マップ</h2>
              <p>
                棚数 {totalShelfCount}
                {hasSearched ? ` / 該当 ${highlightedShelves.size}` : ""}
              </p>
            </div>
            {selectedShelfNumber ? (
              <button
                className="secondaryButton compact"
                type="button"
                onClick={() => setSelectedShelfNumber(null)}
              >
                選択解除
              </button>
            ) : null}
          </div>

          <div
            className="warehouseGrid"
            style={{
              gridTemplateColumns: `repeat(${warehouseMap.rows[0]?.length ?? 1}, minmax(54px, 1fr))`
            }}
          >
            {warehouseMap.rows.flatMap((row) =>
              row.map((cell) => {
                const isShelf = Boolean(cell.shelfNumber);
                const isHighlighted = cell.shelfNumber
                  ? highlightedShelves.has(cell.shelfNumber)
                  : false;
                const isSelected = selectedShelfNumber === cell.shelfNumber;

                return (
                  <button
                    key={cell.id}
                    className={[
                      "mapCell",
                      isShelf ? "shelfCell" : "noteCell",
                      isHighlighted || isSelected ? "highlightCell" : ""
                    ].join(" ")}
                    type="button"
                    onClick={() => handleShelfClick(cell)}
                    disabled={!isShelf}
                    title={cell.label || "空白セル"}
                    aria-label={cell.label ? `${cell.label}の棚` : "空白セル"}
                  >
                    {cell.label}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <aside className="resultPane" aria-label="検索結果">
          <div className="paneHeader">
            <div>
              <h2>検索結果</h2>
              <p>{hasSearched ? `${filteredProducts.length} 件` : "検索ボタンを押すまで非表示"}</p>
            </div>
          </div>

          {selectedShelfNumber ? (
            <ShelfDetail shelfNumber={selectedShelfNumber} products={selectedShelfProducts} />
          ) : null}

          <div className="resultList">
            {!hasSearched ? (
              <div className="emptyState">キーワードを入力して虫眼鏡ボタンを押してください。</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  className="resultItem"
                  type="button"
                  onClick={() => setSelectedShelfNumber(product.shelfNumber)}
                >
                  <span className="resultShelf">{product.shelfNumber}</span>
                  <span className="resultText">
                    <strong>{product.productName || "商品名未設定"}</strong>
                    <small>{product.modelNumber || "型番未設定"}</small>
                    <small>{formatShelfDescription(product.shelfNumber)}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className="emptyState">該当する商品がありません。</div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function ShelfDetail({
  shelfNumber,
  products
}: {
  shelfNumber: string;
  products: ProductRecord[];
}) {
  return (
    <div className="shelfDetail">
      <span className="detailLabel">選択中の棚</span>
      <strong>{shelfNumber}</strong>
      <span className="shelfDescription">{formatShelfDescription(shelfNumber)}</span>
      <span>{products.length} 商品</span>
    </div>
  );
}
