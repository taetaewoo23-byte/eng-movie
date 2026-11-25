import {
  Beat,
  CharacterDesign,
  CharacterEmotion,
  CharacterPose,
  EmotionMotif,
  SceneConfig,
  SettingEnvironment,
  SubtitleChunk,
  TimeOfDay,
  VisualStyle,
} from '../types';
import { buildSubtitleChunksForBeat } from '../utils/textHelpers';

export interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeSec: number; // 0 to 30
  beats: Beat[];
  sceneConfig: SceneConfig;
  beatAudioDurations?: number[]; // actual TTS duration per beat if known
  isSpeaking?: boolean;
  showEndCredit?: boolean;
  subtitleChunksByBeat?: SubtitleChunk[][];
}

// Deterministic pseudo-random helper for grain, bokeh, and watercolor washes
function hash2d(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function getBeatAtTime(beats: Beat[], timeSec: number): Beat {
  for (let i = 0; i < beats.length; i++) {
    if (timeSec >= beats[i].startSec && timeSec < beats[i].endSec) {
      return beats[i];
    }
  }
  return beats[beats.length - 1];
}

function getTimePalette(timeOfDay: TimeOfDay) {
  switch (timeOfDay) {
    case 'morning':
      return {
        skyTop: '#DCEBF7',
        skyBottom: '#F5EFE6',
        wall: '#EEF2EE',
        wallShade: '#DCE4DF',
        floor: '#D9CFC1',
        sunTint: 'rgba(255, 245, 214, 0.32)',
        ambient: 'rgba(255, 255, 255, 0)',
      };
    case 'golden':
      return {
        skyTop: '#E8C5B0',
        skyBottom: '#F7DFBE',
        wall: '#F2E8DC',
        wallShade: '#E0D0BE',
        floor: '#C9B39B',
        sunTint: 'rgba(255, 206, 138, 0.36)',
        ambient: 'rgba(255, 190, 120, 0.08)',
      };
    case 'evening':
      return {
        skyTop: '#5B6C8F',
        skyBottom: '#93A3BC',
        wall: '#D8DEE6',
        wallShade: '#BDC7D4',
        floor: '#9EA7B3',
        sunTint: 'rgba(255, 224, 166, 0.25)',
        ambient: 'rgba(42, 54, 82, 0.14)',
      };
    case 'afternoon':
    default:
      return {
        skyTop: '#CBE0EE',
        skyBottom: '#EFF3F0',
        wall: '#EDF1EE',
        wallShade: '#D7E0DC',
        floor: '#CFC6B8',
        sunTint: 'rgba(255, 248, 225, 0.26)',
        ambient: 'rgba(255, 255, 255, 0)',
      };
  }
}

export function renderAnimationFrame(opts: RenderFrameOptions): void {
  const {
    ctx,
    width,
    height,
    timeSec,
    beats,
    sceneConfig,
    beatAudioDurations,
    isSpeaking = false,
    showEndCredit = false,
    subtitleChunksByBeat,
  } = opts;

  if (!beats || beats.length === 0) return;

  const style: VisualStyle = sceneConfig.style;
  const activeBeat = getBeatAtTime(beats, timeSec);
  const beatDuration = Math.max(1, activeBeat.endSec - activeBeat.startSec);
  const localTime = Math.max(0, timeSec - activeBeat.startSec);
  const beatProgress = Math.min(1, localTime / beatDuration);

  // Stop-motion stepped time for Clay style (10fps tactile feel)
  const animTime = style === 'clay' ? Math.floor(timeSec * 10) / 10 : timeSec;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply gentle camera motion
  const cam = activeBeat.choreography.cameraMove;
  let scale = 1;
  let panX = 0;
  let panY = 0;

  if (cam === 'slow_zoom_in') {
    scale = 1 + beatProgress * 0.055;
  } else if (cam === 'slow_zoom_out') {
    scale = 1.055 - beatProgress * 0.055;
  } else if (cam === 'gentle_pan') {
    scale = 1.04;
    panX = (beatProgress - 0.5) * -28;
  }

  if (style === 'live-action style') {
    // Subtle handheld breathing camera sway
    panX += Math.sin(animTime * 1.1) * 4;
    panY += Math.cos(animTime * 0.85) * 3;
  }

  ctx.save();
  ctx.translate(width / 2 + panX, height / 2 + panY);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -height / 2);

  // 1. Background Environment
  drawEnvironment(
    ctx,
    width,
    height,
    activeBeat.choreography.environment,
    activeBeat.choreography.timeOfDay,
    style,
    animTime
  );

  // 2. Scene Prop (table/desk/bench/plant)
  drawSceneProp(
    ctx,
    width,
    height,
    activeBeat.choreography.environment,
    activeBeat.choreography.prop,
    style,
    animTime
  );

  // 3. Consistent Characters (locked to sceneConfig.characterBible)
  const bible = sceneConfig.characterBible;
  const lead = bible[0];
  const partner = bible[1];

  const speakingNow =
    isSpeaking ||
    (beatAudioDurations
      ? localTime <= (beatAudioDurations[activeBeat.index] ?? beatDuration - 0.6)
      : localTime >= 0.25 && localTime <= beatDuration - 0.5);

  if (lead) {
    const cx = width * activeBeat.choreography.leadX;
    const cy = height * 0.77;
    drawCharacter(ctx, {
      design: lead,
      x: cx,
      y: cy,
      scale: height / 720,
      facing: 1,
      pose: activeBeat.choreography.leadPose,
      emotion: activeBeat.choreography.leadEmotion,
      style,
      time: animTime,
      speaking: speakingNow && activeBeat.index % 2 === 0,
    });
  }

  if (partner) {
    const cx = width * activeBeat.choreography.partnerX;
    const cy = height * 0.77;
    drawCharacter(ctx, {
      design: partner,
      x: cx,
      y: cy,
      scale: height / 720,
      facing: -1,
      pose: activeBeat.choreography.partnerPose,
      emotion: activeBeat.choreography.partnerEmotion,
      style,
      time: animTime + 0.7,
      speaking: speakingNow && activeBeat.index % 2 === 1,
    });
  }

  // 4. Floating Emotion / Story Motif
  drawEmotionMotif(
    ctx,
    width,
    height,
    activeBeat.choreography.motif,
    activeBeat.choreography.leadX * width,
    height * 0.42,
    style,
    animTime
  );

  ctx.restore(); // end camera transform

  // 5. Style-specific post-processing overlay (watercolor paper, clay grain, live-action bokeh/film)
  drawStyleOverlay(ctx, width, height, style, animTime, activeBeat.choreography.timeOfDay);

  // 6. Soft Beat Cross-fade transition at start of beat (0.28s)
  if (localTime < 0.28 && activeBeat.index > 0) {
    const alpha = (1 - localTime / 0.28) * 0.35;
    ctx.fillStyle = `rgba(246, 248, 247, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
  }

  // 7. Burned-in Subtitles (White bold text, bottom of screen, max 2 lines, word-for-word)
  const chunks =
    subtitleChunksByBeat?.[activeBeat.index] ??
    buildSubtitleChunksForBeat(
      activeBeat.englishLines,
      activeBeat.startSec,
      activeBeat.endSec
    );
  const activeChunk = chunks.find(
    (c) => timeSec >= c.startSec && timeSec <= c.endSec
  );

  if (activeChunk && activeChunk.lines.length > 0) {
    drawBurnedInSubtitles(ctx, width, height, activeChunk.lines);
  }

  // 8. End credit overlay on final 2 seconds if requested
  if (showEndCredit && timeSec >= 27.6) {
    const fade = Math.min(1, (timeSec - 27.6) / 0.6);
    drawEndCreditBanner(ctx, width, height, sceneConfig.creatorName, fade);
  }

  ctx.restore();
}

function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  env: SettingEnvironment,
  timeOfDay: TimeOfDay,
  style: VisualStyle,
  time: number
) {
  const pal = getTimePalette(timeOfDay);
  const horizonY = h * 0.68;

  // Base background gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, pal.skyTop);
  skyGrad.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  // Ground / Floor
  ctx.fillStyle = pal.floor;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Environment-specific architecture
  if (env === 'cafe' || env === 'library' || env === 'home') {
    // Cozy interior wall
    ctx.fillStyle = pal.wall;
    ctx.fillRect(0, 0, w, horizonY);

    // Subtle wainscot / trim
    ctx.fillStyle = pal.wallShade;
    ctx.fillRect(0, horizonY - h * 0.14, w, h * 0.14);

    // Large sunlit window on left-center
    const winX = w * 0.12;
    const winY = h * 0.1;
    const winW = w * 0.34;
    const winH = h * 0.42;

    ctx.fillStyle = skyGrad;
    drawStyledRect(ctx, winX, winY, winW, winH, 10, style, '#4F5D66');

    // Distant trees outside window
    ctx.fillStyle = '#9BB8A6';
    ctx.beginPath();
    ctx.arc(winX + winW * 0.28, winY + winH * 0.72, winW * 0.22, 0, Math.PI * 2);
    ctx.arc(winX + winW * 0.62, winY + winH * 0.78, winW * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Window mullions
    ctx.strokeStyle = style === '2D animation' ? '#364148' : '#7B746C';
    ctx.lineWidth = style === '2D animation' ? 4 : 6;
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY);
    ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2);
    ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();

    // Sunbeams diagonal
    ctx.save();
    ctx.fillStyle = pal.sunTint;
    ctx.beginPath();
    ctx.moveTo(winX, winY);
    ctx.lineTo(winX + winW, winY);
    ctx.lineTo(winX + winW + w * 0.18, horizonY + h * 0.12);
    ctx.lineTo(winX + w * 0.1, horizonY + h * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right wall element: bookshelf (library/home) or menu board (cafe)
    if (env === 'library') {
      const bx = w * 0.62;
      const by = h * 0.12;
      const bw = w * 0.26;
      const bh = horizonY - by;
      drawStyledRect(ctx, bx, by, bw, bh, 6, style, '#6E5A4B', '#9D826D');
      // Books on shelves
      const bookColors = ['#6D8EA0', '#84A59D', '#D4A373', '#9E7B9B', '#B5838D'];
      for (let row = 0; row < 3; row++) {
        const sy = by + 26 + row * (bh / 3.2);
        ctx.fillStyle = '#735D4D';
        ctx.fillRect(bx + 10, sy + 52, bw - 20, 8);
        for (let b = 0; b < 9; b++) {
          ctx.fillStyle = bookColors[(row * 5 + b) % bookColors.length];
          const bhBook = 38 + ((b * 7 + row * 3) % 14);
          ctx.fillRect(bx + 18 + b * ((bw - 40) / 9), sy + 52 - bhBook, 18, bhBook);
        }
      }
    } else if (env === 'cafe') {
      // Framed art & hanging pendant lamps
      drawStyledRect(ctx, w * 0.66, h * 0.14, w * 0.18, h * 0.2, 8, style, '#525B5E', '#F8F7F4');
      ctx.fillStyle = '#8AA899';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.24, 34, 0, Math.PI * 2);
      ctx.fill();

      // Pendant lamp
      ctx.strokeStyle = '#4A5255';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.56, 0);
      ctx.lineTo(w * 0.56, h * 0.14);
      ctx.stroke();
      ctx.fillStyle = '#E6C79C';
      ctx.beginPath();
      ctx.arc(w * 0.56, h * 0.16, 24, Math.PI, 0);
      ctx.fill();
    } else {
      // Cozy home desk & potted plant
      drawStyledRect(ctx, w * 0.66, h * 0.16, w * 0.18, h * 0.16, 8, style, '#6E675F', '#F7F4EE');
    }
  } else if (env === 'park' || env === 'rooftop') {
    // Soft drifting clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    const drift = (time * 12) % (w + 200);
    drawCloud(ctx, ((w * 0.2 + drift) % (w + 180)) - 90, h * 0.16, 1.0);
    drawCloud(ctx, ((w * 0.68 + drift * 0.6) % (w + 180)) - 90, h * 0.23, 0.8);

    if (env === 'rooftop') {
      // Distant campus skyline silhouettes
      const buildings = [
        { x: 0.05, bw: 0.14, bh: 0.28 },
        { x: 0.2, bw: 0.12, bh: 0.22 },
        { x: 0.36, bw: 0.16, bh: 0.32 },
        { x: 0.58, bw: 0.15, bh: 0.25 },
        { x: 0.77, bw: 0.18, bh: 0.3 },
      ];
      ctx.fillStyle = '#B4C3CE';
      for (const b of buildings) {
        ctx.fillRect(w * b.x, horizonY - h * b.bh, w * b.bw, h * b.bh);
      }
      // Rooftop railing
      ctx.strokeStyle = '#6B7780';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, horizonY - 46);
      ctx.lineTo(w, horizonY - 46);
      ctx.stroke();
      for (let rx = 40; rx < w; rx += 90) {
        ctx.beginPath();
        ctx.moveTo(rx, horizonY - 46);
        ctx.lineTo(rx, horizonY);
        ctx.stroke();
      }
    } else {
      // Park rolling hills & trees
      ctx.fillStyle = '#B8D0BF';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.quadraticCurveTo(w * 0.28, horizonY - 90, w * 0.56, horizonY);
      ctx.quadraticCurveTo(w * 0.8, horizonY - 65, w, horizonY);
      ctx.fill();

      // Trees
      drawTree(ctx, w * 0.14, horizonY, 1.0, style);
      drawTree(ctx, w * 0.85, horizonY, 0.9, style);
    }
  } else {
    // Subway platform
    ctx.fillStyle = '#E5EAE8';
    ctx.fillRect(0, 0, w, horizonY);
    // Tile horizontal stripe
    ctx.fillStyle = '#8FA6B5';
    ctx.fillRect(0, h * 0.28, w, 26);
    // Yellow safety tactile strip on platform
    ctx.fillStyle = '#E3C565';
    ctx.fillRect(0, horizonY + 18, w, 12);
    // Pillars
    for (const px of [w * 0.14, w * 0.84]) {
      drawStyledRect(ctx, px, h * 0.04, 42, horizonY - h * 0.04, 4, style, '#6D7A82', '#C9D2D0');
    }
  }

  // Floor horizon line
  ctx.strokeStyle = style === '2D animation' ? '#364148' : 'rgba(60, 72, 76, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();

  if (pal.ambient !== 'rgba(255, 255, 255, 0)') {
    ctx.fillStyle = pal.ambient;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.arc(28, -8, 32, 0, Math.PI * 2);
  ctx.arc(58, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  s: number,
  style: VisualStyle
) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  // Trunk
  ctx.fillStyle = '#8D7360';
  ctx.fillRect(-12, -135, 24, 135);
  // Foliage
  ctx.fillStyle = '#8FB99E';
  ctx.beginPath();
  ctx.arc(0, -175, 58, 0, Math.PI * 2);
  ctx.arc(-40, -142, 42, 0, Math.PI * 2);
  ctx.arc(40, -142, 42, 0, Math.PI * 2);
  ctx.fill();
  if (style === '2D animation') {
    ctx.strokeStyle = '#33403A';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawStyledRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: VisualStyle,
  strokeColor: string,
  fillColor?: string
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (style === '2D animation') {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (style === 'watercolor') {
    ctx.strokeStyle = 'rgba(70, 62, 55, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawSceneProp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  env: SettingEnvironment,
  prop: Beat['choreography']['prop'],
  style: VisualStyle,
  time: number
) {
  const centerX = w * 0.5;
  const groundY = h * 0.68;

  if (env === 'cafe' || env === 'library' || env === 'home') {
    // Shared study/cafe table in center foreground
    const tx = centerX - 110;
    const ty = groundY - 22;
    drawStyledRect(ctx, tx, ty, 220, 16, 6, style, '#4A3F37', '#B89474');
    ctx.fillStyle = '#967458';
    ctx.fillRect(tx + 24, ty + 16, 12, 74);
    ctx.fillRect(tx + 184, ty + 16, 12, 74);

    if (prop === 'coffee_cup') {
      // Two small steaming ceramic mugs
      for (const mx of [centerX - 42, centerX + 26]) {
        ctx.fillStyle = '#F3EFEA';
        ctx.beginPath();
        ctx.roundRect(mx, ty - 24, 22, 24, 4);
        ctx.fill();
        // Steam wisps
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const sway = Math.sin(time * 2.5 + mx) * 4;
        ctx.moveTo(mx + 11, ty - 28);
        ctx.quadraticCurveTo(mx + 11 + sway, ty - 42, mx + 11 - sway, ty - 54);
        ctx.stroke();
      }
    } else if (prop === 'notebook') {
      ctx.fillStyle = '#E4ECE8';
      ctx.beginPath();
      ctx.roundRect(centerX - 36, ty - 10, 72, 10, 2);
      ctx.fill();
    } else if (prop === 'plant_pot') {
      ctx.fillStyle = '#C98F70';
      ctx.fillRect(centerX - 16, ty - 26, 32, 26);
      ctx.fillStyle = '#6FA07F';
      ctx.beginPath();
      ctx.arc(centerX - 6, ty - 34, 12, 0, Math.PI * 2);
      ctx.arc(centerX + 8, ty - 36, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (env === 'park' || env === 'rooftop') {
    // Wooden bench behind/between characters
    const bx = centerX - 135;
    const by = groundY - 36;
    drawStyledRect(ctx, bx, by, 270, 14, 5, style, '#4A3F37', '#B28B6B');
    drawStyledRect(ctx, bx, by - 26, 270, 14, 5, style, '#4A3F37', '#A57E5F');
    ctx.fillStyle = '#6D5B4E';
    ctx.fillRect(bx + 20, by + 14, 12, 42);
    ctx.fillRect(bx + 238, by + 14, 12, 42);
  }
}

interface DrawCharacterParams {
  design: CharacterDesign;
  x: number;
  y: number;
  scale: number;
  facing: 1 | -1;
  pose: CharacterPose;
  emotion: CharacterEmotion;
  style: VisualStyle;
  time: number;
  speaking: boolean;
}

function drawCharacter(ctx: CanvasRenderingContext2D, p: DrawCharacterParams) {
  const { design, x, y, scale, facing, pose, emotion, style, time, speaking } = p;

  const breathe = Math.sin(time * 2.4) * 3;
  const bounce =
    pose === 'celebrate'
      ? Math.abs(Math.sin(time * 6)) * -18
      : pose === 'nervous'
      ? Math.sin(time * 14) * 2
      : pose === 'walking'
      ? Math.abs(Math.sin(time * 5)) * -6
      : 0;

  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(scale, scale);

  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 43, 0.14)';
  ctx.beginPath();
  ctx.ellipse(0, 12 - bounce, 44, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  const outlineColor =
    style === '2D animation'
      ? '#242938'
      : style === 'watercolor'
      ? 'rgba(54, 48, 42, 0.65)'
      : 'transparent';
  const outlineWidth = style === '2D animation' ? 3 : style === 'watercolor' ? 2 : 0;

  // Legs & Shoes
  const legSpread = pose === 'walking' ? Math.sin(time * 5) * 14 : 12;
  drawLimb(ctx, -14 - legSpread * 0.3, -95, -16 - legSpread, -4, 18, design.bottomColor, outlineColor, outlineWidth, style);
  drawLimb(ctx, 14 + legSpread * 0.3, -95, 16 + legSpread, -4, 18, design.bottomColor, outlineColor, outlineWidth, style);

  // Shoes
  for (const sx of [-16 - legSpread, 16 + legSpread]) {
    ctx.fillStyle = design.shoeColor;
    ctx.beginPath();
    ctx.ellipse(sx + facing * 4, 2, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (outlineWidth > 0) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth;
      ctx.stroke();
    }
  }

  // Torso (Outfit Top - strictly locked to design.topColor!)
  ctx.save();
  ctx.translate(0, breathe * 0.5);
  ctx.fillStyle = design.topColor;
  ctx.beginPath();
  ctx.roundRect(-30, -185, 60, 96, 24);
  ctx.fill();

  // Clay highlight / cel shade on torso
  if (style === 'clay') {
    const grad = ctx.createRadialGradient(-10, -165, 4, 0, -135, 58);
    grad.addColorStop(0, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = grad;
    ctx.fill();
  } else if (style === '2D animation') {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.roundRect(4, -185, 26, 96, [0, 24, 24, 0]);
    ctx.fill();
  }

  if (outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.beginPath();
    ctx.roundRect(-30, -185, 60, 96, 24);
    ctx.stroke();
  }

  // Accessory: bag strap or scarf
  if (design.accessory === 'bag_strap') {
    ctx.strokeStyle = '#6B584C';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-22, -182);
    ctx.lineTo(24, -100);
    ctx.stroke();
  } else if (design.accessory === 'scarf') {
    ctx.fillStyle = '#D9B89C';
    ctx.beginPath();
    ctx.roundRect(-24, -188, 48, 18, 8);
    ctx.fill();
  }

  // Arms based on Pose
  const armWave = Math.sin(time * 4) * 10;
  let leftHand = { x: -42, y: -112 };
  let rightHand = { x: 42, y: -112 };

  if (pose === 'celebrate') {
    leftHand = { x: -50, y: -225 + armWave };
    rightHand = { x: 50, y: -225 - armWave };
  } else if (pose === 'encouraging' || pose === 'talking') {
    rightHand = { x: 56 * facing, y: -148 + armWave * 0.7 };
    leftHand = { x: -34 * facing, y: -118 };
  } else if (pose === 'nervous') {
    leftHand = { x: -16, y: -135 + Math.sin(time * 10) * 3 };
    rightHand = { x: 16, y: -135 - Math.sin(time * 10) * 3 };
  } else if (pose === 'thinking') {
    rightHand = { x: 18 * facing, y: -188 };
  } else if (pose === 'surprised') {
    leftHand = { x: -46, y: -168 };
    rightHand = { x: 46, y: -168 };
  }

  drawLimb(ctx, -26, -172, leftHand.x, leftHand.y, 14, design.topColor, outlineColor, outlineWidth, style);
  drawLimb(ctx, 26, -172, rightHand.x, rightHand.y, 14, design.topColor, outlineColor, outlineWidth, style);

  // Hands
  for (const hand of [leftHand, rightHand]) {
    ctx.fillStyle = design.skinTone;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 9, 0, Math.PI * 2);
    ctx.fill();
    if (outlineWidth > 0) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth * 0.8;
      ctx.stroke();
    }
  }

  // Neck
  ctx.fillStyle = design.skinTone;
  ctx.fillRect(-9, -200, 18, 20);

  // Head
  const headY = -232 + breathe * 0.8;
  const headTilt =
    emotion === 'worried' || emotion === 'anxious'
      ? -0.06 * facing
      : pose === 'thinking'
      ? 0.08 * facing
      : 0;

  ctx.save();
  ctx.translate(0, headY);
  ctx.rotate(headTilt);

  // Back hair for bob / ponytail / wavy
  ctx.fillStyle = design.hairColor;
  if (design.hairStyle === 'bob') {
    ctx.beginPath();
    ctx.roundRect(-42, -32, 84, 72, 32);
    ctx.fill();
  } else if (design.hairStyle === 'ponytail') {
    ctx.beginPath();
    ctx.ellipse(-34 * facing, 4, 16, 28, 0.3 * facing, 0, Math.PI * 2);
    ctx.fill();
  } else if (design.hairStyle === 'wavy') {
    ctx.beginPath();
    ctx.roundRect(-44, -30, 88, 82, 36);
    ctx.fill();
  }

  // Face Circle
  const faceRadius = style === 'live-action style' ? 36 : 38;
  ctx.fillStyle = design.skinTone;
  ctx.beginPath();
  ctx.arc(0, 0, faceRadius, 0, Math.PI * 2);
  ctx.fill();

  if (style === 'clay') {
    const faceGrad = ctx.createRadialGradient(-12, -14, 5, 0, 0, faceRadius);
    faceGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    faceGrad.addColorStop(1, 'rgba(130, 90, 60, 0.14)');
    ctx.fillStyle = faceGrad;
    ctx.fill();
  }
  if (outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();
  }

  // Soft warm cheeks
  ctx.fillStyle =
    emotion === 'anxious' || emotion === 'joyful'
      ? 'rgba(232, 140, 130, 0.38)'
      : 'rgba(232, 155, 140, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-18 + facing * 4, 10, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(18 + facing * 4, 10, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (with periodic blink)
  const blinkPhase = (time * 0.7) % 4.2;
  const isBlinking = blinkPhase > 4.05;
  const eyeOffsetX = facing * 4;

  ctx.fillStyle = '#22262E';
  ctx.strokeStyle = '#22262E';
  ctx.lineWidth = 2.5;

  for (const ex of [-13 + eyeOffsetX, 13 + eyeOffsetX]) {
    if (isBlinking) {
      ctx.beginPath();
      ctx.moveTo(ex - 5, -2);
      ctx.lineTo(ex + 5, -2);
      ctx.stroke();
    } else if (emotion === 'joyful') {
      // Happy curved eyes
      ctx.beginPath();
      ctx.arc(ex, 0, 5, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex, -2, emotion === 'anxious' ? 4.8 : 4, 0, Math.PI * 2);
      ctx.fill();
      // Eye catchlight
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex - 1.2, -3.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22262E';
    }
  }

  // Eyebrows
  ctx.strokeStyle = design.hairColor;
  ctx.lineWidth = 2.6;
  const browTilt = emotion === 'anxious' || emotion === 'worried' ? 3 : emotion === 'hopeful' ? -2 : 0;
  ctx.beginPath();
  ctx.moveTo(-19 + eyeOffsetX, -12 + browTilt);
  ctx.lineTo(-7 + eyeOffsetX, -13 - browTilt);
  ctx.moveTo(7 + eyeOffsetX, -13 - browTilt);
  ctx.lineTo(19 + eyeOffsetX, -12 + browTilt);
  ctx.stroke();

  // Mouth (animated lip-sync when speaking)
  const mouthOpen = speaking ? Math.abs(Math.sin(time * 13)) * 5.5 + 1.5 : 0;
  ctx.strokeStyle = '#3B2D2B';
  ctx.fillStyle = '#B86A66';
  ctx.lineWidth = 2.4;

  if (speaking) {
    ctx.beginPath();
    ctx.ellipse(eyeOffsetX, 15, 6, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'joyful' || emotion === 'relieved' || emotion === 'hopeful') {
    ctx.beginPath();
    ctx.arc(eyeOffsetX, 11, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (emotion === 'anxious' || emotion === 'worried') {
    ctx.beginPath();
    ctx.arc(eyeOffsetX, 18, 6, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(eyeOffsetX - 5, 14);
    ctx.lineTo(eyeOffsetX + 5, 14);
    ctx.stroke();
  }

  // Glasses accessory
  if (design.accessory === 'glasses') {
    ctx.strokeStyle = '#4A515B';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-13 + eyeOffsetX, -2, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(13 + eyeOffsetX, -2, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3 + eyeOffsetX, -2);
    ctx.lineTo(3 + eyeOffsetX, -2);
    ctx.stroke();
  }

  // Front Hair Bangs
  ctx.fillStyle = design.hairColor;
  ctx.beginPath();
  ctx.arc(0, -10, faceRadius + 2, Math.PI, 0);
  ctx.quadraticCurveTo(14, -14, 0, -20);
  ctx.quadraticCurveTo(-18, -12, -faceRadius - 2, -10);
  ctx.fill();

  if (design.accessory === 'beanie') {
    ctx.fillStyle = '#B57B6E';
    ctx.beginPath();
    ctx.arc(0, -18, faceRadius + 2, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-faceRadius - 4, -24, (faceRadius + 4) * 2, 12, 6);
    ctx.fill();
  }

  ctx.restore(); // head
  ctx.restore(); // torso breathe
  ctx.restore(); // character root
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  color: string,
  outlineColor: string,
  outlineWidth: number,
  style: VisualStyle
) {
  ctx.save();
  ctx.lineCap = 'round';
  if (outlineWidth > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = thickness + outlineWidth * 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  if (style === 'clay') {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = thickness * 0.35;
    ctx.beginPath();
    ctx.moveTo(x1 - 2, y1 - 2);
    ctx.lineTo(x2 - 2, y2 - 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEmotionMotif(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  motif: EmotionMotif,
  anchorX: number,
  anchorY: number,
  style: VisualStyle,
  time: number
) {
  if (motif === 'none') return;
  ctx.save();

  if (motif === 'butterflies') {
    // Gentle fluttering pastel butterflies
    for (let i = 0; i < 3; i++) {
      const bx = anchorX + Math.sin(time * 2.1 + i * 2) * 58 + (i - 1) * 32;
      const by = anchorY - 40 + Math.cos(time * 2.8 + i * 1.4) * 20 - i * 18;
      const flap = Math.abs(Math.sin(time * 9 + i));
      ctx.save();
      ctx.translate(bx, by);
      ctx.fillStyle = i === 1 ? '#8EA8D8' : '#E5B299';
      ctx.beginPath();
      ctx.ellipse(-7 * flap, 0, 8 * flap + 2, 10, -0.3, 0, Math.PI * 2);
      ctx.ellipse(7 * flap, 0, 8 * flap + 2, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (motif === 'sparkle') {
    for (let i = 0; i < 4; i++) {
      const sx = w * 0.3 + i * (w * 0.13);
      const sy = h * 0.24 + Math.sin(time * 2.5 + i) * 18;
      const pulse = 0.6 + 0.4 * Math.sin(time * 4 + i * 1.5);
      drawFourPointStar(ctx, sx, sy, 12 * pulse, '#E6BA67');
    }
  } else if (motif === 'lightbulb') {
    const lx = anchorX;
    const ly = anchorY - 88 + Math.sin(time * 3) * 4;
    ctx.fillStyle = 'rgba(246, 211, 101, 0.35)';
    ctx.beginPath();
    ctx.arc(lx, ly, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2C96B';
    ctx.beginPath();
    ctx.arc(lx, ly, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7E868C';
    ctx.fillRect(lx - 5, ly + 11, 10, 7);
  } else if (motif === 'spiral') {
    const sx = anchorX - 42;
    const sy = anchorY - 76 + Math.sin(time * 5) * 4;
    ctx.strokeStyle = style === '2D animation' ? '#6D7A8E' : 'rgba(92, 106, 125, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4.5; a += 0.35) {
      const r = a * 1.4;
      const px = sx + Math.cos(a + time * 4) * r;
      const py = sy + Math.sin(a + time * 4) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (motif === 'heart') {
    const hx = w * 0.5;
    const hy = anchorY - 58 + Math.sin(time * 2.4) * 6;
    ctx.fillStyle = '#D98C8C';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 10);
    ctx.bezierCurveTo(hx - 16, hy - 6, hx - 16, hy - 20, hx, hy - 10);
    ctx.bezierCurveTo(hx + 16, hy - 20, hx + 16, hy - 6, hx, hy + 10);
    ctx.fill();
  } else if (motif === 'sprout') {
    const px = w * 0.5;
    const py = h * 0.68 - 22;
    const grow = Math.min(1, 0.6 + 0.4 * Math.sin(time * 2));
    ctx.strokeStyle = '#4B7A5D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - 28 * grow);
    ctx.stroke();
    ctx.fillStyle = '#6FA682';
    ctx.beginPath();
    ctx.ellipse(px - 10, py - 26 * grow, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(px + 10, py - 28 * grow, 10, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === 'raindrop') {
    ctx.strokeStyle = 'rgba(138, 168, 194, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const rx = hash2d(i * 13) * w;
      const ry = ((hash2d(i * 29) * h + time * 260) % (h * 0.72));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 16);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(0, 0, size, 0);
  ctx.quadraticCurveTo(0, 0, 0, size);
  ctx.quadraticCurveTo(0, 0, -size, 0);
  ctx.quadraticCurveTo(0, 0, 0, -size);
  ctx.fill();
  ctx.restore();
}

function drawStyleOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: VisualStyle,
  time: number,
  timeOfDay: TimeOfDay
) {
  ctx.save();
  if (style === 'watercolor') {
    // Soft cold-press paper wash & subtle vignette border
    ctx.fillStyle = 'rgba(250, 245, 236, 0.14)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const wx = hash2d(i * 7 + 1) * w;
      const wy = hash2d(i * 11 + 2) * h;
      const rad = 120 + hash2d(i * 17) * 140;
      const g = ctx.createRadialGradient(wx, wy, 10, wx, wy, rad);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      g.addColorStop(1, 'rgba(235, 228, 215, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (style === 'clay') {
    // Soft warm studio vignette & subtle matte tactile dots
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.72);
    vig.addColorStop(0, 'rgba(255,255,255,0)');
    vig.addColorStop(1, 'rgba(42, 36, 30, 0.16)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  } else if (style === 'live-action style') {
    // Soft cinematic bokeh orbs + subtle lens vignette
    for (let i = 0; i < 8; i++) {
      const bx = ((hash2d(i * 19) * w + Math.sin(time * 0.4 + i) * 20) + w) % w;
      const by = hash2d(i * 31) * (h * 0.55);
      const r = 18 + hash2d(i * 43) * 26;
      ctx.fillStyle =
        timeOfDay === 'golden'
          ? 'rgba(255, 228, 175, 0.14)'
          : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(18, 22, 26, 0.24)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawBurnedInSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lines: string[]
) {
  const safeLines = lines.slice(0, 2);
  if (safeLines.length === 0) return;

  ctx.save();

  // Subtle bottom contrast scrim so white bold text is effortlessly legible across all styles
  const scrim = ctx.createLinearGradient(0, h * 0.74, 0, h);
  scrim.addColorStop(0, 'rgba(18, 23, 28, 0)');
  scrim.addColorStop(1, 'rgba(18, 23, 28, 0.56)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.74, w, h * 0.26);

  const fontSize = Math.round(h * 0.047); // ~34px on 720p
  const lineHeight = Math.round(fontSize * 1.28);
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const bottomPadding = h * 0.065;
  const startY = h - bottomPadding - (safeLines.length - 1) * lineHeight;

  safeLines.forEach((line, idx) => {
    const y = startY + idx * lineHeight;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Crisp dark outline + soft drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = 'rgba(15, 20, 25, 0.92)';
    ctx.lineWidth = Math.max(5, Math.round(fontSize * 0.2));
    ctx.strokeText(line, w / 2, y);

    // Pure white bold subtitle text
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, w / 2, y);
  });

  ctx.restore();
}

function drawEndCreditBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  creatorName: string,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  const displayName = creatorName.trim() || 'You';
  const text = `Made with Google AI Studio · Script by ${displayName}`;
  ctx.font = `600 ${Math.round(h * 0.025)}px "Outfit", "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Top-center subtle credit bar during closing seconds
  ctx.fillStyle = 'rgba(20, 26, 30, 0.52)';
  const metrics = ctx.measureText(text);
  const padX = 24;
  const boxW = metrics.width + padX * 2;
  ctx.beginPath();
  ctx.roundRect((w - boxW) / 2, 22, boxW, 34, 8);
  ctx.fill();

  ctx.fillStyle = '#F6F8F7';
  ctx.fillText(text, w / 2, 39);
  ctx.restore();
}
