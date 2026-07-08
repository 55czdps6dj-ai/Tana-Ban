"use client";

import {
  AlertTriangle,
  Check,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { importProductsFromExcel } from "@/lib/excel-import";
import { formatShelfDescription } from "@/lib/shelf-label";
import type { ProductRecord } from "@/lib/warehouse-types";
import { selectFilteredProducts, useWarehouseStore } from "@/stores/warehouse-store";

type RequestStatus = "pending" | "completed";
type ActiveTab = "search" | "pending" | "completed";

type RepickRequest = {
  id: string;
  itemNumber: string;
  productName: string;
  modelNumber: string;
  shelfNumber: string;
  quantity: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

const repickStorageKey = "tana-ban-repick-requests";
const legacyReplenishmentStorageKey = "tana-ban-replenishment-requests";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("search");
  const [requestQuantities, setRequestQuantities] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<RepickRequest[]>([]);
  const productInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(
    () => (hasSearched && query.trim().length > 0 ? selectFilteredProducts(products, query) : []),
    [hasSearched, products, query]
  );
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );
  const completedRequests = useMemo(
    () => requests.filter((request) => request.status === "completed"),
    [requests]
  );

  useEffect(() => {
    const rawRequests =
      window.localStorage.getItem(repickStorageKey) ??
      window.localStorage.getItem(legacyReplenishmentStorageKey);

    if (!rawRequests) {
      return;
    }

    try {
      const parsedRequests = JSON.parse(rawRequests);

      if (Array.isArray(parsedRequests)) {
        setRequests(parsedRequests);
      }
    } catch {
      window.localStorage.removeItem(repickStorageKey);
      window.localStorage.removeItem(legacyReplenishmentStorageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(repickStorageKey, JSON.stringify(requests));
  }, [requests]);

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
      setIsSettingsOpen(false);
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
    setActiveTab("search");
  };

  const handleResetSampleData = () => {
    resetSampleData();
    setSearchInput("");
    setHasSearched(false);
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const nextQuantity = Number.parseInt(value, 10);

    setRequestQuantities((current) => ({
      ...current,
      [productId]: Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1
    }));
  };

  const handleAddRequest = (product: ProductRecord) => {
    const quantity = requestQuantities[product.id] ?? 1;
    const now = new Date().toISOString();

    setRequests((current) => {
      const existingIndex = current.findIndex(
        (request) =>
          request.status === "pending" &&
          request.itemNumber === product.itemNumber &&
          request.shelfNumber === product.shelfNumber
      );

      if (existingIndex >= 0) {
        return current.map((request, index) =>
          index === existingIndex
            ? {
                ...request,
                quantity: request.quantity + quantity,
                updatedAt: now
              }
            : request
        );
      }

      return [
        {
          id: `${product.id}-${now}`,
          itemNumber: product.itemNumber,
          productName: product.productName,
          modelNumber: product.modelNumber,
          shelfNumber: product.shelfNumber,
          quantity,
          status: "pending",
          createdAt: now,
          updatedAt: now
        },
        ...current
      ];
    });
    setActiveTab("pending");
  };

  const handleStatusChange = (requestId: string, status: RequestStatus) => {
    const now = new Date().toISOString();

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status,
              updatedAt: now
            }
          : request
      )
    );
  };

  const handleDeleteRequest = (requestId: string) => {
    setRequests((current) => current.filter((request) => request.id !== requestId));
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
            className="iconButton"
            type="button"
            onClick={handleResetSampleData}
            title="サンプルに戻す"
            aria-label="サンプルに戻す"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <button
            className="iconButton"
            type="button"
            onClick={() => setIsSettingsOpen((current) => !current)}
            title="設定"
            aria-label="設定"
            aria-expanded={isSettingsOpen}
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      {isSettingsOpen ? (
        <section className="settingsPanel" aria-label="設定">
          <div>
            <h2>設定</h2>
            <p>商品マスタを更新する時だけここからExcelを読み込みます。</p>
          </div>
          <button
            className="secondaryButton"
            type="button"
            onClick={() => productInputRef.current?.click()}
            disabled={isImporting}
            title="商品マスタExcelを取り込む"
          >
            <Upload size={18} aria-hidden="true" />
            商品マスタExcel
          </button>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="errorBanner" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <nav className="tabBar" aria-label="画面切り替え">
        <button
          className={activeTab === "search" ? "activeTab" : ""}
          type="button"
          onClick={() => setActiveTab("search")}
        >
          検索
        </button>
        <button
          className={activeTab === "pending" ? "activeTab" : ""}
          type="button"
          onClick={() => setActiveTab("pending")}
        >
          再ピック依頼
          <span>{pendingRequests.length}</span>
        </button>
        <button
          className={activeTab === "completed" ? "activeTab" : ""}
          type="button"
          onClick={() => setActiveTab("completed")}
        >
          対応済み
          <span>{completedRequests.length}</span>
        </button>
      </nav>

      {activeTab === "search" ? (
        <>
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
                placeholder="単品番号・商品名・型番・棚番号を入力"
                aria-label="単品番号、商品名、型番、棚番号で検索"
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

          <section className="workspace searchOnlyWorkspace">
            <aside className="resultPane searchOnlyResultPane" aria-label="検索結果">
              <div className="paneHeader">
                <div>
                  <h2>検索結果</h2>
                  <p>
                    {hasSearched ? `${filteredProducts.length} 件` : "検索ボタンを押すまで非表示"}
                  </p>
                </div>
              </div>

              <div className="resultList">
                {!hasSearched ? (
                  <div className="emptyState">キーワードを入力して虫眼鏡ボタンを押してください。</div>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div key={product.id} className="resultItem">
                      <span className="resultShelf">{product.shelfNumber}</span>
                      <span className="resultText">
                        <strong>{product.productName || "商品名未設定"}</strong>
                        <small>単品番号: {product.itemNumber || "未設定"}</small>
                        <small>{product.modelNumber || "型番未設定"}</small>
                        <small>{formatShelfDescription(product.shelfNumber)}</small>
                      </span>
                      <div className="resultActions">
                        <label>
                          数量
                          <input
                            min={1}
                            type="number"
                            value={requestQuantities[product.id] ?? 1}
                            onChange={(event) =>
                              handleQuantityChange(product.id, event.target.value)
                            }
                          />
                        </label>
                        <button
                          className="requestButton"
                          type="button"
                          onClick={() => handleAddRequest(product)}
                        >
                          <Plus size={16} aria-hidden="true" />
                          再ピック依頼
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="emptyState">該当する商品がありません。</div>
                )}
              </div>
            </aside>
          </section>
        </>
      ) : null}

      {activeTab === "pending" ? (
        <section className="requestPanel" aria-label="再ピック依頼リスト">
          <RequestList
            emptyMessage="未対応の再ピック依頼はありません。"
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            requests={pendingRequests}
            title="再ピック依頼"
          />
        </section>
      ) : null}

      {activeTab === "completed" ? (
        <section className="requestPanel" aria-label="対応済みリスト">
          <RequestList
            emptyMessage="対応済みの再ピック依頼はありません。"
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            requests={completedRequests}
            title="対応済み"
          />
        </section>
      ) : null}
    </main>
  );
}

function RequestList({
  emptyMessage,
  onDelete,
  onStatusChange,
  requests,
  title
}: {
  emptyMessage: string;
  onDelete: (requestId: string) => void;
  onStatusChange: (requestId: string, status: RequestStatus) => void;
  requests: RepickRequest[];
  title: string;
}) {
  return (
    <div className="requestGroup">
      <h3>{title}</h3>
      {requests.length > 0 ? (
        <div className="requestList">
          {requests.map((request) => (
            <div className="requestItem" key={request.id}>
              <span className={`statusBadge ${request.status}`}>
                {request.status === "pending" ? "未対応" : "対応済み"}
              </span>
              <div className="requestBody">
                <strong>{request.productName || "商品名未設定"}</strong>
                <small>単品番号: {request.itemNumber || "未設定"}</small>
                <small>
                  棚: {request.shelfNumber} / {formatShelfDescription(request.shelfNumber)}
                </small>
                <small>数量: {request.quantity}</small>
              </div>
              <div className="requestControls">
                {request.status === "pending" ? (
                  <button
                    className="statusButton"
                    type="button"
                    onClick={() => onStatusChange(request.id, "completed")}
                  >
                    <Check size={16} aria-hidden="true" />
                    対応済み
                  </button>
                ) : (
                  <button
                    className="statusButton"
                    type="button"
                    onClick={() => onStatusChange(request.id, "pending")}
                  >
                    未対応へ戻す
                  </button>
                )}
                <button
                  className="deleteButton"
                  type="button"
                  onClick={() => onDelete(request.id)}
                  title="削除"
                  aria-label="削除"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="compactEmptyState">{emptyMessage}</div>
      )}
    </div>
  );
}
