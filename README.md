# Tana-Ban

商品マスタExcelを取り込み、商品検索と再ピック依頼を現場で共有するNext.jsアプリです。

## 目的

約300種類の商品を保管する倉庫で、商品名・単品番号・型番・棚番号から棚位置を検索します。包装場から商品倉庫へ再ピック依頼を出し、未対応・対応済みを複数端末で共有できます。

## 現在の機能

- 共通パスワードによるログイン
- 商品マスタExcelのオンライン保存
- 単品番号・商品名・型番・棚番号による部分一致検索
- 包装場区分つきの再ピック依頼カート
- 再ピック依頼の未対応・対応済み管理
- Supabase上での商品マスタ・再ピック依頼共有

## 技術スタック

- Next.js App Router
- TypeScript
- React
- Zustand
- xlsx
- lucide-react
- Supabase REST API

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで以下を開きます。

```text
http://localhost:3000
```

ローカルでオンライン保存まで動かす場合は、`.env.example` を参考に `.env.local` を作成してください。

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
APP_SHARED_PASSWORD=現場共通パスワード
ADMIN_UPLOAD_PASSWORD=アップロード用パスワード
```

## 商品Excelの形式

1行目に見出しを入れてください。現在対応している主な列名は以下です。

| 項目 | 対応列名 |
| --- | --- |
| 単品番号 | 単品番号、単品No、単品NO、itemNumber、item_number |
| 商品区分 | 商品区分、作業場2、category、productCategory、product_category |
| 商品名 | 商品名、商品名2、品名、品名1、productName、product_name、name |
| 型番 | 型番、方番号、品番、品名2、modelNumber、model_number、sku |
| 棚番号 | 棚番号、棚番、棚、shelfNumber、shelf_number、location |
| 分割棚番号 | 棚番号1、棚番号2、棚番号3 |
| キーワード | キーワード、検索語、keywords、keyword、備考 |

最低限、棚番号は必須です。商品名または型番が入っていると検索結果が見やすくなります。

## Supabase設定

SupabaseのSQL Editorで `supabase/schema.sql` を実行してください。

作成されるテーブル:

- `products`
- `repick_requests`

アプリはサーバー側API Routeから `SUPABASE_SERVICE_ROLE_KEY` を使ってアクセスします。ブラウザにはSupabaseキーを出しません。

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

Environment Variables に以下を設定してください。

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `APP_SHARED_PASSWORD` | 現場20人が使う共通パスワード |
| `ADMIN_UPLOAD_PASSWORD` | 商品マスタExcelアップロード用パスワード |

## StackBlitzで見る手順

GitHubにpushしたあと、以下のURL形式で開けます。

```text
https://stackblitz.com/github/YOUR_ACCOUNT/YOUR_REPOSITORY
```

## 今後の拡張候補

- 実Excelの棚番号表記ゆれ対応
- 複数倉庫・複数フロア対応
- 棚ごとの在庫数表示
- バーコードまたはQRコード検索
- 操作履歴と担当者名の記録
