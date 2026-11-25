import { useState } from 'react';
import {
  AppStep,
  Beat,
  BeatAudio,
  ExpressionItem,
  SceneConfig,
} from './types';
import {
  createInitialExpressions,
  DEFAULT_CHARACTER_BIBLE,
  MOVIE_PACKS,
  MoviePack,
} from './data/presets';
import { TopBar } from './components/TopBar';
import { ExpressionsStep } from './components/ExpressionsStep';
import { SceneStep } from './components/SceneStep';
import { StoryboardStep } from './components/StoryboardStep';
import { VideoStep } from './components/VideoStep';
import { FinalStep } from './components/FinalStep';

const STEP_ORDER: AppStep[] = ['expressions', 'scene', 'storyboard', 'video', 'final'];

async function postJsonWithRetry<T>(
  url: string,
  payload: unknown,
  retries = 2
): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const rawText = await res.text();
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        parsed = null;
      }

      if (!parsed) {
        // Transient proxy/HTML response (e.g. "The page could not be found" during server restart)
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
          continue;
        }
        throw new Error(
          `Server returned an unexpected response (${res.status}). Please try again in a moment.`
        );
      }

      if (!res.ok) {
        const msg =
          typeof parsed.error === 'string'
            ? parsed.error
            : `Request failed (${res.status}).`;
        if (res.status >= 502 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
          continue;
        }
        throw new Error(msg);
      }

      return parsed as T;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error('Network request failed.');
      if (attempt < retries && !lastErr.message.includes('API key')) {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error('Request failed.');
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('expressions');
  const [maxReachedStep, setMaxReachedStep] = useState<AppStep>('expressions');

  const [selectedPackId, setSelectedPackId] = useState<string | null>('inside-out-2');
  const [expressions, setExpressions] = useState<ExpressionItem[]>(() =>
    createInitialExpressions()
  );

  const [sceneConfig, setSceneConfig] = useState<SceneConfig>(() => ({
    place: MOVIE_PACKS[0].suggestedPlace,
    characters: 'Jisoo and Minho, two Korean university friends',
    situation: MOVIE_PACKS[0].suggestedSituation,
    style: '2D animation',
    creatorName: 'Jisoo',
    voiceName: 'Kore',
    characterBible: DEFAULT_CHARACTER_BIBLE,
  }));

  const [beats, setBeats] = useState<Beat[]>([]);
  const [beatsEdited, setBeatsEdited] = useState(false);
  const [beatAudios, setBeatAudios] = useState<BeatAudio[]>([]);

  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [regeneratingBeatIndex, setRegeneratingBeatIndex] = useState<number | null>(null);
  const [isPreparingVideo, setIsPreparingVideo] = useState(false);
  const [videoPrepStatus, setVideoPrepStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const advanceStep = (next: AppStep) => {
    setCurrentStep(next);
    if (STEP_ORDER.indexOf(next) > STEP_ORDER.indexOf(maxReachedStep)) {
      setMaxReachedStep(next);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPack = (pack: MoviePack) => {
    setSelectedPackId(pack.id);
    const rows: ExpressionItem[] = pack.expressions.map((item, idx) => ({
      id: `pack-${pack.id}-${idx}`,
      phrase: item.phrase,
      meaning: item.meaning,
    }));
    // Always ensure at least 5 expression input fields on screen
    while (rows.length < 5) {
      rows.push({
        id: `pack-${pack.id}-extra-${rows.length}`,
        phrase: '',
        meaning: '',
      });
    }
    setExpressions(rows);
    setSceneConfig((prev) => ({
      ...prev,
      place: pack.suggestedPlace,
      situation: pack.suggestedSituation,
    }));
  };

  const handleExpressionsChange = (next: ExpressionItem[]) => {
    setExpressions(next);
    setSelectedPackId(null);
  };

  const handleGenerateStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    setErrorMsg(null);
    try {
      const data = await postJsonWithRetry<{ beats: Beat[] }>('/api/storyboard', {
        expressions: expressions.filter((e) => e.phrase.trim().length > 0),
        place: sceneConfig.place,
        characters: sceneConfig.characters,
        situation: sceneConfig.situation,
        style: sceneConfig.style,
        characterBible: sceneConfig.characterBible,
      });
      setBeats(data.beats);
      setBeatsEdited(false);
      setBeatAudios([]);
      advanceStep('storyboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate storyboard.');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleUpdateBeat = (index: number, patch: Partial<Beat>) => {
    setBeatsEdited(true);
    setBeats((prev) =>
      prev.map((b) => (b.index === index ? { ...b, ...patch } : b))
    );
  };

  const handleRegenerateBeat = async (index: number) => {
    setRegeneratingBeatIndex(index);
    setErrorMsg(null);
    try {
      const data = await postJsonWithRetry<{ beat: Beat }>(
        '/api/storyboard/regenerate-beat',
        {
          beatIndex: index,
          beats,
          expressions: expressions.filter((e) => e.phrase.trim().length > 0),
          place: sceneConfig.place,
          characters: sceneConfig.characters,
          situation: sceneConfig.situation,
          style: sceneConfig.style,
          characterBible: sceneConfig.characterBible,
        }
      );
      setBeats((prev) =>
        prev.map((b) => (b.index === index ? data.beat : b))
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to regenerate beat.');
    } finally {
      setRegeneratingBeatIndex(null);
    }
  };

  const handleCreateVideo = async () => {
    setIsPreparingVideo(true);
    setErrorMsg(null);
    try {
      let updatedBeats = beats;
      if (beatsEdited) {
        setVideoPrepStatus('Updating animation choreography for your edits...');
        const choreoData = await postJsonWithRetry<{ choreographies: Beat['choreography'][] }>(
          '/api/choreography',
          {
            beats,
            place: sceneConfig.place,
            characters: sceneConfig.characters,
            style: sceneConfig.style,
          }
        );
        updatedBeats = beats.map((b, i) => ({
          ...b,
          choreography: choreoData.choreographies[i] || b.choreography,
        }));
        setBeats(updatedBeats);
        setBeatsEdited(false);
      }

      // Generate natural English TTS WAV audio beat by beat with live status
      const audios: BeatAudio[] = [];
      for (let i = 0; i < updatedBeats.length; i++) {
        const beat = updatedBeats[i];
        setVideoPrepStatus(
          `Generating natural English voice (Beat ${i + 1} of ${updatedBeats.length})...`
        );
        const ttsData = await postJsonWithRetry<{
          audioDataUrl: string;
          durationSec: number;
        }>('/api/tts', {
          text: beat.englishLines,
          voiceName: sceneConfig.voiceName,
          role: beat.role,
        });
        audios.push({
          beatIndex: beat.index,
          audioDataUrl: ttsData.audioDataUrl,
          durationSec: ttsData.durationSec,
        });
      }

      setBeatAudios(audios);
      advanceStep('video');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create animated video.');
    } finally {
      setIsPreparingVideo(false);
      setVideoPrepStatus('');
    }
  };

  const handleReset = () => {
    setSelectedPackId('inside-out-2');
    setExpressions(createInitialExpressions());
    setBeats([]);
    setBeatAudios([]);
    setErrorMsg(null);
    setCurrentStep('expressions');
    setMaxReachedStep('expressions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#1E292B] flex flex-col">
      <TopBar
        currentStep={currentStep}
        maxReachedStep={maxReachedStep}
        onSelectStep={(step) => {
          setErrorMsg(null);
          setCurrentStep(step);
        }}
        onReset={handleReset}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {isPreparingVideo && videoPrepStatus && (
          <div className="mb-6 p-4 rounded-2xl bg-[#EEF3FA] border border-[#C7D6ED] text-[#1E292B] text-base font-medium">
            {videoPrepStatus}
          </div>
        )}

        {currentStep === 'expressions' && (
          <ExpressionsStep
            expressions={expressions}
            selectedPackId={selectedPackId}
            onChangeExpressions={handleExpressionsChange}
            onSelectPack={handleSelectPack}
            onNext={() => advanceStep('scene')}
          />
        )}

        {currentStep === 'scene' && (
          <SceneStep
            sceneConfig={sceneConfig}
            isGenerating={isGeneratingStoryboard}
            errorMsg={errorMsg}
            onChangeScene={setSceneConfig}
            onBack={() => setCurrentStep('expressions')}
            onGenerateStoryboard={handleGenerateStoryboard}
          />
        )}

        {currentStep === 'storyboard' && (
          <StoryboardStep
            beats={beats}
            expressions={expressions}
            regeneratingBeatIndex={regeneratingBeatIndex}
            isPreparingVideo={isPreparingVideo}
            errorMsg={errorMsg}
            onUpdateBeat={handleUpdateBeat}
            onRegenerateBeat={handleRegenerateBeat}
            onBack={() => setCurrentStep('scene')}
            onCreateVideo={handleCreateVideo}
          />
        )}

        {currentStep === 'video' && (
          <VideoStep
            beats={beats}
            beatAudios={beatAudios}
            expressions={expressions}
            sceneConfig={sceneConfig}
            onBack={() => setCurrentStep('storyboard')}
            onNextFinal={() => advanceStep('final')}
          />
        )}

        {currentStep === 'final' && (
          <FinalStep
            beats={beats}
            beatAudios={beatAudios}
            expressions={expressions}
            sceneConfig={sceneConfig}
            onUpdateCreatorName={(creatorName) =>
              setSceneConfig((prev) => ({ ...prev, creatorName }))
            }
            onBackToVideo={() => setCurrentStep('video')}
            onStartNew={handleReset}
          />
        )}
      </main>
    </div>
  );
}
