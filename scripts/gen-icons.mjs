/** favicon.svg から PWA/ホーム画面用の PNG を書き出す。`npm run gen:icons` で実行。 */
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

async function render(svgPath, outPath, size) {
  const svg = await readFile(svgPath, 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  await writeFile(outPath, resvg.render().asPng());
  console.log('Generated', outPath.pathname ?? outPath, `${size}px`);
}

const publicDir = (name) => new URL(`../public/${name}`, import.meta.url);

async function main() {
  const base = publicDir('favicon.svg');
  const maskable = publicDir('icon-maskable.svg');
  await render(base, publicDir('apple-touch-icon.png'), 180);
  await render(base, publicDir('icon-192.png'), 192);
  await render(base, publicDir('icon-512.png'), 512);
  await render(maskable, publicDir('icon-maskable-512.png'), 512);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
