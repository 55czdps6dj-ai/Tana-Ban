# Warehouse Shelf Finder

商品名・型番・棚番号から倉庫内の棚位置を検索し、倉庫マップ上で該当棚をハイライトするNext.jsアプリです。

## 目的

約300種類の商品を保管する倉庫で、棚入れ作業時に商品名・型番・キーワードを入力すると、該当商品の棚番号を検索し、倉庫マップ上の棚を色付きで表示します。

## 現在の機能

- サンプル倉庫マップの表示
- サンプル商品データの検索
- 商品名・型番・棚番号・キーワードによる部分一致検索
- 検索結果に該当する棚のハイライト
- 商品リストクリックによる棚の選択表示
- 倉庫マップExcelの読み込み
- 商品データExcelの読み込み

## 技術スタック

- Next.js App Router
- TypeScript
- React
- Zustand
- xlsx
- lucide-react

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで以下を開きます。

```text
http://localhost:3000
```

## 商品Excelの形式

1行目に見出しを入れてください。現在対応している主な列名は以下です。

| 項目 | 対応列名 |
| --- | --- |
| 商品名 | 商品名、品名、productName、product_name、name |
| 型番 | 型番、方番号、品番、modelNumber、model_number、sku |
| 棚番号 | 棚番号、棚番、棚、shelfNumber、shelf_number、location |
| キーワード | キーワード、検索語、keywords、keyword、備考 |

最低限、棚番号は必須です。商品名または型番が入っていると検索結果が見やすくなります。

## 倉庫マップExcelの形式

Excelシート上で、棚の位置に棚番号を入力してください。

例:

| 入口 |  | A-01 | A-02 | A-03 |
| --- | --- | --- | --- | --- |
|  |  | A-04 | A-05 | A-06 |
| 通路 | 通路 | 通路 | 通路 | 通路 |
|  |  | B-01 | B-02 | B-03 |

セルに入っている文字が棚番号として扱われます。通路や入口なども表示されますが、商品データの棚番号と一致したセルだけがハイライト対象になります。

## GitHubに載せる手順

```bash
git init
git add .
git commit -m "Initial warehouse shelf finder"
```

GitHubで新しいリポジトリを作成したあと、表示されたURLに合わせて以下を実行します。

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git branch -M main
git push -u origin main
```

## Vercelに載せる手順

1. GitHubにこのプロジェクトをpushします。
2. Vercelで「Add New Project」を選びます。
3. GitHubリポジトリを選択します。
4. Framework Preset が `Next.js` になっていることを確認します。
5. Deploy を押します。

現時点では環境変数は不要です。

## StackBlitzで見る手順

GitHubにpushしたあと、以下のURL形式で開けます。

```text
https://stackblitz.com/github/YOUR_ACCOUNT/YOUR_REPOSITORY
```

## 今後の拡張候補

- 実Excelの棚番号表記ゆれ対応
- Supabaseへの商品マスタ保存
- 複数倉庫・複数フロア対応
- 棚ごとの在庫数表示
- バーコードまたはQRコード検索
- スマホ向けの棚入れ専用モード
