"use client";

import {
  AlertTriangle,
  ShoppingCart,
  Check,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload
} from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { importProductsFromExcel } from "@/lib/excel-import";
import type { ProductRecord } from "@/lib/warehouse-types";
import { selectFilteredProducts, useWarehouseStore } from "@/stores/warehouse-store";

type RequestStatus = "pending" | "completed";
type ActiveTab = "search" | "pending" | "completed";
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

type RepickCartItem = {
  id: string;
  itemNumber: string;
  productCategory: string;
  productName: string;
  modelNumber: string;
  shelfNumber: string;
  packagingCategory: PackagingCategory;
  quantity: number;
};

type ProductsApiResponse =
  | {
      ok: true;
      sourceName: string;
      products: ProductRecord[];
    }
  | {
      ok: false;
      errorMessage: string;
    };

type RepickRequestsApiResponse =
  | {
      ok: true;
      requests: RepickRequest[];
    }
  | {
      ok: false;
      errorMessage: string;
    };

type BasicApiResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      errorMessage: string;
    };

const packagingCategoryOptions: PackagingCategory[] = ["一般", "簡易", "完全", "抱き合せ"];

export function WarehouseShelfFinder() {
  const {
    query,
    products,
    productSourceName,
    errorMessage,
    setQuery,
    setSelectedShelfNumber,
    setProducts,
    setErrorMessage
  } = useWarehouseStore();
  const [isLoadingOnlineData, setIsLoadingOnlineData] = useState(false);
  const [appPassword, setAppPassword] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCartConfirmOpen, setIsCartConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [productPendingCart, setProductPendingCart] = useState<ProductRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("search");
  const [requestQuantities, setRequestQuantities] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<RepickRequest[]>([]);
  const [cartItems, setCartItems] = useState<RepickCartItem[]>([]);
  const [selectedPackagingCategory, setSelectedPackagingCategory] =
    useState<PackagingCategory>("一般");
  const productInputRef = useRef<HTMLInputElement>(null);
  const uploadPasswordRef = useRef("");

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

  const loadOnlineData = useCallback(async () => {
    setIsLoadingOnlineData(true);
    setErrorMessage(null);

    try {
      const [productsResponse, requestsResponse] = await Promise.all([
        apiRequest<ProductsApiResponse>("/api/products", verifiedPassword),
        apiRequest<RepickRequestsApiResponse>("/api/repick-requests", verifiedPassword)
      ]);

      if (productsResponse.ok) {
        setProducts(productsResponse.products, productsResponse.sourceName);
      } else {
        setErrorMessage(productsResponse.errorMessage);
      }

      if (requestsResponse.ok) {
        setRequests(requestsResponse.requests.map(toRepickRequest));
      } else {
        setErrorMessage(requestsResponse.errorMessage);
      }
    } catch (error) {
      setErrorMessage(getClientErrorMessage(error));
    } finally {
      setIsLoadingOnlineData(false);
    }
  }, [setErrorMessage, setProducts, verifiedPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadOnlineData();
    }
  }, [isAuthenticated, loadOnlineData]);

  const handleLogin = async () => {
    const password = appPassword.trim();

    if (!password) {
      setErrorMessage("共通パスワードを入力してください。");
      return;
    }

    setErrorMessage(null);

    try {
      const response = await apiRequest<BasicApiResponse>("/api/auth", password, {
        method: "POST"
      });

      if (!response.ok) {
        setErrorMessage(response.errorMessage);
        return;
      }

      setVerifiedPassword(password);
      setIsAuthenticated(true);
    } catch (error) {
      setErrorMessage(getClientErrorMessage(error));
    }
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
      const response = await apiRequest<ProductsApiResponse>("/api/products", verifiedPassword, {
        method: "POST",
        uploadPassword: uploadPasswordRef.current,
        body: {
          sourceName: result.sourceName,
          products: result.value
        }
      });

      if (!response.ok) {
        setErrorMessage(response.errorMessage);
        event.target.value = "";
        uploadPasswordRef.current = "";
        return;
      }

      setProducts(response.products, response.sourceName);
      setQuery("");
      setSearchInput("");
      setHasSearched(false);
      setIsSettingsOpen(false);
    } else {
      setErrorMessage(result.errorMessage);
    }

    event.target.value = "";
    uploadPasswordRef.current = "";
  };

  const handleSearch = () => {
    const trimmedQuery = searchInput.trim();

    setQuery(trimmedQuery);
    setSelectedShelfNumber(null);
    setHasSearched(trimmedQuery.length > 0);
    setActiveTab("search");
  };

  const handleReloadOnlineData = async () => {
    await loadOnlineData();
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const nextQuantity = Number.parseInt(value, 10);

    setRequestQuantities((current) => ({
      ...current,
      [productId]: Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1
    }));
  };

  const handleOpenAddToCartConfirm = (product: ProductRecord) => {
    setProductPendingCart(product);
    setSelectedPackagingCategory("一般");
  };

  const handleConfirmAddToCart = () => {
    if (!productPendingCart) {
      return;
    }

    const product = productPendingCart;
    const quantity = requestQuantities[product.id] ?? 1;

    setCartItems((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.itemNumber === product.itemNumber &&
          item.shelfNumber === product.shelfNumber &&
          item.packagingCategory === selectedPackagingCategory
      );

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity
              }
            : item
        );
      }

      return [
        ...current,
        {
          id: `${product.id}-${Date.now()}`,
          itemNumber: product.itemNumber,
          productCategory: product.productCategory,
          productName: product.productName,
          modelNumber: product.modelNumber,
          shelfNumber: product.shelfNumber,
          packagingCategory: selectedPackagingCategory,
          quantity
        }
      ];
    });
    setSuccessMessage(null);
    setProductPendingCart(null);
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((current) => current.filter((item) => item.id !== cartItemId));
  };

  const handleCartQuantityChange = (cartItemId: string, value: string) => {
    const nextQuantity = Number.parseInt(value, 10);

    setCartItems((current) =>
      current.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity: Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1
            }
          : item
      )
    );
  };

  const handleConfirmCart = async () => {
    if (cartItems.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const response = await apiRequest<RepickRequestsApiResponse>(
      "/api/repick-requests",
      verifiedPassword,
      {
        method: "POST",
        body: {
          items: cartItems.map((item) => ({
            ...item,
            status: "pending",
            createdAt: now,
            updatedAt: now
          }))
        }
      }
    );

    if (!response.ok) {
      setErrorMessage(response.errorMessage);
      return;
    }

    setRequests(response.requests.map(toRepickRequest));
    setCartItems([]);
    setIsCartConfirmOpen(false);
    setSuccessMessage("発注しました。");
    setActiveTab("pending");
  };

  const handleStatusChange = async (requestId: string, status: RequestStatus) => {
    const response = await apiRequest<BasicApiResponse>(
      `/api/repick-requests/${encodeURIComponent(requestId)}`,
      verifiedPassword,
      {
        method: "PATCH",
        body: { status }
      }
    );

    if (!response.ok) {
      setErrorMessage(response.errorMessage);
      return;
    }

    await loadOnlineData();
  };

  const handleDeleteRequest = async (requestId: string) => {
    const response = await apiRequest<BasicApiResponse>(
      `/api/repick-requests/${encodeURIComponent(requestId)}`,
      verifiedPassword,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {
      setErrorMessage(response.errorMessage);
      return;
    }

    setRequests((current) => current.filter((request) => request.id !== requestId));
  };

  const handleOpenProductFileDialog = () => {
    const uploadPassword = window.prompt("アップロード用パスワードを入力してください。");

    if (!uploadPassword) {
      return;
    }

    uploadPasswordRef.current = uploadPassword;
    productInputRef.current?.click();
  };

  if (!isAuthenticated) {
    return (
      <main className="shell authShell">
        <section className="authPanel" aria-label="ログイン">
          <div>
            <h1>商品検索</h1>
            <p>共通パスワードを入力してください。</p>
          </div>
          <form
            className="authForm"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}
          >
            <input
              type="password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              placeholder="共通パスワード"
              aria-label="共通パスワード"
            />
            <button className="requestButton" type="submit">
              ログイン
            </button>
          </form>
          {errorMessage ? (
            <div className="errorBanner" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="toolbar" aria-label="検索と取り込み">
        <div className="titleBlock">
          <div>
            <h1>商品検索</h1>
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
            onClick={() => void handleReloadOnlineData()}
            disabled={isLoadingOnlineData}
            title="リロード"
            aria-label="リロード"
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
            onClick={handleOpenProductFileDialog}
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

      {successMessage ? (
        <div className="successBanner" role="status">
          <Check size={18} aria-hidden="true" />
          <span>{successMessage}</span>
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
              <span>{isLoadingOnlineData ? "同期中" : "オンライン同期"}</span>
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
                      <span className="resultText">
                        <strong>{product.productName || "商品名未設定"}</strong>
                        <small>単品番号: {product.itemNumber || "未設定"}</small>
                        <small>型番: {product.modelNumber || "未設定"}</small>
                        <small>商品区分: {product.productCategory || "未設定"}</small>
                        <small>棚番号: {product.shelfNumber}</small>
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
                          onClick={() => handleOpenAddToCartConfirm(product)}
                        >
                          <ShoppingCart size={16} aria-hidden="true" />
                          カートに追加
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

          <footer className="cartSummary cartFooter" aria-label="再ピック依頼カート">
            <div>
              <h2>再ピック依頼カート</h2>
              <p>{cartItems.length} 商品</p>
            </div>
            <button
              className="requestButton"
              type="button"
              onClick={() => setIsCartConfirmOpen(true)}
              disabled={cartItems.length === 0}
            >
              <ShoppingCart size={16} aria-hidden="true" />
              確認して発注
            </button>
          </footer>
        </>
      ) : null}

      {productPendingCart ? (
        <div className="modalBackdrop" role="presentation">
          <section className="confirmDialog" aria-label="カート追加確認" role="dialog">
            <div className="paneHeader">
              <div>
                <h2>カート追加確認</h2>
                <p>この商品をカートに追加します。</p>
              </div>
            </div>
            <div className="singleConfirmItem">
              <strong>{productPendingCart.productName || "商品名未設定"}</strong>
              <small>単品番号: {productPendingCart.itemNumber || "未設定"}</small>
              <small>型番: {productPendingCart.modelNumber || "未設定"}</small>
              <small>商品区分: {productPendingCart.productCategory || "未設定"}</small>
              <small>棚番号: {productPendingCart.shelfNumber}</small>
              <label>
                包装場区分
                <select
                  value={selectedPackagingCategory}
                  onChange={(event) =>
                    setSelectedPackagingCategory(event.target.value as PackagingCategory)
                  }
                >
                  {packagingCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                数量
                <input
                  min={1}
                  type="number"
                  value={requestQuantities[productPendingCart.id] ?? 1}
                  onChange={(event) =>
                    handleQuantityChange(productPendingCart.id, event.target.value)
                  }
                />
              </label>
            </div>
            <div className="confirmActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setProductPendingCart(null)}
              >
                戻る
              </button>
              <button className="requestButton" type="button" onClick={handleConfirmAddToCart}>
                <ShoppingCart size={16} aria-hidden="true" />
                カートに追加
              </button>
            </div>
          </section>
        </div>
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

      {isCartConfirmOpen ? (
        <div className="modalBackdrop" role="presentation">
          <section className="confirmDialog" aria-label="再ピック依頼確認" role="dialog">
            <div className="paneHeader">
              <div>
                <h2>発注前確認</h2>
                <p>内容を確認してから発注してください。</p>
              </div>
            </div>

            {cartItems.length > 0 ? (
              <div className="cartList">
                {cartItems.map((item) => (
                  <div className="cartItem" key={item.id}>
                    <div className="cartItemBody">
                      <strong>{item.productName || "商品名未設定"}</strong>
                      <small>単品番号: {item.itemNumber || "未設定"}</small>
                      <small>型番: {item.modelNumber || "未設定"}</small>
                      <small>商品区分: {item.productCategory || "未設定"}</small>
                      <small>棚番号: {item.shelfNumber}</small>
                      <small>包装場区分: {item.packagingCategory}</small>
                    </div>
                    <label>
                      数量
                      <input
                        min={1}
                        type="number"
                        value={item.quantity}
                        onChange={(event) => handleCartQuantityChange(item.id, event.target.value)}
                      />
                    </label>
                    <button
                      className="deleteButton"
                      type="button"
                      onClick={() => handleRemoveCartItem(item.id)}
                      title="カートから削除"
                      aria-label="カートから削除"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="compactEmptyState">カートに商品がありません。</div>
            )}

            <div className="confirmActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setIsCartConfirmOpen(false)}
              >
                戻る
              </button>
              <button
                className="requestButton"
                type="button"
                onClick={handleConfirmCart}
                disabled={cartItems.length === 0}
              >
                <Plus size={16} aria-hidden="true" />
                発注
              </button>
            </div>
          </section>
        </div>
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

function toRepickRequest(value: unknown): RepickRequest {
  const request = value && typeof value === "object" ? (value as Partial<RepickRequest>) : {};
  const status: RequestStatus = request.status === "completed" ? "completed" : "pending";
  const packagingCategory = isPackagingCategory(request.packagingCategory)
    ? request.packagingCategory
    : "一般";

  return {
    id: typeof request.id === "string" && request.id.length > 0 ? request.id : `request-${Date.now()}`,
    itemNumber: typeof request.itemNumber === "string" ? request.itemNumber : "",
    productCategory: typeof request.productCategory === "string" ? request.productCategory : "",
    productName: typeof request.productName === "string" ? request.productName : "",
    modelNumber: typeof request.modelNumber === "string" ? request.modelNumber : "",
    shelfNumber: typeof request.shelfNumber === "string" ? request.shelfNumber : "",
    packagingCategory,
    quantity: typeof request.quantity === "number" && request.quantity > 0 ? request.quantity : 1,
    status,
    createdAt: typeof request.createdAt === "string" ? request.createdAt : new Date().toISOString(),
    updatedAt: typeof request.updatedAt === "string" ? request.updatedAt : new Date().toISOString()
  };
}

function isPackagingCategory(value: unknown): value is PackagingCategory {
  return packagingCategoryOptions.some((option) => option === value);
}

async function apiRequest<T>(
  path: string,
  password: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    uploadPassword?: string;
  } = {}
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-app-password": password,
      ...(options.uploadPassword ? { "x-upload-password": options.uploadPassword } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const data = (await response.json()) as T;

  return data;
}

function getClientErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "オンラインデータの通信中にエラーが発生しました。";
}

function RequestList({
  emptyMessage,
  onDelete,
  onStatusChange,
  requests,
  title
}: {
  emptyMessage: string;
  onDelete: (requestId: string) => void | Promise<void>;
  onStatusChange: (requestId: string, status: RequestStatus) => void | Promise<void>;
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
                <small>型番: {request.modelNumber || "未設定"}</small>
                <small>商品区分: {request.productCategory || "未設定"}</small>
                <small>棚番号: {request.shelfNumber}</small>
                <small>包装場区分: {request.packagingCategory}</small>
                <small>数量: {request.quantity}</small>
              </div>
              <div className="requestControls">
                {request.status === "pending" ? (
                  <button
                    className="statusButton"
                    type="button"
                    onClick={() => void onStatusChange(request.id, "completed")}
                  >
                    <Check size={16} aria-hidden="true" />
                    対応済み
                  </button>
                ) : (
                  <button
                    className="statusButton"
                    type="button"
                    onClick={() => void onStatusChange(request.id, "pending")}
                  >
                    未対応へ戻す
                  </button>
                )}
                <button
                  className="deleteButton"
                  type="button"
                  onClick={() => void onDelete(request.id)}
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
