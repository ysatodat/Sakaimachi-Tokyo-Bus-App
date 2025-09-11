# 境町 ↔ 東京 高速バス ミニ（非公式）

境町と東京（王子駅/東京駅）を結ぶ高速バスの「次発」「以降」を素早く確認できるミニWebアプリです。スマホ最適化・カウントダウン表示に対応しています。

公開: https://ysatodat.github.io/Sakaimachi-Tokyo-Bus-App/

## 主な機能
- 次発を画面中央のヒーローカードで強調表示（出発までのカウントダウン付き）
- 以降の便は「hh時間mm分後」表記で相対時間を表示
- 平日/土日祝ダイヤを自動判定（祝日は未対応）
- 方向切替、東京側の目的地（王子/東京）の切替

## 技術構成
- Astro + React + TypeScript
- Day.js（タイムゾーン/相対時刻）
- GitHub Pagesでホスティング（独自サーバーへのSSHデプロイも任意対応）

## 動作要件
- Node.js 20

## 開発

```bash
npm i
npm run dev
```

## ビルド

```bash
npm run build
```

出力は `dist/` に生成されます。

## OGP / アイコン
- OGP: `public/og.svg` を編集し、`npm run gen:og` で `public/og.png` を生成
- Favicon/Apple Touch: `public/favicon.svg` を編集し、`npm run gen:icons` で `public/apple-touch-icon.png` を生成

## デプロイ設定

本リポジトリには 2 つの配信先を想定したワークフローが含まれます。

1) GitHub Pages（既定）
- `.github/workflows/pages.yml`
- そのまま main ブランチへの push で公開されます

2) 独自サーバーへのSSHデプロイ（任意）
- `.github/workflows/deploy-ssh.yml`
- 以下のシークレットを設定すると、main push で `dist/` が rsync でアップロードされます
  - `SSH_PRIVATE_KEY`: 接続用秘密鍵（OpenSSH形式）
  - `REMOTE_HOST`: 接続先ホスト名
  - `REMOTE_USER`: 接続ユーザー
  - `REMOTE_PATH`: 配置先ディレクトリ（例 `/var/www/bus`）

### カスタムドメインでの公開
Astroの `site` と `base` を環境変数で切り替えられます：

```bash
# 例: 独自サブドメインにデプロイする場合
PUBLIC_SITE_URL=https://sakaimachi-bus.amida-des.com \
PUBLIC_BASE_PATH=/ \
npm run build
```

`src/pages/index.astro` の OGPなども `PUBLIC_SITE_URL` / `PUBLIC_BASE_PATH` から計算されます。

## 命名（サブドメイン）提案
候補と用途の明確さのバランスから、以下を推奨します：

- `sakaimachi-bus.amida-des.com`（推奨）
  - 明確で覚えやすく、将来的なSEOにも利点
- `sakaimachi-tokyo-bus.amida-des.com`
  - 経路を明示。やや長い
- `bus.amida-des.com`
  - ジェネリック。今後バス系ツールのハブにするなら

最短で覚えやすさ重視なら `bus.amida-des.com`、本プロジェクトを指す明確さ重視なら `sakaimachi-bus.amida-des.com` をおすすめします。

## ライセンス / クレジット
© 2025 Amida Design. 本アプリは境町公式の提供ではありません。データは公開時刻表をもとに作成しています。
