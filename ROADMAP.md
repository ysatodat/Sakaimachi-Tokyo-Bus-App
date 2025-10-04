# Sakaimachi Bus Mini – Issue Backlog & Schedule

本ドキュメントは `FUTURE_VISION.md` を起点に、具体的な Issue 化とスケジュールの叩き台をまとめたものです。GitHub で Issue を作成する際のタイトル案・説明・想定ラベルを整理しています。

## 1. Immediate (〜1か月)
| # | Issue タイトル案 | 説明 | ラベル | 期限目安 |
|---|------------------|------|--------|----------|
| 1 | ✅ UX: よく使う導線カードの追加 | トップヒーロー下に「料金案内」「乗り換え検索」「運行情報のお知らせ」などを設置し、主要タスクへ誘導する | `ux`, `frontend`, `short-term` | 今月内 |
| 2 | ✅ Feedbackフォーム/リンクの追加 | フッターに不具合報告・改善要望フォーム（GitHub Issue テンプレ）を設置 | `ux`, `ops` | 今月内 |
| 3 | ✅ 色覚コントラスト監査＆配色調整 | DevTools で確認し、アクセントカラーをコントラスト比 4.5:1 以上となる値に調整 | `a11y`, `design` | 今月内 |
| 4 | ✅ GA4/GTM Measurement ID 設定と主要導線イベント計測 | envでID管理し、方向切替/共有/FAQ遷移などを `trackEvent` で送信できるよう整備 | `analytics`, `ops`, `short-term` | 今月内 |

## 2. Next (1〜3か月)
| # | Issue タイトル案 | 説明 | ラベル | 期限目安 |
|---|------------------|------|--------|----------|
| 5 | ガイドページ拡充（写真・アクセス情報） | Guide に停留所写真／Google Map 埋め込み／料金表を追加 | `content`, `seo`, `frontend` | 2か月以内 |
| 6 | OG画像テンプレ刷新 & 自動生成スクリプト更新 | `gen:og` を最新デザインに更新し、主要ページごとの OGP を再生成 | `design`, `seo`, `automation` | 2か月以内 |
| 7 | Service Worker / Manifest の PWA PoC | `@astrojs/pwa` などを試し、オフラインキャッシュと更新通知の土台を構築 | `pwa`, `frontend`, `medium-term` | 3か月以内 |
| 8 | 時刻表データのスプレッドシート同期 | Google Sheets から JSON を生成するスクリプト + CI 連携を構築 | `data`, `automation`, `medium-term` | 3か月以内 |
| 9 | Lighthouse / Pa11y CI 導入 | GitHub Actions で Lighthouse/Pa11y を実行しレポートを保存 | `a11y`, `infra`, `medium-term` | 3か月以内 |

## 3. Later (3〜6か月)
| # | Issue タイトル案 | 説明 | ラベル | 期限目安 |
|---|------------------|------|--------|----------|
| 10 | 遅延・運休情報の取得と表示 | 自治体 or SNS ソースから運行ニュースを取得し、トップに表示 | `backend`, `data`, `seo` | 6か月以内 |
| 11 | 多言語対応（英語版） | i18n構成を整備し、英語ページ + `hreflang` を追加 | `i18n`, `seo`, `frontend`, `long-term` | 6か月以内 |
| 12 | PWA Push通知 / バックグラウンド同期 | Push API を利用し、登録ユーザーに運行アラートを送付する PoC | `pwa`, `backend`, `long-term` | 6か月以内 |
| 13 | KPI ダッシュボード整備 | analytics イベントをダッシュボード化し、運用を可視化 | `analytics`, `ops`, `long-term` | 6か月以内 |

## 4. 管理メモ
- Issue 作成時は本表のタイトル・説明・ラベルをベースに必要に応じて詳細を加筆してください。
- ラベル案: `ux`, `frontend`, `backend`, `design`, `a11y`, `seo`, `pwa`, `analytics`, `automation`, `ops`, `content`, `data`, `infra`, `i18n`, `short-term`, `medium-term`, `long-term`。
- 期限は目安。自治体連携や外部API利用は調査タスクを別途起票すること。
- FUTURE_VISION.md の更新時はこの表も併せて見直し、完了したものにチェックマークを付与する運用を想定。

### 4.1 GitHub 連携ワークフロー
1. `gh auth login` で GitHub CLI を利用可能にする。
2. ロードマップ行を Issue 化する際は以下のコマンドを利用。
   ```bash
   gh issue create \
     --title "[Roadmap] UX: よく使う導線カードの追加" \
     --body-file .github/ISSUE_TEMPLATE/.generated.md \
     --label roadmap,ux,frontend,short-term
   ```
   - `--body-file` には、本テンプレートをもとに記述した一時ファイルを指定。`gh issue create` ではフォームテンプレは使えないため、Issue 作成前に `ROADMAP.md` の該当セルをコピーして Markdown を整形する。
3. 作成した Issue は GitHub Projects （例: `Projects/Sakaimachi Bus Mini Roadmap`）に追加し、フェーズ列を `Immediate` / `Next` / `Later` に設定する。
4. Close 時には `ROADMAP.md` の該当行に ✅ を付け、`FUTURE_VISION.md` に学びやメトリクスを追記する。

> **Tips**: フォーム形式の Issue を使いたい場合は GitHub UI で「Roadmap Task」テンプレートを選択することで、フェーズや領域などをドロップダウンで指定できます。
