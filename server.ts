import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface InputExpression {
  phrase: string;
  meaning?: string;
}

interface CharacterBibleEntry {
  name: string;
  outfitSummary: string;
}

interface BeatSpec {
  index: number;
  role: 'Hook' | 'Problem' | 'Turn' | 'Close';
  timeRange: string;
  startSec: number;
  endSec: number;
}

const BEAT_SPECS: BeatSpec[] = [
  { index: 0, role: 'Hook', timeRange: '0-7s', startSec: 0, endSec: 7 },
  { index: 1, role: 'Problem', timeRange: '7-15s', startSec: 7, endSec: 15 },
  { index: 2, role: 'Turn', timeRange: '15-23s', startSec: 15, endSec: 23 },
  { index: 3, role: 'Close', timeRange: '23-30s', startSec: 23, endSec: 30 },
];

const CHOREOGRAPHY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    environment: {
      type: Type.STRING,
      description: "One of: 'cafe', 'library', 'park', 'home', 'rooftop', 'subway'",
    },
    timeOfDay: {
      type: Type.STRING,
      description: "One of: 'morning', 'afternoon', 'golden', 'evening'",
    },
    cameraMove: {
      type: Type.STRING,
      description: "One of: 'static', 'slow_zoom_in', 'slow_zoom_out', 'gentle_pan'",
    },
    leadX: {
      type: Type.NUMBER,
      description: 'Horizontal position of lead character from 0.25 to 0.45',
    },
    leadPose: {
      type: Type.STRING,
      description:
        "One of: 'idle', 'nervous', 'talking', 'encouraging', 'surprised', 'celebrate', 'thinking', 'walking'",
    },
    leadEmotion: {
      type: Type.STRING,
      description: "One of: 'calm', 'anxious', 'worried', 'hopeful', 'joyful', 'relieved'",
    },
    partnerX: {
      type: Type.NUMBER,
      description: 'Horizontal position of partner character from 0.55 to 0.75',
    },
    partnerPose: {
      type: Type.STRING,
      description:
        "One of: 'idle', 'nervous', 'talking', 'encouraging', 'surprised', 'celebrate', 'thinking', 'walking'",
    },
    partnerEmotion: {
      type: Type.STRING,
      description: "One of: 'calm', 'anxious', 'worried', 'hopeful', 'joyful', 'relieved'",
    },
    motif: {
      type: Type.STRING,
      description:
        "Visual emotion prop matching the beat: 'none', 'butterflies', 'spiral', 'sparkle', 'raindrop', 'lightbulb', 'sprout', 'heart'",
    },
    prop: {
      type: Type.STRING,
      description: "Scene prop: 'coffee_cup', 'notebook', 'mic_card', 'plant_pot', 'umbrella', 'none'",
    },
  },
  required: [
    'environment',
    'timeOfDay',
    'cameraMove',
    'leadX',
    'leadPose',
    'leadEmotion',
    'partnerX',
    'partnerPose',
    'partnerEmotion',
    'motif',
    'prop',
  ],
};

