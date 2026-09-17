/**
 * 「いつ・どの便に乗れるか」を計算するコア。
 *
 * すべての時刻は JST の壁時計（0:00 からの経過分）で扱い、
 * 日をまたぐ判定は日付そのものをずらして行う。これにより
 * 実行環境のタイムゾーンやサマータイムに一切依存しない。
 */

import { classifyDay } from './holidays.ts';
import { addDays, diffDays, type JstDate, type JstMoment } from './jst.ts';
import type { DayType, NormalizedTimetable, RouteId, StopId } from './timetable.ts';
import { findRoute } from './timetable.ts';

export type DayInfo = {
  date: JstDate;
  dayType: DayType;
  holiday: string | null;
};

export type StopTime = { stop: StopId; minutes: number };

export type Departure = {
  tripId: string;
  routeId: RouteId;
  /** 運行日 */
  date: JstDate;
  dayType: DayType;
  holiday: string | null;
  boardStop: StopId;
  alightStop: StopId;
  /** 乗車停留所の発車時刻（JST 0:00 からの経過分） */
  departureMinutes: number;
  /** 降車停留所の到着時刻 */
  arrivalMinutes: number;
  /** 所要時間（分） */
  durationMinutes: number;
  /** 経路上の全停留所の時刻（乗車停留所以降） */
  stopTimes: StopTime[];
  note?: string;
};

export type DepartureWithCountdown = Departure & {
  /** 基準時刻からの残り秒（負なら発車済み） */
  secondsUntil: number;
  /** 残り分（切り捨て、負なら発車済み） */
  minutesUntil: number;
};

/** 日付から運行ダイヤ（平日/土日祝）を判定する */
export function dayInfo(date: JstDate): DayInfo {
  const { type, holiday } = classifyDay(date);
  return { date, dayType: type, holiday };
}

/** 指定日・指定方向・指定乗車停留所の全便を、発車順に返す */
export function departuresOn(
  timetable: NormalizedTimetable,
  routeId: RouteId,
  boardStop: StopId,
  date: JstDate
): Departure[] {
  const route = findRoute(timetable, routeId);
  if (!route) return [];
  const info = dayInfo(date);
  const boardIndex = route.stops.indexOf(boardStop);
  if (boardIndex < 0) return [];

  const result: Departure[] = [];
  for (const trip of route.trips) {
    const times = trip.times[info.dayType];
    const departureMinutes = times[boardStop];
    if (departureMinutes == null) continue;

    const stopTimes: StopTime[] = [];
    for (const stop of route.stops) {
      const minutes = times[stop];
      if (minutes == null) continue;
      stopTimes.push({ stop, minutes });
    }

    const arrivalMinutes = times[route.alightStop];
    if (arrivalMinutes == null) continue;

    result.push({
      tripId: trip.id,
      routeId,
      date,
      dayType: info.dayType,
      holiday: info.holiday,
      boardStop,
      alightStop: route.alightStop,
      departureMinutes,
      arrivalMinutes,
      durationMinutes: arrivalMinutes - departureMinutes,
      stopTimes,
      note: trip.note
    });
  }

  result.sort((a, b) => a.departureMinutes - b.departureMinutes);
  return result;
}

export type Reference = { date: JstDate; secondsOfDay: number };

export const referenceFrom = (moment: JstMoment): Reference => ({
  date: { year: moment.year, month: moment.month, day: moment.day, weekday: moment.weekday },
  secondsOfDay: moment.secondsOfDay
});

const withCountdown = (departure: Departure, reference: Reference): DepartureWithCountdown => {
  const secondsUntil =
    diffDays(reference.date, departure.date) * 86_400 +
    departure.departureMinutes * 60 -
    reference.secondsOfDay;
  return {
    ...departure,
    secondsUntil,
    minutesUntil: Math.floor(secondsUntil / 60)
  };
};

/**
 * 基準時刻以降に乗れる便を、日をまたいで集める。
 * 最終便を過ぎていても翌日以降の始発が返るため、行き止まりにならない。
 */
export function upcomingDepartures(
  timetable: NormalizedTimetable,
  routeId: RouteId,
  boardStop: StopId,
  reference: Reference,
  options: { limit?: number; searchDays?: number } = {}
): DepartureWithCountdown[] {
  const limit = options.limit ?? 6;
  const searchDays = options.searchDays ?? 4;
  const collected: DepartureWithCountdown[] = [];

  for (let offset = 0; offset < searchDays && collected.length < limit; offset += 1) {
    const date = offset === 0 ? reference.date : addDays(reference.date, offset);
    for (const departure of departuresOn(timetable, routeId, boardStop, date)) {
      const item = withCountdown(departure, reference);
      if (item.secondsUntil < 0) continue;
      collected.push(item);
      if (collected.length >= limit) break;
    }
  }

  return collected;
}

/** 指定日の全便に残り時間を付けて返す（当日の時刻表ビュー用） */
export function timetableForDate(
  timetable: NormalizedTimetable,
  routeId: RouteId,
  boardStop: StopId,
  date: JstDate,
  reference: Reference | null
): DepartureWithCountdown[] {
  return departuresOn(timetable, routeId, boardStop, date).map((departure) =>
    reference
      ? withCountdown(departure, reference)
      : { ...departure, secondsUntil: Number.NaN, minutesUntil: Number.NaN }
  );
}

/** 始発・終バス */
export function serviceSpan(
  timetable: NormalizedTimetable,
  routeId: RouteId,
  boardStop: StopId,
  date: JstDate
): { first: Departure | null; last: Departure | null; count: number } {
  const list = departuresOn(timetable, routeId, boardStop, date);
  return { first: list[0] ?? null, last: list[list.length - 1] ?? null, count: list.length };
}

export type BoardingStatus = 'departed' | 'hurry' | 'tight' | 'comfortable' | 'later';

/**
 * 「バス停まで徒歩 n 分」を踏まえて、その便に間に合うかを判定する。
 * - hurry: 徒歩時間ぴったりか、すでに足りない
 * - tight: 余裕が徒歩時間の半分未満
 * - comfortable: 60 分以内で余裕あり
 * - later: それより先の便
 */
export function boardingStatus(secondsUntil: number, walkMinutes: number): BoardingStatus {
  if (secondsUntil < 0) return 'departed';
  const minutesUntil = secondsUntil / 60;
  const slack = minutesUntil - walkMinutes;
  if (slack <= 0) return 'hurry';
  if (slack <= Math.max(3, walkMinutes * 0.5)) return 'tight';
  if (minutesUntil <= 60) return 'comfortable';
  return 'later';
}

/** データ鮮度の判定 */
export function freshness(
  meta: NormalizedTimetable['meta'],
  today: JstDate
): { stale: boolean; daysSinceVerified: number | null; hasPendingRevision: boolean } {
  const verified = meta.verifiedOn;
  let daysSinceVerified: number | null = null;
  if (verified) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(verified);
    if (match) {
      daysSinceVerified = diffDays(
        { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), weekday: 0 },
        today
      );
    }
  }
  const hasPendingRevision = Boolean(meta.pendingRevision);
  const stale =
    hasPendingRevision || daysSinceVerified == null || daysSinceVerified > meta.staleAfterDays;
  return { stale, daysSinceVerified, hasPendingRevision };
}
