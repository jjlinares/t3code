import { describe, expect, it } from "vitest";

import { splitPromptIntoComposerSegments } from "./composer-editor-mentions";
import { INLINE_TERMINAL_CONTEXT_PLACEHOLDER } from "./lib/terminalContext";

describe("splitPromptIntoComposerSegments", () => {
  it("splits mention tokens followed by whitespace into mention segments", () => {
    expect(splitPromptIntoComposerSegments("Inspect @AGENTS.md please")).toEqual([
      { type: "text", text: "Inspect " },
      { type: "mention", path: "AGENTS.md" },
      { type: "text", text: " please" },
    ]);
  });

  it("does not convert an incomplete trailing mention token", () => {
    expect(splitPromptIntoComposerSegments("Inspect @AGENTS.md")).toEqual([
      { type: "text", text: "Inspect @AGENTS.md" },
    ]);
  });

  it("keeps newlines around mention tokens", () => {
    expect(splitPromptIntoComposerSegments("one\n@src/index.ts \ntwo")).toEqual([
      { type: "text", text: "one\n" },
      { type: "mention", path: "src/index.ts" },
      { type: "text", text: " \ntwo" },
    ]);
  });

  it("keeps inline terminal context placeholders at their prompt positions", () => {
    expect(
      splitPromptIntoComposerSegments(
        `Inspect ${INLINE_TERMINAL_CONTEXT_PLACEHOLDER}@AGENTS.md please`,
      ),
    ).toEqual([
      { type: "text", text: "Inspect " },
      { type: "terminal-context", context: null },
      { type: "mention", path: "AGENTS.md" },
      { type: "text", text: " please" },
    ]);
  });

  it("keeps standalone quote tag blocks as dedicated segments", () => {
    expect(
      splitPromptIntoComposerSegments(
        [
          "Explain this",
          "",
          "<quote>",
          "first line",
          "second line",
          "</quote>",
          "",
          "Follow-up",
        ].join("\n"),
      ),
    ).toEqual([
      { type: "text", text: "Explain this" },
      { type: "quote-block", text: "\n\n<quote>\nfirst line\nsecond line\n</quote>\n\n" },
      { type: "text", text: "Follow-up" },
    ]);
  });

  it("does not tokenize mentions inside quote blocks", () => {
    expect(
      splitPromptIntoComposerSegments("<quote>\ninspect @AGENTS.md\nthen summarize\n</quote>"),
    ).toEqual([
      { type: "quote-block", text: "<quote>\ninspect @AGENTS.md\nthen summarize\n</quote>" },
    ]);
  });

  it("preserves CRLF quote blocks without truncating closing tags", () => {
    expect(
      splitPromptIntoComposerSegments(
        "before\r\n\r\n<quote>\r\ninspect @AGENTS.md\r\nthen summarize\r\n</quote>\r\n\r\nafter",
      ),
    ).toEqual([
      { type: "text", text: "before" },
      {
        type: "quote-block",
        text: "\r\n\r\n<quote>\r\ninspect @AGENTS.md\r\nthen summarize\r\n</quote>\r\n\r\n",
      },
      { type: "text", text: "after" },
    ]);
  });
});
