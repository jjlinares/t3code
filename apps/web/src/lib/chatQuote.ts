import { formatQuotedBlock } from "./quotedText";

function getQuotedBlockPrefix(before: string): string {
  if (before.length === 0) {
    return "";
  }
  if (before.endsWith("\n\n")) {
    return "";
  }
  if (before.endsWith("\n")) {
    return "\n";
  }
  return "\n\n";
}

function getQuotedBlockSuffix(after: string): string {
  if (after.length === 0) {
    return "\n\n";
  }
  if (after.startsWith("\n\n")) {
    return "";
  }
  if (after.startsWith("\n")) {
    return "\n";
  }
  return "\n\n";
}

export function formatQuotedPromptInsertion(input: {
  selectedText: string;
  currentPrompt: string;
  cursor: number;
}): string {
  const quotedBlock = formatQuotedBlock(input.selectedText);
  if (quotedBlock.length === 0) {
    return "";
  }

  const safeCursor = Math.max(0, Math.min(input.currentPrompt.length, input.cursor));
  const before = input.currentPrompt.slice(0, safeCursor);
  const after = input.currentPrompt.slice(safeCursor);

  return `${getQuotedBlockPrefix(before)}${quotedBlock}${getQuotedBlockSuffix(after)}`;
}
