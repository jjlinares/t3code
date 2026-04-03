import { describe, expect, it } from "vitest";

import {
  findQuotedBlockAt,
  formatQuotedBlockDisplayText,
  normalizeQuotedSelection,
} from "./quotedText";

describe("quotedText", () => {
  it("normalizes selected quote text consistently", () => {
    expect(normalizeQuotedSelection("\r\n\r\n  alpha\r\nbeta\r\n\r\n")).toBe("  alpha\nbeta");
  });

  it("finds CRLF quote blocks using original string offsets", () => {
    const prompt = "before\r\n\r\n<quote>\r\nalpha\r\nbeta\r\n</quote>\r\n\r\nafter";
    expect(findQuotedBlockAt(prompt, "before\r\n\r\n".length)).toEqual({
      start: "before\r\n\r\n".length,
      end: prompt.length - "\r\n\r\nafter".length,
      text: "<quote>\r\nalpha\r\nbeta\r\n</quote>",
    });
  });

  it("renders quote display text from padded quote block segments", () => {
    expect(formatQuotedBlockDisplayText("\n\n<quote>\r\nalpha\r\nbeta\r\n</quote>\n\n")).toBe(
      "alpha\nbeta",
    );
  });
});
