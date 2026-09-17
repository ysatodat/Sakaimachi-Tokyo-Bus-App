/**
 * 時刻表データの検証。`npm run validate:timetable`（CI でも実行）。
 *
 * 目的は「公開してはいけないデータ」を機械的に弾くこと。
 * - 必須メタ情報が揃っているか
 * - 時刻の書式が正しいか
 * - 停留所の通過順に時刻が逆転していないか
 * - 発車時刻が昇順に並んでいるか
 * あわせて、データの鮮度が落ちていれば警告を出す。
 */
import { readFile } from 'node:fs/promises';

const ROUTE_STOPS = {
  sakai_to_tokyo: ['sakai', 'oji', 'tokyo'],
  tokyo_to_sakai: ['tokyo', 'oji', 'sakai']
};

const errors = [];
const warnings = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const parse = (value, where) => {
  if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value)) {
    fail(`${where}: 時刻の書式が不正です (${JSON.stringify(value)})`);
    return null;
  }
  const [h, m] = value.split(':').map(Number);
  if (m > 59) {
    fail(`${where}: 分が 59 を超えています (${value})`);
    return null;
  }
  return h * 60 + m;
};

const resolve = (spec, dayType, where) => {
  if (spec == null) return null;
  if (typeof spec === 'string') return parse(spec, where);
  if (typeof spec === 'object' && (spec.weekday || spec.holiday)) {
    return parse(spec[dayType] ?? spec.weekday ?? spec.holiday, `${where}/${dayType}`);
  }
  fail(`${where}: 時刻の形式が不正です`);
  return null;
};

const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

async function main() {
  const url = new URL('../src/data/timetable.json', import.meta.url);
  const data = JSON.parse(await readFile(url, 'utf8'));

  const meta = data.meta ?? {};
  for (const key of ['revision', 'revisionLabel', 'staleAfterDays', 'timezone']) {
    if (meta[key] == null) fail(`meta.${key} が未設定です`);
  }
  if (!Array.isArray(meta.sources) || meta.sources.length === 0) {
    fail('meta.sources に出典を 1 件以上記載してください');
  }
  if (!('verifiedOn' in meta)) fail('meta.verifiedOn を（null でもよいので）明示してください');

  const today = new Date().toISOString().slice(0, 10);
  if (meta.verifiedOn) {
    const age = daysBetween(meta.verifiedOn, today);
    if (age > (meta.staleAfterDays ?? 180)) {
      warn(`公式情報との突き合わせから ${age} 日経過しています（meta.verifiedOn: ${meta.verifiedOn}）`);
    }
  } else {
    warn('meta.verifiedOn が null です。公式サイトと突き合わせたら日付を記録してください');
  }
  if (meta.pendingRevision) {
    warn(`未反映の改定があります: ${meta.pendingRevision.label} (${meta.pendingRevision.url})`);
  }

  for (const stopId of ['sakai', 'oji', 'tokyo']) {
    const stop = data.stops?.[stopId];
    if (!stop?.name || !stop?.short) fail(`stops.${stopId} の name / short が未設定です`);
  }

  const routes = Array.isArray(data.routes) ? data.routes : [];
  const seen = new Set();
  for (const routeId of Object.keys(ROUTE_STOPS)) {
    if (!routes.some((route) => route.id === routeId)) fail(`routes に ${routeId} がありません`);
  }

  for (const route of routes) {
    const order = ROUTE_STOPS[route.id];
    if (!order) {
      fail(`未知の route.id: ${route.id}`);
      continue;
    }
    const trips = Array.isArray(route.trips) ? route.trips : [];
    if (trips.length === 0) fail(`${route.id}: trips が空です`);

    trips.forEach((trip, index) => {
      const where = `${route.id}[${index}] (${trip.id ?? 'no-id'})`;
      if (!trip.id) fail(`${where}: id を設定してください`);
      if (trip.id) {
        const key = `${route.id}:${trip.id}`;
        if (seen.has(key)) fail(`${where}: id が重複しています`);
        seen.add(key);
      }
    });

    for (const dayType of ['weekday', 'holiday']) {
      let previousDeparture = -1;
      trips.forEach((trip, index) => {
        const where = `${route.id}[${index}] (${trip.id ?? 'no-id'})`;
        const times = order.map((stopId) => resolve(trip.times?.[stopId], dayType, `${where}.${stopId}`));
        if (times.some((value) => value == null)) {
          fail(`${where}/${dayType}: 全停留所の時刻が必要です`);
          return;
        }
        for (let i = 1; i < times.length; i += 1) {
          if (times[i] <= times[i - 1]) {
            fail(
              `${where}/${dayType}: ${order[i - 1]} → ${order[i]} の時刻が逆転しています (${times[i - 1]} → ${times[i]})`
            );
          }
        }
        const duration = times[times.length - 1] - times[0];
        if (duration < 20 || duration > 240) {
          warn(`${where}/${dayType}: 所要時間が ${duration} 分です。データを確認してください`);
        }
        if (times[0] <= previousDeparture) {
          fail(`${where}/${dayType}: 発車時刻が前の便より早くなっています`);
        }
        previousDeparture = times[0];
      });
    }
  }

  for (const message of warnings) console.warn(`⚠️  ${message}`);
  if (errors.length > 0) {
    for (const message of errors) console.error(`❌ ${message}`);
    console.error(`\n${errors.length} 件のエラーがあります。`);
    process.exit(1);
  }
  console.log(`✅ 時刻表データは正常です（警告 ${warnings.length} 件）`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
