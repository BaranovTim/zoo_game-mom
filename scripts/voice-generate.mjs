// Озвучивает фразы игры через API ElevenLabs и кладёт mp3 в public/audio/<язык>/<ключ>.mp3,
// потом обновляет public/audio/manifest.json. Уже записанные файлы не трогает.
//
// Перед запуском задайте в той же консоли (PowerShell):
//   $env:ELEVENLABS_API_KEY = "ключ из Profile → API Keys"
//   $env:ELEVENLABS_VOICE_KEEPER = "ID голоса смотрителя"
//   $env:ELEVENLABS_VOICE_ANIMAL = "ID голоса зверя"
//   (для отдельного голоса на языке: $env:ELEVENLABS_VOICE_KEEPER_RU, $env:ELEVENLABS_VOICE_ANIMAL_RU и т. п.)
// Голоса игры (выбраны 2026-11-04):
//   смотритель EN ovxTDvt1nK14skZy1sYa, смотритель RU TpZlRcB7rTBboAYWa2DC (Anton, родной русский),
//   звери EN и RU mM3ODQRL6pN7aItxr6Qo.
// Запуск:
//   node scripts/voice-generate.mjs --dry-run            что будет озвучено и сколько символов
//   node scripts/voice-generate.mjs --only animal.panda  только фразы, ключ которых начинается так
//   node scripts/voice-generate.mjs --lang ru            только один язык
//   node scripts/voice-generate.mjs --force              перезаписать уже записанные файлы
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.elevenlabs.io/v1/text-to-speech';
// Модель можно задать отдельно для языка: русский звучит заметно лучше на eleven_v3 (проверено 2026-11-04).
const MODELS = { ru: 'eleven_v3', en: 'eleven_multilingual_v2' };
const modelFor = (lang) => process.env[`ELEVENLABS_MODEL_${lang.toUpperCase()}`] || process.env.ELEVENLABS_MODEL || MODELS[lang];
const settingsFor = (model) =>
  model === 'eleven_v3'
    ? { stability: 0.5 } // v3 принимает только 0, 0.5 или 1 и без остальных настроек
    : { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 };
// language_code понимают eleven_v3 и модели v2.5; multilingual_v2 язык определяет сам.
const requestBody = (job) => {
  const model = modelFor(job.lang);
  const body = { text: job.text, model_id: model, voice_settings: settingsFor(model) };
  if (model !== 'eleven_multilingual_v2') body.language_code = job.lang;
  return JSON.stringify(body);
};

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const speakers = readJson('src/locales/speakers.json');
const texts = { ru: readJson('src/locales/ru.json'), en: readJson('src/locales/en.json') };
// Как фразу произносить, если голос ставит ударение неверно: текст для голоса (например, «Адин!» вместо «Один!»,
// или знак ударения U+0301 после ударной гласной). На экране по-прежнему текст из ru.json / en.json.
const readOptional = (path) => (existsSync(join(root, path)) ? readJson(path) : {});
const spoken = { ru: readOptional('src/locales/ru.voice.json'), en: readOptional('src/locales/en.voice.json') };

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const values = (name) => args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]] : []));
const dryRun = flag('--dry-run');
const force = flag('--force');
const only = values('--only');
const langs = values('--lang').length ? values('--lang') : ['ru', 'en'];

// Голос можно задать отдельно для языка: ELEVENLABS_VOICE_KEEPER_RU важнее общего ELEVENLABS_VOICE_KEEPER.
const voiceEnv = (speaker, lang) => `ELEVENLABS_VOICE_${speaker.toUpperCase()}_${lang.toUpperCase()}`;
const voiceFor = (speaker, lang) => process.env[voiceEnv(speaker, lang)] || process.env[`ELEVENLABS_VOICE_${speaker.toUpperCase()}`];
const apiKey = process.env.ELEVENLABS_API_KEY;

const jobs = [];
for (const lang of langs) {
  if (!texts[lang]) throw new Error(`Нет текстов для языка «${lang}», есть только ru и en`);
  for (const [key, speaker] of Object.entries(speakers)) {
    const text = spoken[lang][key] ?? texts[lang][key];
    // «text» — строки только для экрана, а фразы с {подстановкой} заранее не записать.
    if (speaker === 'text' || !text || text.includes('{')) continue;
    if (only.length && !only.some((prefix) => key.startsWith(prefix))) continue;
    const file = join(root, 'public', 'audio', lang, `${key}.mp3`);
    if (!force && existsSync(file)) continue;
    jobs.push({ lang, key, speaker, text, file });
  }
}

const chars = jobs.reduce((sum, job) => sum + job.text.length, 0);
console.log(`Озвучить: ${jobs.length} фраз, ${chars} символов (модели: ${langs.map((lang) => `${lang} ${modelFor(lang)}`).join(', ')})`);
if (dryRun) {
  for (const job of jobs) console.log(`  ${job.lang}/${job.key} [${job.speaker}] ${job.text}`);
  process.exit(0);
}
if (!jobs.length) process.exit(0);

const missing = [
  !apiKey && 'ELEVENLABS_API_KEY',
  ...[...new Set(jobs.filter((job) => !voiceFor(job.speaker, job.lang)).map((job) => voiceEnv(job.speaker, job.lang)))],
].filter(Boolean);
if (missing.length) {
  console.error(`Не заданы переменные: ${missing.join(', ')}. Как задать — в начале scripts/voice-generate.mjs.`);
  process.exit(1);
}

async function speak(job) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${API}/${voiceFor(job.speaker, job.lang)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: requestBody(job),
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
