import fallbackTimetable from '../data/timetable.sample.json';

type Timetable = typeof fallbackTimetable;

const TIMETABLE_URL = import.meta.env.TIMETABLE_URL ?? import.meta.env.PUBLIC_TIMETABLE_URL ?? '';

export async function loadTimetable(): Promise<Timetable> {
  if (TIMETABLE_URL) {
    try {
      const response = await fetch(TIMETABLE_URL);
      if (!response.ok) {
        console.warn('[timetable] remote fetch failed with', response.status, response.statusText);
      } else {
        const json = await response.json();
        if (json && Array.isArray(json.routes)) {
          return json as Timetable;
        }
        console.warn('[timetable] remote data does not contain routes array');
      }
    } catch (error) {
      console.warn('[timetable] failed to fetch remote timetable', error);
    }
  }
  return fallbackTimetable as Timetable;
}

export type { Timetable };
