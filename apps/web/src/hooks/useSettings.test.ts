import { describe, expect, it } from "vitest";
import { buildLegacyClientSettingsMigrationPatch } from "./useSettings";

describe("buildLegacyClientSettingsMigrationPatch", () => {
  it("migrates archive confirmation from legacy local settings", () => {
    expect(
      buildLegacyClientSettingsMigrationPatch({
        confirmThreadArchive: true,
        confirmThreadDelete: false,
      }),
    ).toEqual({
      confirmThreadArchive: true,
      confirmThreadDelete: false,
    });
  });

  it("migrates typography settings from legacy local settings", () => {
    expect(
      buildLegacyClientSettingsMigrationPatch({
        uiFontSize: "lg",
        terminalFontSize: "xl",
        uiFontFamily: "Atkinson Hyperlegible, system-ui, sans-serif",
        monoFontFamily: '"SF Mono", Menlo, monospace',
      }),
    ).toEqual({
      uiFontSize: "lg",
      terminalFontSize: "xl",
      uiFontFamily: "Atkinson Hyperlegible, system-ui, sans-serif",
      monoFontFamily: '"SF Mono", Menlo, monospace',
    });
  });
});
