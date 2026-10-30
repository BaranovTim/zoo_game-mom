// Собирает public/audio/manifest.json — список записанных фраз вида "ru/animal.panda.hello".
// Запускать после того, как в public/audio/ru/ и public/audio/en/ добавлены mp3 из ElevenLabs:
//   npm run audio:manifest
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, а не .pathname: на Windows .pathname даёт «/C:/...», и папка не находится.
const root = fileURLToPath(new URL('../public/audio/', import.meta.url));
const entries = [];
for (const lang of ['ru', 'en']) {
  const dir = join(root, lang);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.mp3')) entries.push(`${lang}/${file.slice(0, -4)}`);
  }
}
entries.sort();
writeFileSync(join(root, 'manifest.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`audio/manifest.json: ${entries.length} фраз`);
