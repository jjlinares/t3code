import {
  INLINE_TERMINAL_CONTEXT_PLACEHOLDER,
  type TerminalContextDraft,
} from "./lib/terminalContext";
import { findQuotedBlockAt } from "./lib/quotedText";

export type ComposerPromptSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "quote-block";
      text: string;
    }
  | {
      type: "mention";
      path: string;
    }
  | {
      type: "terminal-context";
      context: TerminalContextDraft | null;
    };

const MENTION_TOKEN_REGEX = /(^|\s)@([^\s@]+)(?=\s)/g;

function pushTextSegment(segments: ComposerPromptSegment[], text: string): void {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.type === "text") {
    last.text += text;
    return;
  }
  segments.push({ type: "text", text });
}

function splitPromptTextIntoComposerSegments(text: string): ComposerPromptSegment[] {
  const segments: ComposerPromptSegment[] = [];
  if (!text) {
    return segments;
  }

  let cursor = 0;
  for (const match of text.matchAll(MENTION_TOKEN_REGEX)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? "";
    const path = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const mentionStart = matchIndex + prefix.length;
    const mentionEnd = mentionStart + fullMatch.length - prefix.length;

    if (mentionStart > cursor) {
      pushTextSegment(segments, text.slice(cursor, mentionStart));
    }

    if (path.length > 0) {
      segments.push({ type: "mention", path });
    } else {
      pushTextSegment(segments, text.slice(mentionStart, mentionEnd));
    }

    cursor = mentionEnd;
  }

  if (cursor < text.length) {
    pushTextSegment(segments, text.slice(cursor));
  }

  return segments;
}

function countAdjacentLineBreakCharsBefore(text: string, start: number, minimum: number): number {
  let count = 0;
  let chars = 0;
  let cursor = start;
  while (cursor > 0) {
    if (text[cursor - 1] === "\n") {
      count += 1;
      chars += 1;
      cursor -= 1;
      if (cursor > 0 && text[cursor - 1] === "\r") {
        chars += 1;
        cursor -= 1;
      }
      continue;
    }
    if (text[cursor - 1] === "\r") {
      count += 1;
      chars += 1;
      cursor -= 1;
      continue;
    }
    break;
  }
  return count >= minimum ? chars : 0;
}

function countAdjacentLineBreakCharsAfter(text: string, start: number, minimum: number): number {
  let count = 0;
  let chars = 0;
  let cursor = start;
  while (cursor < text.length) {
    if (text[cursor] === "\r") {
      count += 1;
      chars += 1;
      cursor += 1;
      if (text[cursor] === "\n") {
        chars += 1;
        cursor += 1;
      }
      continue;
    }
    if (text[cursor] === "\n") {
      count += 1;
      chars += 1;
      cursor += 1;
      continue;
    }
    break;
  }
  return count >= minimum ? chars : 0;
}

export function splitPromptIntoComposerSegments(
  prompt: string,
  terminalContexts: ReadonlyArray<TerminalContextDraft> = [],
): ComposerPromptSegment[] {
  if (!prompt) {
    return [];
  }

  const segments: ComposerPromptSegment[] = [];
  let textCursor = 0;
  let terminalContextIndex = 0;

  let index = 0;
  while (index < prompt.length) {
    const quotedBlockMatch = findQuotedBlockAt(prompt, index);
    if (quotedBlockMatch) {
      const leadingNewlineCount = countAdjacentLineBreakCharsBefore(prompt, index, 2);
      const quoteStart = index - Math.min(index - textCursor, leadingNewlineCount);
      const trailingNewlineCount = countAdjacentLineBreakCharsAfter(
        prompt,
        quotedBlockMatch.end,
        2,
      );
      const quoteEnd = quotedBlockMatch.end + trailingNewlineCount;
      if (quoteStart > textCursor) {
        segments.push(...splitPromptTextIntoComposerSegments(prompt.slice(textCursor, quoteStart)));
      }
      segments.push({
        type: "quote-block",
        text: prompt.slice(quoteStart, quoteEnd),
      });
      index = quoteEnd;
      textCursor = quoteEnd;
      continue;
    }

    if (prompt[index] === INLINE_TERMINAL_CONTEXT_PLACEHOLDER) {
      if (index > textCursor) {
        segments.push(...splitPromptTextIntoComposerSegments(prompt.slice(textCursor, index)));
      }
      segments.push({
        type: "terminal-context",
        context: terminalContexts[terminalContextIndex] ?? null,
      });
      terminalContextIndex += 1;
      index += 1;
      textCursor = index;
      continue;
    }

    index += 1;
  }

  if (textCursor < prompt.length) {
    segments.push(...splitPromptTextIntoComposerSegments(prompt.slice(textCursor)));
  }

  return segments;
}
