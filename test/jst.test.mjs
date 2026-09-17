import test from 'node:test';
import assert from 'node:assert/strict';
import { toJst, parseHHmm, formatHHmm, addDays, diffDays, fromIsoDate, toIsoDate, jstToDate, formatDateLabel } from '../src/lib/jst.ts';

test('UTC の Date を JST の壁時計に変換する', () => {
  const m = toJst(new Date('2026-09-17T16:14:00Z')); // JST では翌日 01:14
  assert.equal(m.year, 2026);
  assert.equal(m.month, 9);
  assert.equal(m.day, 18);
  assert.equal(m.hour, 1);
  assert.equal(m.minute, 14);
  assert.equal(m.minutesOfDay, 74);
  assert.equal(m.weekday, 5); // 金曜
});

test('ローカルタイムゾーンに依存しない', () => {
  const previous = process.env.TZ;
  const sample = new Date('2026-03-01T00:30:00Z');
  process.env.TZ = 'America/New_York';
  const a = toJst(sample);
  process.env.TZ = 'Asia/Tokyo';
  const b = toJst(sample);
  process.env.TZ = previous;
  assert.deepEqual(a, b);
  assert.equal(a.hour, 9);
});

test('HH:mm を相互変換する', () => {
  assert.equal(parseHHmm('05:20'), 320);
  assert.equal(parseHHmm('25:10'), 1510);
  assert.equal(formatHHmm(320), '05:20');
  assert.equal(formatHHmm(1510), '01:10');
  assert.throws(() => parseHHmm('abc'));
});

test('日付の加減算と差分', () => {
  const base = { year: 2026, month: 12, day: 31, weekday: 4 };
  assert.deepEqual(addDays(base, 1), { year: 2027, month: 1, day: 1, weekday: 5 });
  assert.equal(diffDays(base, addDays(base, 10)), 10);
  assert.equal(diffDays(addDays(base, 10), base), -10);
});

test('ISO 日付のパース', () => {
  assert.deepEqual(fromIsoDate('2026-09-17'), { year: 2026, month: 9, day: 17, weekday: 4 });
  assert.equal(fromIsoDate('2026-02-30'), null);
  assert.equal(fromIsoDate('bad'), null);
  assert.equal(toIsoDate({ year: 2026, month: 9, day: 7, weekday: 1 }), '2026-09-07');
});

test('JST の壁時計を絶対時刻に変換する', () => {
  const date = jstToDate({ year: 2026, month: 9, day: 17, weekday: 4 }, 5 * 60 + 20);
  assert.equal(date.toISOString(), '2026-09-16T20:20:00.000Z');
});

test('日付ラベル', () => {
  assert.equal(formatDateLabel({ year: 2026, month: 9, day: 17, weekday: 4 }), '9月17日(木)');
});
