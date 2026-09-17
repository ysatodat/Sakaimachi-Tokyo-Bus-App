/**
 * リモートの時刻表 JSON を取り込むためのスナップショット取得。`npm run sync:timetable`。
 *
 * 取得したデータをそのまま公開すると誤りに気づけないため、
 * ここでは「差分を確認するためのファイル」を書き出すだけにとどめる。
 * 内容を確認したうえで src/data/timetable.json に反映し、
 * meta.verifiedOn を更新してから `npm run validate:timetable` を通すこと。
 */
import { writeFile } from 'node:fs/promises';

const source = process.env.TIMETABLE_URL;
if (!source) {
  console.error(
    'TIMETABLE_URL が設定されていません。例: export TIMETABLE_URL=https://example.com/timetable.json'
  );
  process.exit(1);
}

const outArg = process.argv.indexOf('--out');
const outPath = new URL(
  outArg > -1 && process.argv[outArg + 1] ? process.argv[outArg + 1] : '../src/data/timetable.remote.json',
  import.meta.url
);

async function main() {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`時刻表を取得できませんでした (${response.status} ${response.statusText})`);
  }
  const json = await response.json();

  if (!Array.isArray(json?.routes) || json.routes.length === 0) {
    throw new Error('取得したデータに routes 配列がありません。取り込みを中止します。');
  }
  for (const route of json.routes) {
    if (!Array.isArray(route?.trips) || route.trips.length === 0) {
      throw new Error(`route "${route?.id ?? '不明'}" に trips がありません。取り込みを中止します。`);
    }
  }

  await writeFile(outPath, `${JSON.stringify(json, null, 2)}\n`);
  console.log('取得しました:', outPath.pathname);
  for (const route of json.routes) {
    console.log(`  ${route.id}: ${route.trips.length} 便`);
  }
  console.log('\n内容を確認して src/data/timetable.json に反映し、meta.verifiedOn を更新してください。');
  console.log('反映後は `npm run validate:timetable` を必ず通してください。');
}

main().catch((error) => {
  console.error('[sync-timetable]', error.message ?? error);
  process.exit(1);
});
