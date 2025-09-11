import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

async function renderFromSvg(svgPath, outPath, size) {
  const svg = await readFile(svgPath, 'utf8');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  await writeFile(outPath, png);
  console.log('Generated', outPath, size + 'px');
}

async function main() {
  const svg = new URL('../public/favicon.svg', import.meta.url);
  await renderFromSvg(svg, new URL('../public/apple-touch-icon.png', import.meta.url), 180);
}

main().catch((e)=>{ console.error(e); process.exit(1); });

