import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTimetable } from '../src/lib/timetable.ts';
import {
  departuresOn, upcomingDepartures, serviceSpan, dayInfo, boardingStatus, freshness, referenceFrom
} from '../src/lib/schedule.ts';
import { toJst, weekdayOf, formatHHmm } from '../src/lib/jst.ts';

const raw = JSON.parse(readFileSync(new URL('../src/data/timetable.json', import.meta.url), 'utf8'));
const timetable = normalizeTimetable(raw);
const day = (y, m, d) => ({ year: y, month: m, day: d, weekday: weekdayOf(y, m, d) });
const ref = (y, m, d, hh, mm) => ({ date: day(y, m, d), secondsOfDay: hh * 3600 + mm * 60 });

test('新フォーマットを正規化できる', () => {
  assert.equal(timetable.routes.length, 2);
  const outbound = timetable.routes.find((r) => r.id === 'sakai_to_tokyo');
  assert.equal(outbound.trips.length, 8);
  assert.equal(outbound.trips[0].times.weekday.sakai, 320);
  assert.equal(outbound.trips[0].times.weekday.tokyo, 420);
  assert.equal(outbound.trips[0].times.holiday.tokyo, 410);
});

test('旧フォーマット(dep/arr_oji/arr_tokyo)も正規化できる', () => {
  const legacy = normalizeTimetable({
    calendar: { note: 'legacy note' },
    routes: [
      { id: 'sakai_to_tokyo', stops: ['境町', '王子駅', '東京駅'], trips: [
        { dep: '05:20', arr_oji: { weekday: '06:25', holiday: '06:15' }, arr_tokyo: '07:00' }
      ] },
      { id: 'tokyo_to_sakai', trips: [{ dep_tokyo: '08:40', dep_oji: '09:15', arr_sakai: '10:13' }] }
    ]
  });
  assert.equal(legacy.meta.note, 'legacy note');
  assert.equal(legacy.routes[0].trips[0].times.weekday.oji, 385);
  assert.equal(legacy.routes[0].trips[0].times.holiday.oji, 375);
  assert.equal(legacy.routes[0].trips[0].times.holiday.tokyo, 420); // 単一値は両ダイヤ共通
  assert.equal(legacy.routes[1].trips[0].times.weekday.tokyo, 520);
});

test('壊れた入力でも落ちない', () => {
  assert.deepEqual(normalizeTimetable(null).routes, []);
  assert.deepEqual(normalizeTimetable({ routes: 'nope' }).routes, []);
  assert.deepEqual(normalizeTimetable({ routes: [{ id: 'unknown', trips: [] }] }).routes, []);
  assert.deepEqual(normalizeTimetable({ routes: [{ id: 'sakai_to_tokyo', trips: [{}] }] }).routes[0].trips, []);
});

test('平日と土日祝で到着時刻が切り替わる', () => {
  const weekday = departuresOn(timetable, 'sakai_to_tokyo', 'sakai', day(2026, 9, 17)); // 木
  const holiday = departuresOn(timetable, 'sakai_to_tokyo', 'sakai', day(2026, 9, 19)); // 土
  assert.equal(formatHHmm(weekday[0].arrivalMinutes), '07:00');
  assert.equal(formatHHmm(holiday[0].arrivalMinutes), '06:50');
});

test('祝日は土日祝ダイヤを使う', () => {
  const info = dayInfo(day(2026, 9, 21)); // 敬老の日(月)
  assert.equal(info.dayType, 'holiday');
  assert.equal(info.holiday, '敬老の日');
  const list = departuresOn(timetable, 'sakai_to_tokyo', 'sakai', day(2026, 9, 21));
  assert.equal(formatHHmm(list[0].arrivalMinutes), '06:50');
});

test('乗車停留所ごとに発車時刻が変わる', () => {
  const fromTokyo = departuresOn(timetable, 'tokyo_to_sakai', 'tokyo', day(2026, 9, 17));
  const fromOji = departuresOn(timetable, 'tokyo_to_sakai', 'oji', day(2026, 9, 17));
  assert.equal(formatHHmm(fromTokyo[0].departureMinutes), '08:40');
  assert.equal(formatHHmm(fromOji[0].departureMinutes), '09:15');
  assert.equal(fromTokyo[0].durationMinutes, 93);
  assert.equal(fromOji[0].durationMinutes, 58);
});

