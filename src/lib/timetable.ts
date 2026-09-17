/**
 * 時刻表データのスキーマと正規化。
 *
 * 旧フォーマット（routes[].trips[].dep / arr_oji / arr_tokyo …）と
 * 新フォーマット（routes[].trips[].times）の双方を受け取り、
 * アプリ内部で扱う単一の形に揃える。リモート JSON（TIMETABLE_URL）が
 * 旧フォーマットのままでも壊れないようにするための互換レイヤー。
 */

import { parseHHmm } from './jst.ts';

export type StopId = 'sakai' | 'oji' | 'tokyo';
export type RouteId = 'sakai_to_tokyo' | 'tokyo_to_sakai';
export type DayType = 'weekday' | 'holiday';

/** 単一時刻、または平日/土日祝で異なる時刻 */
export type TimeSpec = string | { weekday: string; holiday: string };

export type StopInfo = {
  id: StopId;
  /** 正式名称 */
  name: string;
  /** UI で使う短い名称 */
  short: string;
  /** のりばの説明 */
  platform?: string;
  /** 乗り場へのアクセスメモ */
  access?: string;
  mapUrl?: string;
};

export type NormalizedTrip = {
  /** 安定した識別子（共有 URL やカレンダー出力に使う） */
  id: string;
  /** 停留所ごとの通過時刻（0:00 からの経過分）。平日/土日祝で別値 */
  times: Record<DayType, Partial<Record<StopId, number>>>;
  note?: string;
};

export type NormalizedRoute = {
  id: RouteId;
  name: string;
  /** 経路順の停留所 */
  stops: StopId[];
  /** 乗車可能な停留所（この順で選択 UI を出す） */
  boardingStops: StopId[];
  /** 降車側の代表停留所 */
  alightStop: StopId;
  trips: NormalizedTrip[];
};

export type SourceLink = { label: string; url: string };

export type TimetableMeta = {
  /** ダイヤ改定日 (YYYY-MM-DD) */
  revision: string;
  /** 人間向けの改定表記 */
  revisionLabel: string;
  /** 最後に公式情報と突き合わせた日 (YYYY-MM-DD)。未確認なら null */
  verifiedOn: string | null;
  /** この日数を過ぎたら「要確認」を表示する */
  staleAfterDays: number;
  timezone: string;
  note: string;
  operators: SourceLink[];
  sources: SourceLink[];
  /** 公式に告知済みだがデータへ未反映の改定 */
  pendingRevision?: {
    date: string;
    label: string;
    summary: string;
    url: string;
  } | null;
};

export type FareInfo = {
  asOf: string;
  verified: boolean;
  note: string;
  sections: { from: StopId; to: StopId; adult: number; child: number }[];
  tickets: { label: string; detail: string }[];
  payments: string[];
};

export type NormalizedTimetable = {
  meta: TimetableMeta;
  stops: Record<StopId, StopInfo>;
  fares: FareInfo | null;
  routes: NormalizedRoute[];
};

const DEFAULT_STOPS: Record<StopId, StopInfo> = {
  sakai: { id: 'sakai', name: '境町高速バスターミナル', short: '境町' },
  oji: { id: 'oji', name: '王子駅', short: '王子' },
  tokyo: { id: 'tokyo', name: '東京駅', short: '東京' }
};

const ROUTE_DEFAULTS: Record<RouteId, Pick<NormalizedRoute, 'name' | 'stops' | 'boardingStops' | 'alightStop'>> = {
  sakai_to_tokyo: {
    name: '境町 → 東京',
    stops: ['sakai', 'oji', 'tokyo'],
    boardingStops: ['sakai'],
    alightStop: 'tokyo'
  },
  tokyo_to_sakai: {
    name: '東京 → 境町',
    stops: ['tokyo', 'oji', 'sakai'],
    boardingStops: ['tokyo', 'oji'],
    alightStop: 'sakai'
  }
};

