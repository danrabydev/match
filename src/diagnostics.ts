/**
 * Opt-in trail for peek/match. A mask, not a required logger.
 *
 * Emit if the global floor lists this tag, or this instance’s mask is
 * enabled and lists the tag (or lists none = all tags).
 */

export const DIAG = Symbol("match.diag");
export const DIAG_BRAND = Symbol("match.diagBrand");
const trails = new WeakMap<object, TraceEvent[]>();

export type DiagOptions<Tags extends string = string> = {
  enabled: boolean;
  branches?: readonly Tags[];
};

export type PeekTraceEvent = {
  kind: "peek";
  peeker: string;
  tag: string;
  hit: boolean;
};

export type MatchTraceEvent = {
  kind: "match";
  tag: string;
  peekers: string[];
};

export type TraceEvent = PeekTraceEvent | MatchTraceEvent;

export type DiagReporters = {
  onPeek?: (event: PeekTraceEvent) => void;
  onMatch?: (event: MatchTraceEvent) => void;
};

export type DiagSlot = DiagOptions & DiagReporters;

export type BrandedDiag<Tags extends string = string> = DiagOptions<Tags> & {
  readonly [DIAG_BRAND]: true;
};

/**
 * Brand a diag mask so constructors can tell it from payload.
 * `Success({ enabled: true })` is data; `Success(data, diagnostics({ enabled: true }))` is a mask.
 */
export function diagnostics<Tags extends string>(
  opts: DiagOptions<Tags>,
): BrandedDiag<Tags> {
  return {
    enabled: opts.enabled,
    ...(opts.branches === undefined ? {} : { branches: opts.branches }),
    [DIAG_BRAND]: true as const,
  };
}

export function isDiagnostics(value: unknown): value is BrandedDiag {
  return typeof value === "object" && value !== null && DIAG_BRAND in value;
}

type DiagHolder = {
  [DIAG]?: DiagSlot;
};

let globalOn = false;
const globalTags = new Set<string>();

/** Process-wide floor: these tags always emit (default `console.error`). Unions across calls. */
export function enableDiagnostics(branches: readonly string[]): void {
  globalOn = true;
  for (const tag of branches) {
    globalTags.add(tag);
  }
}

/** Clear the global floor (tests). */
export function disableDiagnostics(): void {
  globalOn = false;
  globalTags.clear();
}

export function attachDiag<T extends object>(value: T, slot: DiagSlot): T {
  Object.defineProperty(value, DIAG, {
    value: slot,
    enumerable: false,
    configurable: true,
    writable: false,
  });
  return value;
}

export function getDiag(value: object): DiagSlot | undefined {
  return (value as DiagHolder)[DIAG];
}

export function peekTrace(value: object): readonly TraceEvent[] {
  const trail = trails.get(value);
  return trail === undefined ? [] : trail.slice();
}

function appendTrail(value: object, event: TraceEvent): void {
  let trail = trails.get(value);
  if (trail === undefined) {
    trail = [];
    trails.set(value, trail);
  }
  trail.push(event);
}

function shouldEmit(value: { tag: string }): {
  floor: boolean;
  masked: boolean;
  slot: DiagSlot | undefined;
} {
  const tag = value.tag;
  const floor = globalOn && globalTags.has(tag);
  const slot = (value as DiagHolder)[DIAG];
  const masked =
    slot !== undefined &&
    slot.enabled === true &&
    (slot.branches === undefined || slot.branches.includes(tag));
  return { floor, masked, slot };
}

export function emitPeek(
  value: { tag: string },
  peeker: string,
  hit: boolean,
): void {
  try {
    const { floor, masked, slot } = shouldEmit(value);
    if (!floor && !masked) return;

    const event: PeekTraceEvent = {
      kind: "peek",
      peeker,
      tag: value.tag,
      hit,
    };
    appendTrail(value, event);
    slot?.onPeek?.(event);
    if (floor) {
      diagLog("[match] peek", event.peeker, event.tag, event.hit);
    }
  } catch {
    // Diagnostics must not change peek results.
  }
}

export function emitMatch(value: { tag: string }): void {
  try {
    const { floor, masked, slot } = shouldEmit(value);
    if (!floor && !masked) return;

    const recorded = trails.get(value) ?? [];
    const peekers = recorded
      .filter((e): e is PeekTraceEvent => e.kind === "peek")
      .map((e) => e.peeker);
    const event: MatchTraceEvent = {
      kind: "match",
      tag: value.tag,
      peekers,
    };
    appendTrail(value, event);
    slot?.onMatch?.(event);
    if (floor) {
      diagLog("[match] match", event.tag, "after", peekers);
    }
  } catch {
    // Diagnostics must not change match results.
  }
}

function diagLog(...args: unknown[]): void {
  const c = (globalThis as { console?: { error: (...a: unknown[]) => void } })
    .console;
  c?.error(...args);
}
