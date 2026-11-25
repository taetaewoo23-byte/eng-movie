export type AppStep = 'expressions' | 'scene' | 'storyboard' | 'video' | 'final';

export type VisualStyle = '2D animation' | 'clay' | 'watercolor' | 'live-action style';

export type VoiceOption = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';

export interface ExpressionItem {
  id: string;
  phrase: string;
  meaning: string;
}

export interface CharacterDesign {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: 'bob' | 'short_parted' | 'ponytail' | 'wavy';
  hairColor: string;
  topColor: string;
  bottomColor: string;
  shoeColor: string;
  accessory: 'none' | 'glasses' | 'scarf' | 'beanie' | 'bag_strap';
  outfitSummary: string;
}

export interface SceneConfig {
  place: string;
  characters: string;
  situation: string;
  style: VisualStyle;
  creatorName: string;
  voiceName: VoiceOption;
  characterBible: CharacterDesign[];
}

export type BeatRole = 'Hook' | 'Problem' | 'Turn' | 'Close';

export type SettingEnvironment = 'cafe' | 'library' | 'park' | 'home' | 'rooftop' | 'subway';
export type TimeOfDay = 'morning' | 'afternoon' | 'golden' | 'evening';
export type CharacterPose =
  | 'idle'
  | 'nervous'
  | 'talking'
  | 'encouraging'
  | 'surprised'
  | 'celebrate'
  | 'thinking'
  | 'walking';
export type CharacterEmotion = 'calm' | 'anxious' | 'worried' | 'hopeful' | 'joyful' | 'relieved';
export type EmotionMotif =
  | 'none'
  | 'butterflies'
  | 'spiral'
  | 'sparkle'
  | 'raindrop'
  | 'lightbulb'
  | 'sprout'
  | 'heart';

export interface BeatChoreography {
  environment: SettingEnvironment;
  timeOfDay: TimeOfDay;
  cameraMove: 'static' | 'slow_zoom_in' | 'slow_zoom_out' | 'gentle_pan';
  leadX: number; // 0.25 to 0.75 normalized canvas width
  leadPose: CharacterPose;
  leadEmotion: CharacterEmotion;
  partnerX: number; // 0.25 to 0.75 normalized canvas width
  partnerPose: CharacterPose;
  partnerEmotion: CharacterEmotion;
  motif: EmotionMotif;
  prop: 'coffee_cup' | 'notebook' | 'mic_card' | 'plant_pot' | 'umbrella' | 'none';
}

export interface Beat {
  index: number;
  role: BeatRole;
  timeRange: string;
  startSec: number;
  endSec: number;
  sceneDescription: string;
  englishLines: string;
  subtitles: string;
  choreography: BeatChoreography;
}

export interface SubtitleChunk {
  lines: string[];
  startSec: number;
  endSec: number;
}

export interface BeatAudio {
  beatIndex: number;
  audioDataUrl: string;
  durationSec: number;
}
