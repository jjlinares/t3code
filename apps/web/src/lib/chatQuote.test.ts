import { describe, expect, it } from "vitest";

import { formatQuotedPromptInsertion } from "./chatQuote";

describe("formatQuotedPromptInsertion", () => {
  it("formats a quoted block for an empty composer", () => {
    expect(
      formatQuotedPromptInsertion({
        selectedText: "Alpha\nBeta",
        currentPrompt: "",
        cursor: 0,
      }),
    ).toBe("<quote>\nAlpha\nBeta\n</quote>\n\n");
  });

  it("separates the quote from existing text when inserting at the end", () => {
    expect(
      formatQuotedPromptInsertion({
        selectedText: "Alpha",
        currentPrompt: "Follow up on this",
        cursor: "Follow up on this".length,
      }),
    ).toBe("\n\n<quote>\nAlpha\n</quote>\n\n");
  });

  it("preserves indentation while trimming blank outer lines", () => {
    expect(
      formatQuotedPromptInsertion({
        selectedText: "\n\n  const value = 1;\n\n",
        currentPrompt: "",
        cursor: 0,
      }),
    ).toBe("<quote>\n  const value = 1;\n</quote>\n\n");
  });

  it("adds spacing on both sides when inserting in the middle of text", () => {
    expect(
      formatQuotedPromptInsertion({
        selectedText: "Alpha",
        currentPrompt: "BeforeAfter",
        cursor: 6,
      }),
    ).toBe("\n\n<quote>\nAlpha\n</quote>\n\n");
  });
});
