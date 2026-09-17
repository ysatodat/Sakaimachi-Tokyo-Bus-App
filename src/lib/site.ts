/** サイト全体で共有する定数と URL 組み立て。各ページでの重複を避ける。 */

const rawSite = import.meta.env.PUBLIC_SITE_URL ?? 'https://sakaimachi-bus.amida-des.com';
const rawBase = import.meta.env.PUBLIC_BASE_PATH ?? '/';

/** 末尾スラッシュ付きの絶対 URL（例: https://example.com/app/） */
export const SITE_URL = new URL(rawBase, rawSite).toString();

/** 先頭スラッシュ付き・末尾スラッシュなしのベースパス（ルート直下なら ''） */
export const BASE_PATH = rawBase === '/' ? '' : `/${rawBase.replace(/^\/|\/$/g, '')}`;

export const SITE = {
  name: '境町 ↔ 東京 高速バス ミニ',
  shortName: '境町バス',
  author: 'Amida Design（非公式）',
  twitter: '@gmkz_com',
  repository: 'https://github.com/ysatodat/Sakaimachi-Tokyo-Bus-App',
  publisher: { name: 'Amida Design', url: 'https://amida-des.com' }
} as const;

/** サイト内パスを絶対 URL にする */
export const buildUrl = (slug = '') => new URL(slug.replace(/^\//, ''), SITE_URL).toString();

/** サイト内パスをベースパス付きの相対パスにする */
export const withBase = (slug = '') => `${BASE_PATH}/${slug.replace(/^\//, '')}`;

export const PAGES = {
  home: '',
  sakaiToTokyo: 'sakai-to-tokyo/',
  tokyoToSakai: 'tokyo-to-sakai/',
  timetable: 'timetable/',
  guide: 'guide/',
  faq: 'faq/'
} as const;

export const OFFICIAL_LINKS = {
  town: 'https://www.town.ibaraki-sakai.lg.jp/page/page002622.html',
  kantetsu: 'https://www.kantetsu.co.jp/highwaybus/sakai-tokyo',
  jrbus: 'https://www.jrbuskanto.co.jp/',
  transit: 'https://transit.yahoo.co.jp/'
} as const;