test('次発は基準時刻より後の便になる', () => {
  const list = upcomingDepartures(timetable, 'sakai_to_tokyo', 'sakai', ref(2026, 9, 17, 9, 0), { limit: 3 });
  assert.equal(formatHHmm(list[0].departureMinutes), '10:40');
  assert.equal(list[0].minutesUntil, 100);
  assert.deepEqual(list.map((d) => formatHHmm(d.departureMinutes)), ['10:40', '11:40', '13:40']);
});

test('発車時刻ちょうどの便はまだ次発に含まれる', () => {
  const list = upcomingDepartures(timetable, 'sakai_to_tokyo', 'sakai', ref(2026, 9, 17, 10, 40), { limit: 1 });
  assert.equal(formatHHmm(list[0].departureMinutes), '10:40');
  assert.equal(list[0].secondsUntil, 0);
});

test('1 秒でも過ぎた便は次発から外れる', () => {
  const reference = { date: day(2026, 9, 17), secondsOfDay: 10 * 3600 + 40 * 60 + 1 };
  const list = upcomingDepartures(timetable, 'sakai_to_tokyo', 'sakai', reference, { limit: 1 });
  assert.equal(formatHHmm(list[0].departureMinutes), '11:40');
});

test('終バス後は翌日の始発へ繰り越す', () => {
  // 2026-09-18(金) 23:00 → 翌日は土曜（土日祝ダイヤ）
  const list = upcomingDepartures(timetable, 'sakai_to_tokyo', 'sakai', ref(2026, 9, 18, 23, 0), { limit: 2 });
  assert.equal(list[0].date.day, 19);
  assert.equal(list[0].dayType, 'holiday');
  assert.equal(formatHHmm(list[0].departureMinutes), '05:20');
  assert.equal(formatHHmm(list[0].arrivalMinutes), '06:50'); // 土日祝ダイヤの到着
  assert.equal(list[0].minutesUntil, 6 * 60 + 20);
});

test('始発・終バスを取得できる', () => {
  const span = serviceSpan(timetable, 'tokyo_to_sakai', 'tokyo', day(2026, 9, 17));
  assert.equal(formatHHmm(span.first.departureMinutes), '08:40');
  assert.equal(formatHHmm(span.last.departureMinutes), '21:30');
  assert.equal(span.count, 8);
});

test('徒歩時間から間に合うかを判定する', () => {
  assert.equal(boardingStatus(-1, 5), 'departed');
  assert.equal(boardingStatus(3 * 60, 5), 'hurry');       // 残り3分 < 徒歩5分
  assert.equal(boardingStatus(7 * 60, 5), 'tight');       // 余裕2分
  assert.equal(boardingStatus(30 * 60, 5), 'comfortable');
  assert.equal(boardingStatus(120 * 60, 5), 'later');
  assert.equal(boardingStatus(2 * 60, 0), 'tight');       // 徒歩0分でも直前は tight
});

test('データ鮮度を判定する', () => {
  const today = day(2026, 9, 17);
  const base = { verifiedOn: '2026-09-01', staleAfterDays: 180, pendingRevision: null };
  assert.deepEqual(freshness(base, today), { stale: false, daysSinceVerified: 16, hasPendingRevision: false });
  assert.equal(freshness({ ...base, verifiedOn: '2025-01-01' }, today).stale, true);
  assert.equal(freshness({ ...base, verifiedOn: null }, today).stale, true);
  assert.equal(freshness({ ...base, pendingRevision: { date: '2026-01-01' } }, today).stale, true);
});

test('referenceFrom は JST の瞬間から基準を作る', () => {
  const reference = referenceFrom(toJst(new Date('2026-09-17T00:20:00Z'))); // JST 09:20
  assert.deepEqual(reference.date, day(2026, 9, 17));
  assert.equal(reference.secondsOfDay, 9 * 3600 + 20 * 60);
});
