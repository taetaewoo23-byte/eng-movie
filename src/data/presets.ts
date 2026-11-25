import { CharacterDesign, ExpressionItem, VisualStyle, VoiceOption } from '../types';

export interface MoviePack {
  id: string;
  title: string;
  subtitle: string;
  expressions: Array<{ phrase: string; meaning: string }>;
  suggestedPlace: string;
  suggestedSituation: string;
}

export const MOVIE_PACKS: MoviePack[] = [
  {
    id: 'inside-out-2',
    title: 'Inside Out 2',
    subtitle: '5 expressions · Emotion & confidence',
    expressions: [
      { phrase: "I've got butterflies (in my stomach)", meaning: '긴장돼서 떨려' },
      { phrase: 'freak out', meaning: '패닉에 빠지다, 기겁하다' },
      { phrase: "You've got this.", meaning: '넌 할 수 있어' },
      { phrase: 'be hard on yourself', meaning: '자신을 너무 몰아붙이다' },
      { phrase: "I'm over the moon.", meaning: '너무 기뻐' },
    ],
    suggestedPlace: 'Quiet university lecture hall before a club speech',
    suggestedSituation:
      'Jisoo feels nervous before her English club presentation, and her friend Minho helps her calm down and succeed.',
  },
  {
    id: 'notting-hill',
    title: 'Notting Hill',
    subtitle: '4 expressions · Everyday mishaps & choices',
    expressions: [
      { phrase: 'change my mind', meaning: '마음을 바꾸다' },
      { phrase: 'kill two birds with one stone', meaning: '일석이조' },
      { phrase: 'Whoopsidaisies!', meaning: '아이쿠! (실수했을 때 쓰는 장난스러운 말)' },
      { phrase: 'a vicious circle', meaning: '악순환' },
    ],
    suggestedPlace: 'Sunny campus coffee shop near the main library',
    suggestedSituation:
      'Minho almost skips English study group because of a spill and busy schedule, until Jisoo turns the morning around.',
  },
  {
    id: 'minari',
    title: 'Minari',
    subtitle: '4 expressions · Fresh starts & resilience',
    expressions: [
      { phrase: 'make ends meet', meaning: '겨우 먹고살다, 생활비를 감당하다' },
      { phrase: 'start from scratch', meaning: '처음부터 시작하다' },
      { phrase: 'put down roots', meaning: '자리를 잡다, 정착하다' },
      { phrase: 'bittersweet', meaning: '씁쓸하면서도 달콤한' },
    ],
    suggestedPlace: 'Campus rooftop garden overlooking the city',
    suggestedSituation:
      'Two transfer students talk about part-time jobs, moving to a new dorm, and growing comfortable in a new semester.',
  },
];

export const PLACE_SUGGESTIONS = [
  'Sunny campus coffee shop',
  'University library study corner',
  'Campus rooftop garden',
  'Subway platform on a rainy morning',
  'Cozy shared apartment desk',
];

export const SITUATION_SUGGESTIONS = [
  'Preparing for a big English presentation and cheering each other on',
  'Catching up over coffee after a tough midterm week',
  'Starting a new semester in a new city and finding confidence',
  'Turning a clumsy morning mistake into a lucky study session',
];

export interface StyleOption {
  id: VisualStyle;
  label: string;
  koreanNote: string;
  description: string;
  imageUrl: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: '2D animation',
    label: '2D animation',
    koreanNote: '2D 애니메이션',
    description: 'Clean cel-shaded lines, calm flat colors, and smooth frame motion.',
    imageUrl: '/src/assets/images/style_2d_animation_1795579943726.jpg',
  },
  {
    id: 'clay',
    label: 'clay',
    koreanNote: '클레이 스톱모션',
    description: 'Tactile matte miniature clay figures with warm lamp lighting.',
    imageUrl: '/src/assets/images/style_clay_animation_1795579944204.jpg',
  },
  {
    id: 'watercolor',
    label: 'watercolor',
    koreanNote: '수채화 일러스트',
    description: 'Soft cold-press paper texture, ink contours, and gentle washes.',
    imageUrl: '/src/assets/images/style_watercolor_1795579944834.jpg',
  },
  {
    id: 'live-action style',
    label: 'live-action style',
    koreanNote: '실사 영화 스타일',
    description: '35mm warm sunlight, shallow bokeh depth, and subtle film grain.',
    imageUrl: '/src/assets/images/style_live_action_1795579944826.jpg',
  },
];

export const VOICE_OPTIONS: Array<{ id: VoiceOption; label: string; tone: string }> = [
  { id: 'Kore', label: 'Kore', tone: 'Warm & clear female voice' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Gentle & bright voice' },
  { id: 'Puck', label: 'Puck', tone: 'Friendly & upbeat male voice' },
  { id: 'Charon', label: 'Charon', tone: 'Calm & steady male voice' },
];

export const DEFAULT_CHARACTER_BIBLE: CharacterDesign[] = [
  {
    id: 'char-1',
    name: 'Jisoo',
    skinTone: '#F4D2B8',
    hairStyle: 'bob',
    hairColor: '#2B2832',
    topColor: '#5B76A8', // Soft periwinkle cardigan
    bottomColor: '#3C4759',
    shoeColor: '#EAE6DF',
    accessory: 'bag_strap',
    outfitSummary: 'Periwinkle knit cardigan, slate trousers, white sneakers',
  },
  {
    id: 'char-2',
    name: 'Minho',
    skinTone: '#ECC7AC',
    hairStyle: 'short_parted',
    hairColor: '#26232C',
    topColor: '#699482', // Calm sage sweater
    bottomColor: '#4A4E5A',
    shoeColor: '#D8CFC2',
    accessory: 'glasses',
    outfitSummary: 'Sage crewneck sweater, charcoal chinos, round glasses',
  },
];

export function createInitialExpressions(): ExpressionItem[] {
  return MOVIE_PACKS[0].expressions.map((item, idx) => ({
    id: `expr-${idx + 1}`,
    phrase: item.phrase,
    meaning: item.meaning,
  }));
}
