import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

async function main() {
  const svgPath = new URL('../public/og.svg', import.meta.url);
  const svg = await readFile(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    background: 'transparent'
  });
  const pngData = resvg.render().asPng();
  const outPath = new URL('../public/og.png', import.meta.url);
  await writeFile(outPath, pngData);
  console.log('Generated', outPath.pathname);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

