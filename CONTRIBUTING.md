# コントリビュートガイド

このプロジェクトでは、以下のルール・方針に従って開発・運用を行います。

## PR（Pull Request）
- タイトル・本文は基本的に日本語で記載してください。
- 変更の背景・目的、主な変更点、動作確認方法を明記してください。
- 可能であればスクリーンショットやデモURLを添付してください。
- 破壊的変更や影響範囲がある場合は必ず本文に記載してください。
- PR本文の初期フォーマットは `.github/pull_request_template.md` を利用します。

## Codex / MCP の利用ポリシー（開発補助）
- Read系（ファイル閲覧、検索、ログ取得など）の操作は承認不要で実行してOK。
- Write系（ファイル変更、コミット、ブランチ作成、削除等）やネットワークを伴う操作（依存インストール、PR作成、Push等）は承認を前提とします。
- 自動化が必要な場合は、PRを作成しレビューの上で反映する運用を推奨します。

## コミットメッセージのスタイル（任意推奨）
- `type(scope): subject` の形式（例: `fix(ci): lockfileを更新`）を推奨します。
- type 例: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor` など。

## Node / ビルド
- Node 22 系推奨（`node --test` の TypeScript 実行に依存しています）。
- 通常は `npm ci` を利用し、必要時のみ `npm install` を使います。

## 変更前に通すチェック
```bash
npm run verify     # 時刻表検証 → ユニットテスト → 型チェック → ビルド
npm run test:e2e   # ブラウザ実機の回帰テスト（dist を配信した状態で実行）
```
`npm run verify` は CI（`.github/workflows/quality.yml`）でも実行されます。
CI ではさらに Lighthouse（Accessibility / Best Practices / SEO は 100 点必須、CLS 0.1 未満）と
Pa11y（WCAG 2.1 AA でエラー 0）が走ります。

## 時刻表データを変更するとき
- `src/data/timetable.json` の `meta.revision` / `meta.revisionLabel` / `meta.verifiedOn` を必ず更新してください。
- 公式の改定を反映し終えたら `meta.pendingRevision` を `null` にします（告知バナーが消えます）。
- `npm run validate:timetable` が通らない変更はマージできません。

