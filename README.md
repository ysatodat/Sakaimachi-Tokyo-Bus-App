# 境町 ↔ 東京 高速バスアプリ

境町と東京（王子駅・東京駅）を結ぶ高速バスの「次の便」「以降の便」「始発/終バス」がすぐに分かるWebアプリです。

## 技術構成
- Astro + React + TypeScript
- GitHub Pagesでホスティング
- Day.jsで時刻計算

## 公開URL
https://ysatodat.github.io/Sakaimachi-Tokyo-Bus-App/

## 今後のTODO
- [ ] 公式時刻表データの反映
- [ ] 平日/土休日/特別ダイヤ切替
- [ ] PWA対応（オフライン利用）

## Codex MCP（GitHub）
- 前提: Node.js 18+ と `npx`、Codex CLI がインストール済み
- プロジェクト設定: `.codex/config.toml` に GitHub MCP サーバー設定を追加
  - `[mcpServers.github]` を `npx -y @modelcontextprotocol/server-github` で起動
- トークン: `.env` またはシェルで `GITHUB_TOKEN` を設定
- 使い方: Codex CLI を再起動すると GitHub MCP サーバーが利用可能になります
- 補足: スニペット `.codex/github.mcp.toml` も同梱しています
