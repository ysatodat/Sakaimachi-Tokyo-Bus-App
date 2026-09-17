/**
 * Asia/Tokyo の「壁時計」を扱うユーティリティ。
 *
 * タイムゾーン付きの日時ライブラリを持ち込まず Intl だけで完結させることで、
 * バンドルを小さく保ちつつ、実行環境のローカルタイムゾーンに一切依存しない計算を行う。
 * アプリ内の時刻はすべて「JST の 0:00 からの経過分」で表現する。
 */

export const ZONE = 'Asia/Tokyo';

export type JstDate = {
  /** 西暦 */
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  /** 0=日曜 */
  weekday: number;
};

export type JstMoment = JstDate & {
  hour: number;
  minute: number;
  second: number;
  /** 0:00 からの経過分 */
  minutesOfDay: number;
  /** 0:00 からの経過秒 */
  secondsOfDay: number;
};

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

/** 曜日は Y/M/D から算出する（Intl の曜日名パースを避ける） */
export const weekdayOf = (year: number, month: number, day: number): number =>
  new Date(Date.UTC(year, month - 1, day)).getUTCDay();

/** Date（絶対時刻）を JST の壁時計に変換する */
export function toJst(date: Date): JstMoment {
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
  return {
    year,
    month,
    day,
    weekday: weekdayOf(year, month, day),
    hour,
    minute,
    second,
    minutesOfDay: hour * 60 + minute,
    secondsOfDay: hour * 3600 + minute * 60 + second
  };
}

export const nowJst = () => toJst(new Date());

const pad2 = (n: number) => n.toString().padStart(2, '0');

/** YYYY-MM-DD */
export const toIsoDate = (date: JstDate) => `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;

/** YYYY-MM-DD をパースする（不正な値は null） */
export function fromIsoDate(value: string): JstDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day, weekday: probe.getUTCDay() };
}

/** 日付を前後に動かす */
export function addDays(date: JstDate, amount: number): JstDate {
  const probe = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return {
    year: probe.getUTCFullYear(),
    month: probe.getUTCMonth() + 1,
    day: probe.getUTCDate(),
    weekday: probe.getUTCDay()
  };
}

/** 2 つの日付の差（日数） */
export function diffDays(from: JstDate, to: JstDate): number {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / 86_400_000);
}

/** "HH:mm" → 0:00 からの経過分。"25:10" のような 24 時以降の表記も受け付ける */
export function parseHHmm(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`invalid time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 経過分 → "HH:mm"（24 時以降は 0 時台に折り返す） */
export function formatHHmm(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** 例: 9月17日(木) */
export const formatDateLabel = (date: JstDate) =>
  `${date.month}月${date.day}日(${WEEKDAY_LABELS[date.weekday]})`;

/** 例: 2026/09/17 */
export const formatDateSlash = (date: JstDate) =>
  `${date.year}/${pad2(date.month)}/${pad2(date.day)}`;

/** JST の壁時計を UTC の絶対時刻（Date）に変換する。JST は固定 +09:00 */
export function jstToDate(date: JstDate, minutesOfDay: number): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0) + (minutesOfDay - 540) * 60_000);
}
