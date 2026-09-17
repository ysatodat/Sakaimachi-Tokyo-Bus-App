/**
 * ページごとの OGP 画像を生成する。`npm run gen:og` で実行。
 * SNS のプレビューは正方形/横長でトリミングされることがあるため、
 * 文字は中央の安全領域に収める。
 */
import { writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const WIDTH = 1200;
const HEIGHT = 630;

const escapeXml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const busMark = `
  <g transform="translate(96 84) scale(1.5)">
    <rect x="15" y="14" width="34" height="30" rx="7" fill="#ffffff"/>
    <circle cx="21" cy="47" r="4.5" fill="#ffffff"/>
    <circle cx="43" cy="47" r="4.5" fill="#ffffff"/>
    <rect x="19" y="19" width="26" height="11" rx="3" fill="#1436b8"/>
  </g>`;

const template = ({ eyebrow, title, subtitle }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2f6bff"/>
      <stop offset="100%" stop-color="#11298c"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${WIDTH}" height="10" fill="#ffffff" opacity="0.18"/>
  ${busMark}
  <text x="200" y="128" font-family="IPAGothic, sans-serif" font-size="30" fill="#ffffff" opacity="0.82">${escapeXml(
    eyebrow
  )}</text>
  <text x="96" y="300" font-family="IPAGothic, sans-serif" font-size="74" font-weight="bold" fill="#ffffff">${escapeXml(
    title
  )}</text>
  <text x="96" y="378" font-family="IPAGothic, sans-serif" font-size="34" fill="#ffffff" opacity="0.88">${escapeXml(
    subtitle
  )}</text>
  <rect x="96" y="440" width="180" height="6" rx="3" fill="#ffffff" opacity="0.5"/>
  <text x="96" y="530" font-family="IPAGothic, sans-serif" font-size="27" fill="#ffffff" opacity="0.72">sakaimachi-bus.amida-des.com</text>
</svg>`;

const PAGES = [
  {
    file: 'og.png',
    eyebrow: '境町 ⇄ 東京 高速バス ミニ（非公式）',
    title: '次の便が、開いた瞬間に。',
    subtitle: '境町 ⇄ 王子駅・東京駅／平日・土日祝ダイヤ自動判定'
  },
  {
    file: 'og-sakai-to-tokyo.png',
    eyebrow: '境町 ⇄ 東京 高速バス ミニ（非公式）',
    title: '境町 → 東京 の次の便',
    subtitle: '境町高速バスターミナル発／王子駅・東京駅ゆき'
  },
  {
    file: 'og-tokyo-to-sakai.png',
    eyebrow: '境町 ⇄ 東京 高速バス ミニ（非公式）',
    title: '東京 → 境町 の次の便',
    subtitle: '東京駅八重洲南口・王子駅発／境町ゆき'
  },
  {
    file: 'og-timetable.png',
    eyebrow: '境町 ⇄ 東京 高速バス ミニ（非公式）',
    title: '全便時刻表',
    subtitle: '平日ダイヤ・土日祝ダイヤをまとめて掲載'
  },
  {
    file: 'og-guide.png',
    eyebrow: '境町 ⇄ 東京 高速バス ミニ（非公式）',
    title: '乗車ガイド',
    subtitle: 'のりば・支払い・当日の流れ'
  },
  {
    file: 'og-faq.png',
    eyebrow: '境町 ⇄ 東京 高速バス ミニ（非公式）',
    title: 'よくある質問',
    subtitle: '祝日ダイヤ・オフライン利用・データの更新方針'
  }
];

async function main() {
  for (const page of PAGES) {
    const svg = template(page);
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
    const out = new URL(`../public/${page.file}`, import.meta.url);
    await writeFile(out, resvg.render().asPng());
    console.log('Generated', page.file);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
