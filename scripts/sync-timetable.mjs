import { writeFile } from 'node:fs/promises';

const source = process.env.TIMETABLE_URL;
if (!source) {
  console.error('TIMETABLE_URL が設定されていません。例: export TIMETABLE_URL=https://example.com/timetable.json');
  process.exit(1);
}

async function main() {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to download timetable (${response.status} ${response.statusText})`);
  }
  const json = await response.json();
  const outPath = new URL('../src/data/timetable.remote.json', import.meta.url);
  await writeFile(outPath, JSON.stringify(json, null, 2));
  console.log('Synced timetable to', outPath.pathname);
}

main().catch((error) => {
  console.error('[sync-timetable]', error);
  process.exit(1);
});
