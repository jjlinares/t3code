import { TurnId } from "@t3tools/contracts";

export type DiffRouteSource = "turn" | "last-commit";
export const DEFAULT_DIFF_ROUTE_SOURCE: DiffRouteSource = "turn";

export interface DiffRouteSearch {
  diff?: "1" | undefined;
  diffSource?: DiffRouteSource | undefined;
  diffTurnId?: TurnId | undefined;
  diffFilePath?: string | undefined;
}

function isDiffOpenValue(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function normalizeSearchString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeDiffSource(value: unknown): DiffRouteSource | undefined {
  return value === "last-commit" ? "last-commit" : undefined;
}

export function stripDiffSearchParams<T extends Record<string, unknown>>(
  params: T,
): Omit<T, "diff" | "diffSource" | "diffTurnId" | "diffFilePath"> {
  const {
    diff: _diff,
    diffSource: _diffSource,
    diffTurnId: _diffTurnId,
    diffFilePath: _diffFilePath,
    ...rest
  } = params;
  return rest as Omit<T, "diff" | "diffSource" | "diffTurnId" | "diffFilePath">;
}

export function parseDiffRouteSearch(search: Record<string, unknown>): DiffRouteSearch {
  const diff = isDiffOpenValue(search.diff) ? "1" : undefined;
  const diffSource = diff ? normalizeDiffSource(search.diffSource) : undefined;
  const activeSource = diffSource ?? DEFAULT_DIFF_ROUTE_SOURCE;
  const diffTurnIdRaw =
    diff && activeSource === "turn" ? normalizeSearchString(search.diffTurnId) : undefined;
  const diffTurnId = diffTurnIdRaw ? TurnId.makeUnsafe(diffTurnIdRaw) : undefined;
  const diffFilePath =
    diff && (activeSource === "last-commit" || diffTurnId)
      ? normalizeSearchString(search.diffFilePath)
      : undefined;

  return {
    ...(diff ? { diff } : {}),
    ...(diffSource ? { diffSource } : {}),
    ...(diffTurnId ? { diffTurnId } : {}),
    ...(diffFilePath ? { diffFilePath } : {}),
  };
}
