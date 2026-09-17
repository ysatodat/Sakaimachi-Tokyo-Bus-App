/**
 * 日本の国民の祝日・休日判定。
 *
 * 外部依存を持たず（オフライン／バンドルサイズ優先）、祝日法の規定をそのまま実装する。
 * - 固定日の祝日
 * - ハッピーマンデー（第 N 月曜）
 * - 春分の日 / 秋分の日（1980〜2099 年で有効な近似式）
 * - 振替休日（祝日が日曜の場合、直後の祝日でない日）
 * - 国民の休日（祝日に挟まれた平日）
 * - 2019 年の即位関連および 2020/2021 年のオリンピック特例
 *
 * 対応範囲は 2000 年以降。それ以前は「祝日ではない」として扱う（本アプリの用途では十分）。
 */

export type HolidayName = string;

const pad = (n: number) => n.toString().padStart(2, '0');

/** ローカルタイムに依存しない YYYY-MM-DD キー */
export const dateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;

/** その年・月の第 nth 月曜日の日を返す */
function nthMonday(year: number, month: number, nth: number): number {
  // Date.UTC を使い、実行環境のタイムゾーンに左右されないようにする
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=日
  const offset = (8 - firstDow) % 7; // 月曜(1)までの日数
  return 1 + offset + (nth - 1) * 7;
}

/** 春分日（1980〜2099 で有効） */
function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 秋分日（1980〜2099 で有効） */
function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2099;

const cache = new Map<number, Map<string, HolidayName>>();

/** 指定年の「国民の祝日」（振替休日・国民の休日を含む）をすべて返す */
export function holidaysInYear(year: number): Map<string, HolidayName> {
  const cached = cache.get(year);
  if (cached) return cached;

  const map = new Map<string, HolidayName>();
  if (year < MIN_YEAR || year > MAX_YEAR) {
    cache.set(year, map);
    return map;
  }

  const set = (month: number, day: number, name: HolidayName) => {
    map.set(dateKey(year, month, day), name);
  };

  set(1, 1, '元日');
  set(1, nthMonday(year, 1, 2), '成人の日');
  set(2, 11, '建国記念の日');
  if (year >= 2020) set(2, 23, '天皇誕生日');
  set(3, vernalEquinoxDay(year), '春分の日');
  set(4, 29, year >= 2007 ? '昭和の日' : 'みどりの日');
  set(5, 3, '憲法記念日');
  if (year >= 2007) set(5, 4, 'みどりの日');
  set(5, 5, 'こどもの日');

  // 海の日 / スポーツ（体育）の日 / 山の日：五輪特例あり
  if (year === 2020) {
    set(7, 23, '海の日');
    set(7, 24, 'スポーツの日');
    set(8, 10, '山の日');
  } else if (year === 2021) {
    set(7, 22, '海の日');
    set(7, 23, 'スポーツの日');
    set(8, 8, '山の日');
  } else {
    set(7, year >= 2003 ? nthMonday(year, 7, 3) : 20, '海の日');
    if (year >= 2016) set(8, 11, '山の日');
    set(10, nthMonday(year, 10, 2), year >= 2020 ? 'スポーツの日' : '体育の日');
  }

  set(9, nthMonday(year, 9, 3), '敬老の日');
  set(9, autumnalEquinoxDay(year), '秋分の日');
  set(11, 3, '文化の日');
  set(11, 23, '勤労感謝の日');
  if (year <= 2018) set(12, 23, '天皇誕生日');

  // 2019 年の即位関連の特例
  if (year === 2019) {
    set(5, 1, '天皇の即位の日');
    set(10, 22, '即位礼正殿の儀の行われる日');
  }

  // 振替休日：祝日が日曜のとき、直後の「祝日でない日」が休日になる
  const base = [...map.keys()].sort();
  for (const key of base) {
    const [y, m, d] = key.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCDay() !== 0) continue;
    const cursor = new Date(date);
    do {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } while (map.has(dateKey(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate())));
    if (cursor.getUTCFullYear() === year) {
      map.set(dateKey(year, cursor.getUTCMonth() + 1, cursor.getUTCDate()), '振替休日');
    }
  }

  // 国民の休日：前後を祝日に挟まれた平日（日曜・振替休日を除く）
  for (const key of [...map.keys()].sort()) {
    const [y, m, d] = key.split('-').map(Number) as [number, number, number];
    const prev = new Date(Date.UTC(y, m - 1, d));
    const next = new Date(Date.UTC(y, m - 1, d + 2));
    const middle = new Date(Date.UTC(y, m - 1, d + 1));
    const middleKey = dateKey(middle.getUTCFullYear(), middle.getUTCMonth() + 1, middle.getUTCDate());
    const nextKey = dateKey(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
    if (!map.has(nextKey) || map.has(middleKey)) continue;
    if (middle.getUTCDay() === 0 || middle.getUTCDay() === 1) continue; // 日曜と振替休日対象は除外
    if (prev.getUTCFullYear() !== year || middle.getUTCFullYear() !== year) continue;
    map.set(middleKey, '国民の休日');
  }

  cache.set(year, map);
  return map;
}

/** 祝日名を返す（祝日でなければ null） */
export function holidayName(year: number, month: number, day: number): HolidayName | null {
  return holidaysInYear(year).get(dateKey(year, month, day)) ?? null;
}

export type DayType = 'weekday' | 'holiday';

/**
 * ダイヤ判定に使う「日種別」。
 * 土曜・日曜・国民の祝日（振替休日を含む）は土日祝ダイヤ扱い。
 *
 * @param parts 年・月(1-12)・日・曜日(0=日)。JST で算出した値を渡すこと。
 */
export function classifyDay(parts: { year: number; month: number; day: number; weekday: number }): {
  type: DayType;
  holiday: HolidayName | null;
} {
  const holiday = holidayName(parts.year, parts.month, parts.day);
  const isWeekend = parts.weekday === 0 || parts.weekday === 6;
  return { type: holiday || isWeekend ? 'holiday' : 'weekday', holiday };
}
