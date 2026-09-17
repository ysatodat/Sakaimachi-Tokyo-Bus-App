/** 表示用の文字列整形。数値を「読み下せる日本語」に変える責務だけを持つ。 */

/** 残り時間を人が読める形に。例: 「3分後」「1時間5分後」「2日後」 */
export function formatRelative(secondsUntil: number): string {
  if (!Number.isFinite(secondsUntil)) return '';
  if (secondsUntil < 0) return '発車済み';
  const minutes = Math.floor(secondsUntil / 60);
  if (minutes < 1) return 'まもなく';
  if (minutes < 60) return `${minutes}分後`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest === 0 ? `${hours}時間後` : `${hours}時間${rest}分後`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days}日後` : `${days}日${restHours}時間後`;
}

/** カウントダウン。1 時間未満は mm:ss、それ以上は h:mm:ss */
export function formatCountdown(secondsUntil: number): string {
  const total = Math.max(0, Math.floor(secondsUntil));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** スクリーンリーダー向けの、秒を含まない粗い残り時間 */
export function formatCountdownForSpeech(secondsUntil: number): string {
  if (secondsUntil < 0) return '発車済み';
  const minutes = Math.floor(secondsUntil / 60);
  if (minutes < 1) return 'まもなく発車します';
  if (minutes < 60) return `あと約${minutes}分で発車します`;
  const hours = Math.floor(minutes / 60);
  return `あと約${hours}時間${minutes % 60}分で発車します`;
}

/** 所要時間。例: 「1時間40分」 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
}
