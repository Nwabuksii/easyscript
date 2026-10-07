import pngToIco from 'png-to-ico';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('assets', { recursive: true });

const SIZES = [16, 32, 48, 64, 128, 256];

async function convert(png, ico) {
  const buffers = await Promise.all(
    SIZES.map((s) => sharp(png).resize(s, s).png().toBuffer())
  );
  writeFileSync(ico, await pngToIco(buffers));
  console.log(`${png} -> ${ico}`);
}

await convert('installer.png', 'assets/installer.ico');
await convert('ej.png',        'assets/ej.ico');
await convert('et.png',        'assets/et.ico');