function sanitizeChoreography(raw: Record<string, unknown> | undefined) {
  const envs = new Set(['cafe', 'library', 'park', 'home', 'rooftop', 'subway']);
  const times = new Set(['morning', 'afternoon', 'golden', 'evening']);
  const cams = new Set(['static', 'slow_zoom_in', 'slow_zoom_out', 'gentle_pan']);
  const poses = new Set([
    'idle',
    'nervous',
    'talking',
    'encouraging',
    'surprised',
    'celebrate',
    'thinking',
    'walking',
  ]);
  const emotions = new Set(['calm', 'anxious', 'worried', 'hopeful', 'joyful', 'relieved']);
  const motifs = new Set([
    'none',
    'butterflies',
    'spiral',
    'sparkle',
    'raindrop',
    'lightbulb',
    'sprout',
    'heart',
  ]);
  const props = new Set(['coffee_cup', 'notebook', 'mic_card', 'plant_pot', 'umbrella', 'none']);

  const leadXNum = typeof raw?.leadX === 'number' ? raw.leadX : 0.36;
  const partnerXNum = typeof raw?.partnerX === 'number' ? raw.partnerX : 0.64;

  return {
    environment: envs.has(String(raw?.environment)) ? String(raw?.environment) : 'cafe',
    timeOfDay: times.has(String(raw?.timeOfDay)) ? String(raw?.timeOfDay) : 'afternoon',
    cameraMove: cams.has(String(raw?.cameraMove)) ? String(raw?.cameraMove) : 'slow_zoom_in',
    leadX: Math.min(0.45, Math.max(0.24, leadXNum)),
    leadPose: poses.has(String(raw?.leadPose)) ? String(raw?.leadPose) : 'talking',
    leadEmotion: emotions.has(String(raw?.leadEmotion)) ? String(raw?.leadEmotion) : 'calm',
    partnerX: Math.min(0.76, Math.max(0.55, partnerXNum)),
    partnerPose: poses.has(String(raw?.partnerPose)) ? String(raw?.partnerPose) : 'idle',
    partnerEmotion: emotions.has(String(raw?.partnerEmotion)) ? String(raw?.partnerEmotion) : 'calm',
    motif: motifs.has(String(raw?.motif)) ? String(raw?.motif) : 'none',
    prop: props.has(String(raw?.prop)) ? String(raw?.prop) : 'notebook',
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function findMissingExpressions(beats: Array<{ englishLines: string }>, expressions: InputExpression[]): string[] {
  const combined = beats.map((b) => b.englishLines).join(' ');
  return expressions
    .map((e) => e.phrase.trim())
    .filter(Boolean)
    .filter((phrase) => {
      if (combined.includes(phrase)) return false;
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !new RegExp(escaped, 'i').test(combined);
    });
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
  }
  throw lastError;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('GEMINI_API_KEY')) {
    return { status: 500, message: msg };
  }
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'API key permission error. Please check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Rate limit reached briefly. Please wait a moment and try again.',
    };
  }
  return { status: 500, message: msg || 'Unexpected error calling Gemini API.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Generate 4-beat storyboard (60-70 words total, all expressions verbatim)
  app.post('/api/storyboard', async (req, res) => {
    try {
      const {
        expressions,
        place,
        characters,
        situation,
        style,
        characterBible,
      }: {
        expressions: InputExpression[];
        place: string;
        characters: string;
        situation: string;
        style: string;
        characterBible?: CharacterBibleEntry[];
      } = req.body;

      const cleanExprs = (expressions || [])
        .map((e) => ({
          phrase: String(e.phrase || '').trim(),
          meaning: String(e.meaning || '').trim(),
        }))
        .filter((e) => e.phrase.length > 0);

      if (cleanExprs.length < 4) {
        res.status(400).json({ error: 'Please provide at least 4 English expressions.' });
        return;
      }

      const ai = getAiClient();
      const exprListText = cleanExprs
        .map((e, i) => `${i + 1}. "${e.phrase}"${e.meaning ? ` (meaning: ${e.meaning})` : ''}`)
        .join('\n');

      const bibleText = (characterBible || [])
        .map((c) => `- ${c.name}: ${c.outfitSummary}`)
        .join('\n');

      const systemInstruction = `You are a warm, friendly short-film writer for Korean university students learning everyday English.
Write a cozy, family-friendly 30-second animated short story split into 4 beats:
- Beat 0: 0-7s Hook
- Beat 1: 7-15s Problem
- Beat 2: 15-23s Turn
- Beat 3: 23-30s Close

CRITICAL RULES:
1. NO real people, NO celebrities, NO copyrighted movie characters, NO brand logos, NO copyrighted music.
2. Every single expression listed below MUST appear inside the spoken "englishLines" across the 4 beats, written EXACTLY character-for-character as typed by the user (keep exact wording, punctuation, and parentheses if any, e.g., if they typed "I've got butterflies (in my stomach)", write the exact string "I've got butterflies (in my stomach)" or wait — yes, write it EXACTLY as typed!).
3. Total spoken words across ALL 4 beats' "englishLines" combined MUST be strictly between 60 and 70 words (aim for 64-67 words, ~14-18 words per beat).
4. Write natural, everyday conversational spoken English for a single narrator/voice or smooth dialogue flow without speaker name prefixes like "Jisoo:" in englishLines (so TTS reads it smoothly as natural spoken lines).
5. Keep the characters, outfits, and colors consistent across all 4 beat scene descriptions.`;

      const buildPrompt = (extraFeedback = '') => `Setting Place: ${place || 'Sunny campus coffee shop'}
Characters: ${characters || 'Jisoo and Minho, two university students'}
Consistent Character Outfits:
${bibleText || '- Jisoo: periwinkle cardigan, slate trousers\n- Minho: sage crewneck sweater, charcoal chinos, round glasses'}
Situation: ${situation || 'Encouraging each other before a presentation'}
Visual Style: ${style || '2D animation'}

Required Expressions (use EVERY ONE verbatim in englishLines):
${exprListText}
${extraFeedback ? `\nCORRECTION NEEDED FROM PREVIOUS DRAFT:\n${extraFeedback}` : ''}
Return valid JSON with a "beats" array of exactly 4 items (index 0, 1, 2, 3).`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          beats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                sceneDescription: {
                  type: Type.STRING,
                  description:
                    '1-2 clear sentences describing the visual action, keeping exact character outfits and colors consistent.',
                },
                englishLines: {
                  type: Type.STRING,
                  description:
                    'Spoken English lines for this beat (~14-18 words). No speaker labels. Must include assigned expressions verbatim.',
                },
                choreography: CHOREOGRAPHY_SCHEMA,
              },
              required: ['index', 'sceneDescription', 'englishLines', 'choreography'],
            },
          },
        },
        required: ['beats'],
      };

      const generateDraft = async (feedback = '') => {
        const response = await callWithRetry(() =>
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: buildPrompt(feedback),
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          })
        );
        const parsed = JSON.parse((response.text ?? '{}').trim());
        return Array.isArray(parsed.beats) ? parsed.beats : [];
      };

      let rawBeats = await generateDraft();

      // Verify word count (60-70) and exact expression inclusion; refine up to 2 times if off
      for (let attempt = 0; attempt < 2; attempt++) {
        const normalized = BEAT_SPECS.map((spec, i) => ({
          englishLines: String(rawBeats[i]?.englishLines || ''),
        }));
        const totalWords = normalized.reduce((s, b) => s + countWords(b.englishLines), 0);
        const missing = findMissingExpressions(normalized, cleanExprs);

        if (totalWords >= 60 && totalWords <= 70 && missing.length === 0) {
          break;
        }

        const feedbackParts: string[] = [];
        if (totalWords < 60 || totalWords > 70) {
          feedbackParts.push(
            `Previous draft had ${totalWords} words total across all 4 beats. Adjust sentence lengths so the 4 beats total strictly 62 to 68 words.`
          );
        }
        if (missing.length > 0) {
          feedbackParts.push(
            `These expressions were missing or altered and MUST appear verbatim: ${missing.map((m) => `"${m}"`).join(', ')}.`
          );
        }
        rawBeats = await generateDraft(feedbackParts.join(' '));
      }

      const beats = BEAT_SPECS.map((spec, idx) => {
        const b = rawBeats[idx] || {};
        const lines = String(b.englishLines || '').replace(/\s+/g, ' ').trim();
        return {
          index: spec.index,
          role: spec.role,
          timeRange: spec.timeRange,
          startSec: spec.startSec,
          endSec: spec.endSec,
          sceneDescription: String(b.sceneDescription || '').trim(),
          englishLines: lines,
          subtitles: lines,
          choreography: sanitizeChoreography(b.choreography),
        };
      });

      res.json({ beats });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Regenerate a single beat while maintaining story continuity, expressions, and 60-70 total words
  app.post('/api/storyboard/regenerate-beat', async (req, res) => {
    try {
      const {
        beatIndex,
        beats,
        expressions,
        place,
        characters,
        situation,
        style,
        characterBible,
      } = req.body;

      if (typeof beatIndex !== 'number' || beatIndex < 0 || beatIndex > 3 || !Array.isArray(beats)) {
        res.status(400).json({ error: 'Invalid beat index or beats array.' });
        return;
      }

      const cleanExprs: InputExpression[] = (expressions || [])
        .map((e: InputExpression) => ({
          phrase: String(e.phrase || '').trim(),
          meaning: String(e.meaning || '').trim(),
        }))
        .filter((e: InputExpression) => e.phrase.length > 0);

      const otherBeats = beats.filter((_, idx: number) => idx !== beatIndex);
      const otherWords = otherBeats.reduce(
        (sum: number, b: { englishLines?: string }) => sum + countWords(String(b.englishLines || '')),
        0
      );
      const targetMinWords = Math.max(10, 60 - otherWords);
      const targetMaxWords = Math.max(targetMinWords + 4, 70 - otherWords);
      const idealBeatWords = Math.round((targetMinWords + targetMaxWords) / 2);

      // Find expressions missing from the other 3 beats — this beat MUST include them!
      const missingInOthers = findMissingExpressions(
        otherBeats.map((b: { englishLines?: string }) => ({
          englishLines: String(b.englishLines || ''),
        })),
        cleanExprs
      );

      const spec = BEAT_SPECS[beatIndex];
      const ai = getAiClient();

      const bibleText = (characterBible || [])
        .map((c: CharacterBibleEntry) => `- ${c.name}: ${c.outfitSummary}`)
        .join('\n');

      const otherContext = beats
        .map(
          (b: { role: string; timeRange: string; sceneDescription: string; englishLines: string }, i: number) =>
            i === beatIndex
              ? `[BEAT ${i} (${spec.timeRange} ${spec.role}) -> REGENERATE THIS ONE]`
              : `Beat ${i} (${b.timeRange} ${b.role}): Scene: ${b.sceneDescription} | Lines: "${b.englishLines}"`
        )
        .join('\n');

      const prompt = `Regenerate ONLY Beat ${beatIndex} (${spec.timeRange} ${spec.role}) for this 30-second English learning film.
Place: ${place}
Characters: ${characters}
Outfits to keep consistent:
${bibleText}
Situation: ${situation}
Visual Style: ${style}

Story Context:
${otherContext}

REQUIREMENTS FOR THIS BEAT:
1. Keep it fresh, natural, family-friendly, and connected smoothly to the neighboring beats.
2. Spoken "englishLines" word count for this beat MUST be between ${targetMinWords} and ${targetMaxWords} words (aim for ~${idealBeatWords} words) so the whole 4-beat script stays 60-70 words.
3. No speaker prefixes (no "Jisoo:").
4. ${
        missingInOthers.length > 0
          ? `CRITICAL: You MUST include these exact expressions verbatim in englishLines: ${missingInOthers
              .map((m) => `"${m}"`)
              .join(', ')}.`
          : `Optionally weave in one of the movie expressions naturally if helpful.`
      }
5. Keep NO real people, celebrities, copyrighted characters, or brand logos.`;

      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sceneDescription: { type: Type.STRING },
                englishLines: { type: Type.STRING },
                choreography: CHOREOGRAPHY_SCHEMA,
              },
              required: ['sceneDescription', 'englishLines', 'choreography'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const lines = String(parsed.englishLines || '').replace(/\s+/g, ' ').trim();

      res.json({
        beat: {
          index: spec.index,
          role: spec.role,
          timeRange: spec.timeRange,
          startSec: spec.startSec,
          endSec: spec.endSec,
          sceneDescription: String(parsed.sceneDescription || '').trim(),
          englishLines: lines,
          subtitles: lines,
          choreography: sanitizeChoreography(parsed.choreography),
        },
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Refresh visual choreography if the user manually edited beat text before generating the video
  app.post('/api/choreography', async (req, res) => {
    try {
      const { beats, place, characters, style } = req.body;
      if (!Array.isArray(beats) || beats.length !== 4) {
        res.status(400).json({ error: 'Four beats are required.' });
        return;
      }
      const ai = getAiClient();
      const prompt = `Create cohesive 4-beat visual animation choreography for this 30-second short film.
Place: ${place}
Characters: ${characters}
Style: ${style}
Keep the setting consistent across all 4 beats unless a subtle transition makes sense.
Beats:
${beats
  .map(
    (b: { timeRange: string; role: string; sceneDescription: string; englishLines: string }, i: number) =>
      `Beat ${i} (${b.timeRange} ${b.role}): Scene: ${b.sceneDescription} | Spoken: "${b.englishLines}"`
  )
  .join('\n')}`;

      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                choreographies: {
                  type: Type.ARRAY,
                  items: CHOREOGRAPHY_SCHEMA,
                },
              },
              required: ['choreographies'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const list = Array.isArray(parsed.choreographies) ? parsed.choreographies : [];
      res.json({
        choreographies: BEAT_SPECS.map((_, i) => sanitizeChoreography(list[i])),
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Generate natural English TTS audio for one beat using gemini-3.8-flash-lite-tts
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName, role } = req.body;
      const cleanText = String(text || '').trim();
      if (!cleanText) {
        res.status(400).json({ error: 'Text is required for speech generation.' });
        return;
      }

      const validVoices = new Set(['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir']);
      const selectedVoice = validVoices.has(String(voiceName)) ? String(voiceName) : 'Kore';

      const styleToneByRole: Record<string, string> = {
        Hook: 'Warm, relatable university student storytelling voice, clear natural English pace',
        Problem: 'Slightly worried, expressive conversational English voice, clear enunciation',
        Turn: 'Encouraging, gentle, hopeful English voice, warm and clear',
        Close: 'Bright, happy, relieved English storytelling voice, warm smile in tone',
      };

      const ai = getAiClient();
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style:
                      styleToneByRole[String(role)] ||
                      'Clear, warm, natural everyday English for learners',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        })
      );

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData?.data) {
        res.status(502).json({ error: 'Speech model returned no audio data.' });
        return;
      }

      const wavBuffer = Buffer.from(inlineData.data, 'base64');
      // Unary TTS returns a 24kHz, 16-bit mono WAV file (48,000 bytes/sec after 44-byte header)
      const pcmBytes = Math.max(0, wavBuffer.length - 44);
      const durationSec = Number((pcmBytes / 48000).toFixed(2)) || 5.0;

      res.json({
        audioDataUrl: `data:${inlineData.mimeType || 'audio/wav'};base64,${inlineData.data}`,
        durationSec,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`my im server listening on http://localhost:${PORT}`);
  });
}

startServer();
