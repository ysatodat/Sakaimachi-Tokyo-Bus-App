import rawTimetable from '../data/timetable.json';
import { normalizeTimetable, type NormalizedTimetable } from './timetable.ts';

const TIMETABLE_URL = import.meta.env.TIMETABLE_URL ?? import.meta.env.PUBLIC_TIMETABLE_URL ?? '';

/**
 * ビルド時に時刻表を読み込む。
 * TIMETABLE_URL があればリモートを優先し、取得に失敗した場合は同梱データにフォールバックする。
 * 旧フォーマットのリモートデータも normalizeTimetable が吸収する。
 */
export async function loadTimetable(): Promise<NormalizedTimetable> {
  if (TIMETABLE_URL) {
    try {
      const response = await fetch(TIMETABLE_URL);
      if (!response.ok) {
        console.warn('[timetable] remote fetch failed with', response.status, response.statusText);
      } else {
        const json = await response.json();
        const normalized = normalizeTimetable(json);
        if (normalized.routes.length > 0) return normalized;
        console.warn('[timetable] remote data contains no usable routes; falling back');
      }
    } catch (error) {
      console.warn('[timetable] failed to fetch remote timetable', error);
    }
  }
  return normalizeTimetable(rawTimetable);
}

export type { NormalizedTimetable as Timetable };
