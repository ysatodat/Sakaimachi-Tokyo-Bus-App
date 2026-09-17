import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type ThemePreference } from '../lib/prefs.ts';
import { trackEvent } from '../lib/analytics.ts';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

const LABEL: Record<ThemePreference, { icon: string; text: string }> = {
  system: { icon: '🖥', text: '端末の設定に合わせる' },
  light: { icon: '☀️', text: 'ライトモード' },
  dark: { icon: '🌙', text: 'ダークモード' }
};

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

/**
 * テーマ切替。SSR とハイドレーション直後の描画を一致させるため、
 * マウントが終わるまでは既定値（システム）の見た目で描画する。
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_PREFERENCES.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadPreferences();
    if (stored.theme) setTheme(stored.theme);
    setMounted(true);
  }, []);

  const cycle = useCallback(() => {
    setTheme((current) => {
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
      applyTheme(next);
      savePreferences({ ...DEFAULT_PREFERENCES, ...loadPreferences(), theme: next });
      trackEvent('theme_change', { theme: next });
      return next;
    });
  }, []);

  const current = LABEL[mounted ? theme : 'system'];

  return (
    <button
      type="button"
      className="icon-button"
      onClick={cycle}
      title={`表示テーマ: ${current.text}（クリックで切替）`}
      aria-label={`表示テーマを切り替える。現在は${current.text}`}
    >
      <span aria-hidden="true">{current.icon}</span>
    </button>
  );
}
