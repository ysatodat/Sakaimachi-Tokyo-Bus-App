/**
 * 利用者の設定。
 *
 * 重要: 「表示基準時刻」は保存しない。旧実装では基準時刻を localStorage に
 * 永続化していたため、2 回目以降の訪問で初回訪問時の時刻が使われ続け、
 * 次発が誤って表示されていた。基準時刻は常にリアルタイム、
 * 手動指定はそのセッション（URL パラメータ）限りとする。
 */

import type { RouteId, StopId } from './timetable.ts';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Preferences = {
  direction: RouteId;
  boardStop: StopId;
  /** バス停までの徒歩時間（分）。間に合うかどうかの判定に使う */
  walkMinutes: number;
  theme: ThemePreference;
};

export const DEFAULT_PREFERENCES: Preferences = {
  direction: 'sakai_to_tokyo',
  boardStop: 'sakai',
  walkMinutes: 5,
  theme: 'system'
};

const STORAGE_KEY = 'sbm:prefs:v2';
const LEGACY_KEY = 'sbm:user-preferences';

const isRouteId = (value: unknown): value is RouteId =>
  value === 'sakai_to_tokyo' || value === 'tokyo_to_sakai';
const isStopId = (value: unknown): value is StopId =>
  value === 'sakai' || value === 'oji' || value === 'tokyo';

export function loadPreferences(): Partial<Preferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));

    // 旧キーからの移行（基準時刻は意図的に捨てる）
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = sanitize({
        direction: parsed?.direction,
        boardStop: parsed?.tokyoStop
      });
      window.localStorage.removeItem(LEGACY_KEY);
      savePreferences({ ...DEFAULT_PREFERENCES, ...migrated });
      return migrated;
    }
  } catch {
    // localStorage が使えない環境（プライベートブラウズ等）では既定値で動く
  }
  return {};
}

function sanitize(input: unknown): Partial<Preferences> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const result: Partial<Preferences> = {};
  if (isRouteId(raw.direction)) result.direction = raw.direction;
  if (isStopId(raw.boardStop)) result.boardStop = raw.boardStop;
  if (typeof raw.walkMinutes === 'number' && Number.isFinite(raw.walkMinutes)) {
    result.walkMinutes = Math.min(60, Math.max(0, Math.round(raw.walkMinutes)));
  }
  if (raw.theme === 'system' || raw.theme === 'light' || raw.theme === 'dark') {
    result.theme = raw.theme;
  }
  return result;
}

export function savePreferences(preferences: Preferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // 保存できなくても動作は継続する
  }
}
