export const QUOTE_OPEN_TAG = "<quote>";
export const QUOTE_CLOSE_TAG = "</quote>";

export interface QuotedBlockMatch {
  start: number;
  end: number;
  text: string;
}

function normalizeQuotedText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\u200b/g, "");
}

function trimOuterBlankLines(text: string): string {
  const lines = normalizeQuotedText(text).split("\n");

  while (lines.length > 0 && lines[0]?.trim().length === 0) {
    lines.shift();
  }
  while (lines.length > 0 && lines.at(-1)?.trim().length === 0) {
    lines.pop();
  }

  return lines.join("\n");
}

function readLineBreakLength(text: string, index: number): number {
  const char = text[index];
  if (char === "\r") {
    return text[index + 1] === "\n" ? 2 : 1;
  }
  if (char === "\n") {
    return 1;
  }
  return 0;
}

function isStartOfLine(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const previousChar = text[index - 1];
  return previousChar === "\n" || previousChar === "\r";
}

export function normalizeQuotedSelection(selectedText: string): string {
  return trimOuterBlankLines(selectedText);
}

export function formatQuotedBlock(selectedText: string): string {
  const normalizedSelection = normalizeQuotedSelection(selectedText);
  if (normalizedSelection.length === 0) {
    return "";
  }

  return `${QUOTE_OPEN_TAG}\n${normalizedSelection}\n${QUOTE_CLOSE_TAG}`;
}

export function findQuotedBlockAt(text: string, start: number): QuotedBlockMatch | null {
  if (!isStartOfLine(text, start) || !text.startsWith(QUOTE_OPEN_TAG, start)) {
    return null;
  }

  let cursor = start + QUOTE_OPEN_TAG.length;
  if (cursor < text.length) {
    const openingLineBreakLength = readLineBreakLength(text, cursor);
    if (openingLineBreakLength === 0) {
      return null;
    }
    cursor += openingLineBreakLength;
  }

  let searchIndex = cursor;
  while (searchIndex <= text.length) {
    const closeTagStart = text.indexOf(QUOTE_CLOSE_TAG, searchIndex);
    if (closeTagStart === -1) {
      return null;
    }
    if (!isStartOfLine(text, closeTagStart)) {
      searchIndex = closeTagStart + QUOTE_CLOSE_TAG.length;
      continue;
    }
    const end = closeTagStart + QUOTE_CLOSE_TAG.length;
    return {
      start,
      end,
      text: text.slice(start, end),
    };
  }

  return null;
}

function extractQuotedBlockInnerText(quotedBlock: string): string | null {
  const trimmedBlock = trimOuterBlankLines(quotedBlock);
  const match = findQuotedBlockAt(trimmedBlock, 0);
  if (!match || match.end !== trimmedBlock.length) {
    return null;
  }

  let contentStart = QUOTE_OPEN_TAG.length;
  if (contentStart < trimmedBlock.length) {
    contentStart += readLineBreakLength(trimmedBlock, contentStart);
  }
  const contentEnd = match.end - QUOTE_CLOSE_TAG.length;
  if (contentEnd < contentStart) {
    return "";
  }

  return normalizeQuotedSelection(trimmedBlock.slice(contentStart, contentEnd));
}

export function formatQuotedBlockDisplayText(quotedBlock: string): string {
  const innerText = extractQuotedBlockInnerText(quotedBlock);
  if (innerText === null) {
    return normalizeQuotedSelection(quotedBlock);
  }
  return normalizeQuotedSelection(innerText);
}