const resolve = (spec: TimeSpec | undefined, dayType: DayType): number | undefined => {
  if (spec == null) return undefined;
  const raw = typeof spec === 'string' ? spec : spec[dayType] ?? spec.weekday ?? spec.holiday;
  if (!raw) return undefined;
  return parseHHmm(raw);
};

/** 旧フォーマットの 1 便を停留所マップへ変換する */
function legacyTimes(routeId: RouteId, trip: Record<string, unknown>): Partial<Record<StopId, TimeSpec>> {
  if (routeId === 'sakai_to_tokyo') {
    return {
      sakai: trip.dep as TimeSpec,
      oji: trip.arr_oji as TimeSpec,
      tokyo: trip.arr_tokyo as TimeSpec
    };
  }
  return {
    tokyo: trip.dep_tokyo as TimeSpec,
    oji: trip.dep_oji as TimeSpec,
    sakai: trip.arr_sakai as TimeSpec
  };
}

const FALLBACK_META: TimetableMeta = {
  revision: '1970-01-01',
  revisionLabel: '改定日不明',
  verifiedOn: null,
  staleAfterDays: 180,
  timezone: 'Asia/Tokyo',
  note: '',
  operators: [],
  sources: [],
  pendingRevision: null
};

/** 任意の入力を内部表現へ正規化する。壊れた入力でも例外を投げない */
export function normalizeTimetable(input: unknown): NormalizedTimetable {
  const raw = (input ?? {}) as Record<string, any>;
  const meta: TimetableMeta = {
    ...FALLBACK_META,
    ...(raw.meta ?? {}),
    // 旧フォーマットは calendar.note に注記を持っていた
    note: raw.meta?.note ?? raw.calendar?.note ?? FALLBACK_META.note
  };

  const stops: Record<StopId, StopInfo> = { ...DEFAULT_STOPS };
  for (const [id, value] of Object.entries(raw.stops ?? {})) {
    if (id in stops) {
      stops[id as StopId] = { ...stops[id as StopId], ...(value as StopInfo), id: id as StopId };
    }
  }

  const routes: NormalizedRoute[] = [];
  for (const route of Array.isArray(raw.routes) ? raw.routes : []) {
    const routeId = route?.id as RouteId;
    if (routeId !== 'sakai_to_tokyo' && routeId !== 'tokyo_to_sakai') continue;
    const defaults = ROUTE_DEFAULTS[routeId];
    const trips: NormalizedTrip[] = [];

    for (const [index, trip] of (Array.isArray(route.trips) ? route.trips : []).entries()) {
      const specs: Partial<Record<StopId, TimeSpec>> = trip?.times ?? legacyTimes(routeId, trip ?? {});
      const times = { weekday: {}, holiday: {} } as NormalizedTrip['times'];
      let usable = false;
      for (const dayType of ['weekday', 'holiday'] as DayType[]) {
        for (const stopId of defaults.stops) {
          const minutes = resolve(specs[stopId], dayType);
          if (minutes == null) continue;
          times[dayType][stopId] = minutes;
          usable = true;
        }
      }
      if (!usable) continue;
      trips.push({ id: trip?.id ?? `${routeId}-${index + 1}`, times, note: trip?.note });
    }

    // 始発停留所の出発時刻順に整列させる（データ側の並びに依存しない）
    const origin = defaults.stops[0]!;
    trips.sort((a, b) => (a.times.weekday[origin] ?? 0) - (b.times.weekday[origin] ?? 0));

    routes.push({
      id: routeId,
      name: route.name ?? defaults.name,
      stops: defaults.stops,
      boardingStops: defaults.boardingStops,
      alightStop: defaults.alightStop,
      trips
    });
  }

  return { meta, stops, fares: raw.fares ?? null, routes };
}

export const findRoute = (timetable: NormalizedTimetable, id: RouteId) =>
  timetable.routes.find((route) => route.id === id) ?? null;
