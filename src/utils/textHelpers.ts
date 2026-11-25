import { Beat, ExpressionItem, SubtitleChunk } from '../types';

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function countTotalStoryboardWords(beats: Beat[]): number {
  return beats.reduce((sum, beat) => sum + countWords(beat.englishLines), 0);
}

/**
 * Checks whether an expression appears verbatim (exact substring match).
 * Also supports optional parenthetical variants if typed like "I've got butterflies (in my stomach)"
 * while preferring strict exact string presence first.
 */
export function isExpressionPresentExact(fullText: string, phrase: string): boolean {
  const target = phrase.trim();
  if (!target) return true;
  if (fullText.includes(target)) return true;
  // Also allow case-insensitive exact phrase match if user capitalized sentence start,
  // but check exact spelling and punctuation
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i').test(fullText);
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
  matchedPhrase?: string;
}

/**
 * Splits a beat's English line into segments so every matched expression is highlighted.
 */
export function segmentTextWithExpressions(
  text: string,
  expressions: ExpressionItem[]
): TextSegment[] {
  const activePhrases = expressions
    .map((e) => e.phrase.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!text || activePhrases.length === 0) {
    return [{ text, highlighted: false }];
  }

  const escapedList = activePhrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedList.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      const matched = activePhrases.find(
        (p) => p.toLowerCase() === part.toLowerCase()
      );
      return {
        text: part,
        highlighted: Boolean(matched),
        matchedPhrase: matched,
      };
    });
}

/**
 * Wraps a phrase/clause into at most 2 lines (max ~34 characters per line)
 * and splits longer beat lines into word-for-word timed subtitle chunks.
 */
export function buildSubtitleChunksForBeat(
  text: string,
  beatStartSec: number,
  beatEndSec: number
): SubtitleChunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const words = cleaned.split(' ');
  const maxCharsPerLine = 34;
  const maxWordsPerChunk = 11;

  // Group words into chunks that fit comfortably within 2 lines
  const rawChunks: string[][] = [];
  let currentChunk: string[] = [];

  for (const word of words) {
    const candidate = [...currentChunk, word].join(' ');
    const lines = wrapIntoMaxTwoLines(candidate, maxCharsPerLine);
    const fitsTwoLines = lines.length <= 2 && lines.every((l) => l.length <= maxCharsPerLine + 4);

    if (
      currentChunk.length > 0 &&
      (!fitsTwoLines || currentChunk.length >= maxWordsPerChunk)
    ) {
      rawChunks.push(currentChunk);
      currentChunk = [word];
    } else {
      currentChunk.push(word);
      // Prefer natural breaks at sentence boundaries if chunk is already substantial
      if (/[.!?]$/.test(word) && currentChunk.length >= 4) {
        rawChunks.push(currentChunk);
        currentChunk = [];
      }
    }
  }
  if (currentChunk.length > 0) {
    rawChunks.push(currentChunk);
  }

  const totalWords = Math.max(1, words.length);
  const totalDuration = Math.max(0.5, beatEndSec - beatStartSec);
  let cursor = beatStartSec;

  return rawChunks.map((chunkWords, idx) => {
    const chunkText = chunkWords.join(' ');
    const lines = wrapIntoMaxTwoLines(chunkText, maxCharsPerLine).slice(0, 2);
    const portion = chunkWords.length / totalWords;
    const duration =
      idx === rawChunks.length - 1
        ? Math.max(0.3, beatEndSec - cursor)
        : totalDuration * portion;
    const chunk: SubtitleChunk = {
      lines,
      startSec: cursor,
      endSec: cursor + duration,
    };
    cursor += duration;
    return chunk;
  });
}

export function wrapIntoMaxTwoLines(text: string, maxCharsPerLine = 34): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const full = words.join(' ');
  if (full.length <= maxCharsPerLine) {
    return [full];
  }

  // Find a balanced split point near the middle that respects maxCharsPerLine
  let bestSplit = 1;
  let bestScore = Infinity;

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const overflow =
      Math.max(0, line1.length - maxCharsPerLine) +
      Math.max(0, line2.length - maxCharsPerLine);
    const balance = Math.abs(line1.length - line2.length);
    const score = overflow * 100 + balance;
    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }

  return [
    words.slice(0, bestSplit).join(' '),
    words.slice(bestSplit).join(' '),
  ];
}
