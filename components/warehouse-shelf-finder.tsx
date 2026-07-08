"use client";

import {
  AlertTriangle,
  RotateCcw,
  Search,
  Upload
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { importProductsFromExcel } from "@/lib/excel-import";
import { formatShelfDescription } from "@/lib/shelf-label";
import { selectFilteredProducts, useWarehouseStore } from "@/stores/warehouse-store";

export function WarehouseShelfFinder() {
  const {
    query,
    products,
    productSourceName,
    errorMessage,
    setQuery,
    setSelectedShelfNumber,
    setProducts,
    setErrorMessage,
    resetSampleData
  } = useWarehouseStore();
  const [isImporting, setIsImporting] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [hasSearched, setHasSearched] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(
    () => (hasSearched && query.trim().length > 0 ? selectFilteredProducts(products, query) : []),
    [hasSearched, products, query]
  );

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

  return (
    <main className="shell">
      <section className="toolbar" aria-label="検索と取り込み">
        <div className="titleBlock">
          <div>
            <h1>棚入れ検索</h1>
            <p>商品名・型番・棚番号で検索し、棚位置をすばやく確認します。</p>
          </div>
        </div>

        <div className="actions">
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

      <section className="searchPanel focusedSearchPanel" aria-label="商品検索">
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
            placeholder="商品名・型番・棚番号を入力"
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
          <span>商品: {productSourceName}</span>
          <span>登録商品: {products.length} 件</span>
        </div>
      </section>

      {errorMessage ? (
        <div className="errorBanner" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <section className="workspace searchOnlyWorkspace">
        <aside className="resultPane searchOnlyResultPane" aria-label="検索結果">
          <div className="paneHeader">
            <div>
              <h2>検索結果</h2>
              <p>{hasSearched ? `${filteredProducts.length} 件` : "検索ボタンを押すまで非表示"}</p>
            </div>
          </div>

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
