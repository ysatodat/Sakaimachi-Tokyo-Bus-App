/**
 * ブラウザ実機での回帰テスト。`npm run test:e2e`（事前に dist を配信しておくこと）。
 *
 * 本番で実際に壊れていた次の 3 つを毎回確かめるのが目的:
 *   1. ハイドレーション不整合（コンソールエラー）
 *   2. Service Worker が登録されずオフラインで開けない
 *   3. 基準時刻が localStorage に焼き付き、次発が誤表示される
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const EXEC = process.env.E2E_CHROMIUM_PATH || undefined;
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, locale: 'ja-JP', timezoneId: 'Asia/Tokyo',
  acceptDownloads: true
});
const errors = [];
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// 1. 次発ヒーローが実データで描画されている
const heroTime = await page.locator('.hero__time').first().innerText();
check('hero shows a real HH:mm', /^\d{2}:\d{2}$/.test(heroTime.trim()), heroTime);

// 2. 当日の一覧が全便ぶん出ている
const rows = await page.locator('.departure-list li').count();
check('day list renders all trips', rows === 8, `rows=${rows}`);

// 3. 方向切替
await page.getByRole('radio', { name: /東京 → 境町/ }).click();
await page.waitForTimeout(400);
const legNames = await page.locator('.leg__name').allInnerTexts();
check('direction switch updates the hero route', legNames[0].includes('東京'), legNames.join(' / '));
const stopRadios = await page.getByRole('radio', { name: /王子駅|東京駅/ }).count();
check('boarding stop selector appears for 東京→境町', stopRadios === 2, `count=${stopRadios}`);

// 4. 乗車停留所を王子に変えると発車時刻が変わる
const beforeStop = await page.locator('.hero__time').first().innerText();
await page.getByRole('radio', { name: '王子駅' }).click();
await page.waitForTimeout(400);
const afterStop = await page.locator('.hero__time').first().innerText();
check('boarding stop changes the departure time', beforeStop !== afterStop, `${beforeStop} -> ${afterStop}`);

// 5. URL に状態が載る
check('URL reflects state', page.url().includes('dir=tokyo_to_sakai') && page.url().includes('from=oji'), page.url());

// 6. 祝日（2026-09-21 敬老の日）は土日祝ダイヤ
await page.goto(BASE + '/sakai-to-tokyo/?date=2026-09-21', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const hint = await page.locator('#dayplan-heading .section-title__hint').innerText();
check('holiday uses the weekend/holiday diagram', hint.includes('土日祝') && hint.includes('敬老の日'), hint);
const firstRowHoliday = await page.locator('.departure-list li .departure__arrival').first().innerText();
check('holiday arrival times are used', firstRowHoliday.includes('06:15') && firstRowHoliday.includes('06:50'), firstRowHoliday);

// 7. 平日は平日ダイヤ
await page.goto(BASE + '/sakai-to-tokyo/?date=2026-09-24', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const hintWeekday = await page.locator('#dayplan-heading .section-title__hint').innerText();
const firstRowWeekday = await page.locator('.departure-list li .departure__arrival').first().innerText();
check('weekday uses the weekday diagram', hintWeekday.includes('平日') && firstRowWeekday.includes('06:25'), `${hintWeekday} | ${firstRowWeekday}`);

// 8. 基準時刻は保存されない（旧バグの回帰テスト）
const stored = await page.evaluate(() => localStorage.getItem('sbm:prefs:v2'));
check('preferences never persist a base time', stored !== null && !/nowValue|"time"/.test(stored), stored);

// 9. 旧キーからの移行
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('sbm:user-preferences', JSON.stringify({ direction: 'tokyo_to_sakai', tokyoStop: 'oji', nowValue: '03:00' }));
});
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const migrated = await page.evaluate(() => ({
  v2: localStorage.getItem('sbm:prefs:v2'), legacy: localStorage.getItem('sbm:user-preferences')
}));
check('legacy prefs migrate without the stale base time',
  migrated.legacy === null && migrated.v2 && JSON.parse(migrated.v2).direction === 'tokyo_to_sakai' && !/03:00/.test(migrated.v2),
  JSON.stringify(migrated));

// 10. テーマ切替
await page.getByRole('button', { name: /表示テーマ/ }).click();
await page.waitForTimeout(250);
const theme1 = await page.evaluate(() => document.documentElement.dataset.theme);
await page.getByRole('button', { name: /表示テーマ/ }).click();
await page.waitForTimeout(250);
const theme2 = await page.evaluate(() => document.documentElement.dataset.theme);
check('theme toggle cycles system → light → dark', theme1 === 'light' && theme2 === 'dark', `${theme1} -> ${theme2}`);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check('theme persists across reloads', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');

// 11. 徒歩時間でステータスが変わる
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.fill('#walk-minutes', '18');
await page.waitForTimeout(400);
const heroMeta = await page.locator('.hero__meta').first().innerText();
check('walk minutes feeds the boarding calculation', heroMeta.includes('18分'), heroMeta.replace(/\s+/g, ' '));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
check('walk minutes persists across reloads', (await page.inputValue('#walk-minutes')) === '18');

// 12. .ics の書き出し
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 8000 }),
  page.locator('.hero__actions button').first().click()
]);
const icsPath = await download.path();
const ics = readFileSync(icsPath, 'utf8');
check('calendar export produces a valid VEVENT',
  ics.startsWith('BEGIN:VCALENDAR') && ics.includes('BEGIN:VEVENT') && /DTSTART:\d{8}T\d{6}Z/.test(ics) && ics.includes('BEGIN:VALARM'),
  ics.split('\r\n').slice(0, 3).join(' | '));

// 13. Service Worker が有効になる
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const swActive = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'no registration';
  await navigator.serviceWorker.ready;
  return reg.active ? 'active' : 'not active';
});
check('service worker registers and activates', swActive === 'active', swActive);

// 14. オフラインでもページが開ける
await page.waitForTimeout(1500);
await ctx.setOffline(true);
const offlineResponse = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }).catch((e) => e.message);
const offlineHero = await page.locator('.hero__time').first().innerText().catch(() => '');
check('page still works offline', typeof offlineResponse !== 'string' && /^\d{2}:\d{2}$/.test(offlineHero.trim()),
  `${typeof offlineResponse === 'string' ? offlineResponse : 'loaded'} hero=${offlineHero}`);
await ctx.setOffline(false);

check('no console errors anywhere', errors.length === 0, errors.slice(0, 4).join(' | '));

await browser.close();
let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
