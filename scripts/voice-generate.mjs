// Озвучивает фразы игры через API ElevenLabs и кладёт mp3 в public/audio/<язык>/<ключ>.mp3,
// потом обновляет public/audio/manifest.json. Уже записанные файлы не трогает.
//
// Перед запуском задайте в той же консоли (PowerShell):
//   $env:ELEVENLABS_API_KEY = "ключ из Profile → API Keys"
//   $env:ELEVENLABS_VOICE_KEEPER = "ID голоса смотрителя"
//   $env:ELEVENLABS_VOICE_ANIMAL = "ID голоса зверя"
// Запуск:
//   node scripts/voice-generate.mjs --dry-run            что будет озвучено и сколько символов
//   node scripts/voice-generate.mjs --only animal.panda  только фразы, ключ которых начинается так
//   node scripts/voice-generate.mjs --lang ru            только один язык
//   node scripts/voice-generate.mjs --force              перезаписать уже записанные файлы
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const SETTINGS = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 };

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const speakers = readJson('src/locales/speakers.json');
const texts = { ru: readJson('src/locales/ru.json'), en: readJson('src/locales/en.json') };

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const values = (name) => args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]] : []));
const dryRun = flag('--dry-run');
const force = flag('--force');
const only = values('--only');
const langs = values('--lang').length ? values('--lang') : ['ru', 'en'];

const voices = { keeper: process.env.ELEVENLABS_VOICE_KEEPER, animal: process.env.ELEVENLABS_VOICE_ANIMAL };
const apiKey = process.env.ELEVENLABS_API_KEY;

const jobs = [];
for (const lang of langs) {
  if (!texts[lang]) throw new Error(`Нет текстов для языка «${lang}», есть только ru и en`);
  for (const [key, speaker] of Object.entries(speakers)) {
    const text = texts[lang][key];
    // «text» — строки только для экрана, а фразы с {подстановкой} заранее не записать.
    if (speaker === 'text' || !text || text.includes('{')) continue;
    if (only.length && !only.some((prefix) => key.startsWith(prefix))) continue;
    const file = join(root, 'public', 'audio', lang, `${key}.mp3`);
    if (!force && existsSync(file)) continue;
    jobs.push({ lang, key, speaker, text, file });
  }
}

const chars = jobs.reduce((sum, job) => sum + job.text.length, 0);
console.log(`Озвучить: ${jobs.length} фраз, ${chars} символов (модель ${MODEL})`);
if (dryRun) {
  for (const job of jobs) console.log(`  ${job.lang}/${job.key} [${job.speaker}] ${job.text}`);
  process.exit(0);
}
if (!jobs.length) process.exit(0);

const missing = [
  !apiKey && 'ELEVENLABS_API_KEY',
  ...[...new Set(jobs.map((job) => job.speaker))].filter((s) => !voices[s]).map((s) => `ELEVENLABS_VOICE_${s.toUpperCase()}`),
].filter(Boolean);
if (missing.length) {
  console.error(`Не заданы переменные: ${missing.join(', ')}. Как задать — в начале scripts/voice-generate.mjs.`);
  process.exit(1);
}

async function speak(job) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${API}/${voices[job.speaker]}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: job.text, model_id: MODEL, voice_settings: SETTINGS }),
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    const detail = (await response.text()).slice(0, 300);
    // 429 — слишком часто или кончились символы на тарифе, 5xx — сбой у ElevenLabs: ждём и пробуем снова.
    const retry = response.status === 429 || response.status >= 500;
    if (!retry || attempt === 4) throw Object.assign(new Error(`${response.status} ${detail}`), { status: response.status });
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  }
}

let done = 0;
const failed = [];
for (const job of jobs) {
  try {
    const audio = await speak(job);
    mkdirSync(join(root, 'public', 'audio', job.lang), { recursive: true });
    writeFileSync(job.file, audio);
    done++;
    console.log(`[${done}/${jobs.length}] ${job.lang}/${job.key}`);
  } catch (error) {
    failed.push(`${job.lang}/${job.key}`);
    console.error(`Ошибка на ${job.lang}/${job.key}: ${error.message}`);
    // Неверный ключ, нет доступа или кончились символы — дальше пробовать бессмысленно.
    if ([401, 402, 403, 429].includes(error.status)) break;
    if (/voice_not_found|invalid_uid/.test(error.message)) {
      console.error(
        'Голос не найден. Проверьте ID в ELEVENLABS_VOICE_KEEPER и ELEVENLABS_VOICE_ANIMAL ' +
          '(Voices → My Voices → ⋯ → Copy voice ID). Голоса из Voice Library через API доступны только на платном тарифе.',
      );
      break;
    }
  }
}
if (done < jobs.length) {
  console.error(`Записано ${done} из ${jobs.length}. Повторный запуск продолжит с незаписанных фраз.`);
  if (failed.length) console.error(`Не получилось: ${failed.join(', ')}`);
}

await import('./audio-manifest.mjs');
if (done < jobs.length) process.exit(1);
