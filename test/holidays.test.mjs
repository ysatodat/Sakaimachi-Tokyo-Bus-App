import test from 'node:test';
import assert from 'node:assert/strict';
import { holidayName, classifyDay, holidaysInYear } from '../src/lib/holidays.ts';
import { weekdayOf } from '../src/lib/jst.ts';

const day = (y, m, d) => ({ year: y, month: m, day: d, weekday: weekdayOf(y, m, d) });

test('固定日の祝日を判定する', () => {
  assert.equal(holidayName(2026, 1, 1), '元日');
  assert.equal(holidayName(2026, 2, 11), '建国記念の日');
  assert.equal(holidayName(2026, 11, 23), '勤労感謝の日');
});

test('ハッピーマンデーを判定する', () => {
  assert.equal(holidayName(2026, 1, 12), '成人の日');   // 1月第2月曜
  assert.equal(holidayName(2026, 7, 20), '海の日');     // 7月第3月曜
  assert.equal(holidayName(2026, 9, 21), '敬老の日');   // 9月第3月曜
  assert.equal(holidayName(2026, 10, 12), 'スポーツの日'); // 10月第2月曜
});

test('春分・秋分を判定する', () => {
  assert.equal(holidayName(2026, 3, 20), '春分の日');
  assert.equal(holidayName(2026, 9, 23), '秋分の日');
  assert.equal(holidayName(2025, 3, 20), '春分の日');
  assert.equal(holidayName(2027, 3, 21), '春分の日');
});

test('振替休日を判定する', () => {
  assert.equal(holidayName(2025, 2, 24), '振替休日'); // 2/23(日) の振替
  assert.equal(holidayName(2025, 11, 24), '振替休日'); // 11/23(日) の振替
  assert.equal(holidayName(2026, 5, 6), '振替休日'); // 5/3(日)→5/4,5/5 が祝日のため 5/6
  assert.equal(holidayName(2027, 3, 22), '振替休日'); // 3/21(日) の振替
});

test('国民の休日を判定する', () => {
  assert.equal(holidayName(2026, 9, 22), '国民の休日'); // 敬老の日(21)と秋分(23)に挟まれる
  assert.equal(holidayName(2027, 9, 21), null); // 2027 は該当しない
});

test('五輪特例年を扱う', () => {
  assert.equal(holidayName(2020, 7, 23), '海の日');
  assert.equal(holidayName(2020, 7, 24), 'スポーツの日');
  assert.equal(holidayName(2021, 8, 8), '山の日');
  assert.equal(holidayName(2020, 7, 20), null);
});

test('祝日は土日祝ダイヤ扱いになる', () => {
  assert.deepEqual(classifyDay(day(2026, 9, 21)), { type: 'holiday', holiday: '敬老の日' });
  assert.deepEqual(classifyDay(day(2026, 9, 22)), { type: 'holiday', holiday: '国民の休日' });
  assert.deepEqual(classifyDay(day(2026, 9, 17)), { type: 'weekday', holiday: null }); // 木曜
  assert.deepEqual(classifyDay(day(2026, 9, 19)), { type: 'holiday', holiday: null }); // 土曜
  assert.deepEqual(classifyDay(day(2026, 9, 20)), { type: 'holiday', holiday: null }); // 日曜
});

test('対応範囲外の年は祝日なしとして扱う', () => {
  assert.equal(holidaysInYear(1990).size, 0);
  assert.equal(holidaysInYear(2200).size, 0);
});
