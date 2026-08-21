import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMatchable,
  diagnostics,
  disableDiagnostics,
  enableDiagnostics,
  peeker,
  peekTrace,
  type MatchableOf,
  type TraceEvent,
} from "../src/index.js";

const Status = createMatchable({
  Idle: () => ({}),
  Success: (data: unknown) => ({ data }),
  Error: (err: unknown) => ({ err }),
  Panic: (err: unknown) => ({ err }),
});

afterEach(() => {
  disableDiagnostics();
  vi.restoreAllMocks();
});

describe("constructor last arg", () => {
  it("does not copy branded diagnostics into the payload", () => {
    const idle = Status.Idle(diagnostics({ enabled: true }));
    expect(idle).toEqual({ tag: "Idle" });
    expect(JSON.stringify(idle)).toBe('{"tag":"Idle"}');

    const ok = Status.Success(1, diagnostics({ enabled: true }));
    expect(ok).toEqual({ tag: "Success", data: 1 });
    expect("enabled" in ok).toBe(false);
  });

  it("treats Success({ enabled: true }) as data, not a mask", () => {
    const value = Status.Success({ enabled: true });
    expect(value).toEqual({ tag: "Success", data: { enabled: true } });
    expect(peekTrace(value)).toEqual([]);
    Status.peek(value, { Success: () => {} });
    expect(peekTrace(value)).toEqual([]);
  });
});

describe("instance mask", () => {
  it("records peek then match when enabled", () => {
    const logErrors = peeker("logErrors", {
      Error: () => {},
    });
    const value = Status.Error("nope", diagnostics({ enabled: true }));
    Status.peek(value, logErrors);
    Status.match(value, {
      Idle: () => "",
      Success: () => "",
      Error: () => "err",
      Panic: () => "",
    });
    expect(peekTrace(value)).toEqual([
      { kind: "peek", peeker: "logErrors", tag: "Error", hit: true },
      { kind: "match", tag: "Error", peekers: ["logErrors"] },
    ]);
  });

  it("records a miss when the peeker has no arm for this tag", () => {
    const logErrors = peeker("logErrors", {
      Error: () => {},
    });
    const value = Status.Success(1, diagnostics({ enabled: true }));
    Status.peek(value, logErrors);
    expect(peekTrace(value)).toEqual([
      { kind: "peek", peeker: "logErrors", tag: "Success", hit: false },
    ]);
  });

  it("is silent when branches exclude this tag", () => {
    const value = Status.Success(
      1,
      diagnostics({ enabled: true, branches: ["Error"] }),
    );
    Status.peek(value, { Success: () => {} });
    Status.match(value, {
      Idle: () => "",
      Success: () => "ok",
      Error: () => "",
      Panic: () => "",
    });
    expect(peekTrace(value)).toEqual([]);
  });

  it("records Error when branches is [Error]", () => {
    const value = Status.Error(
      "x",
      diagnostics({ enabled: true, branches: ["Error"] }),
    );
    Status.peek(value, { Error: () => {} });
    expect(peekTrace(value)).toEqual([
      { kind: "peek", peeker: "anonymous", tag: "Error", hit: true },
    ]);
  });

  it("does not require onPeek to record", () => {
    const value = Status.Idle(diagnostics({ enabled: true }));
    Status.peek(value, { Idle: () => {} });
    expect(peekTrace(value)[0]).toMatchObject({ kind: "peek", hit: true });
  });
});

describe("withDiagnostics", () => {
  it("inherits the client mask on Success(data) without a last arg", () => {
    const Ns = Status.withDiagnostics({
      enabled: true,
      branches: ["Error"],
    });
    const ok = Ns.Success(1);
    Ns.peek(ok, { Success: () => {} });
    expect(peekTrace(ok)).toEqual([]);

    const err = Ns.Error("x");
    Ns.peek(err, { Error: () => {} });
    expect(peekTrace(err)).toEqual([
      { kind: "peek", peeker: "anonymous", tag: "Error", hit: true },
    ]);
  });

  it("treats per-instance diagnostics({ enabled: true }) as all tags", () => {
    const Ns = Status.withDiagnostics({
      enabled: true,
      branches: ["Error"],
    });
    const ok = Ns.Success(1, diagnostics({ enabled: true }));
    Ns.peek(ok, { Success: () => {} });
    expect(peekTrace(ok)).toEqual([
      { kind: "peek", peeker: "anonymous", tag: "Success", hit: true },
    ]);
  });

  it("keeps merge and MatchableOf on the bound namespace", () => {
    const Ns = Status.withDiagnostics({ enabled: true, branches: ["Error"] });
    const zipped = Ns.merge(Ns.Success(1), Ns.Success(2));
    expect(zipped).toEqual({ tag: "Success", data: [1, 2] });
    type Of = MatchableOf<typeof Ns>;
    const assigned: Of = Ns.Idle();
    expect(assigned.tag).toBe("Idle");
    const nested = Ns.withDiagnostics({ enabled: false });
    expect(nested.Idle().tag).toBe("Idle");
  });

  it("returns a copy from peekTrace", () => {
    const value = Status.Error("x", diagnostics({ enabled: true }));
    Status.peek(value, { Error: () => {} });
    const first = peekTrace(value);
    (first as TraceEvent[]).push({
      kind: "peek",
      peeker: "injected",
      tag: "Error",
      hit: true,
    });
    expect(peekTrace(value)).toHaveLength(1);
  });

  it("does not drop peek/match if onPeek throws", () => {
    const Ns = Status.withDiagnostics({
      enabled: true,
      onPeek: () => {
        throw new Error("reporter");
      },
    });
    const value = Ns.Error("x");
    expect(Ns.peek(value, { Error: () => {} })).toBe(value);
    expect(
      Ns.match(value, {
        Idle: () => "",
        Success: () => "",
        Error: () => "err",
        Panic: () => "",
      }),
    ).toBe("err");
  });

  it("lets an instance mask mute the client default", () => {
    const Ns = Status.withDiagnostics({ enabled: true });
    const err = Ns.Error("x", diagnostics({ enabled: false }));
    Ns.peek(err, { Error: () => {} });
    expect(peekTrace(err)).toEqual([]);
  });

  it("calls optional onPeek / onMatch when injected", () => {
    const peeks: unknown[] = [];
    const matches: unknown[] = [];
    const Ns = Status.withDiagnostics({
      enabled: true,
      onPeek: (e) => {
        peeks.push(e);
      },
      onMatch: (e) => {
        matches.push(e);
      },
    });
    const value = Ns.Error("x");
    Ns.peek(value, peeker("logErrors", { Error: () => {} }));
    Ns.match(value, {
      Idle: () => "",
      Success: () => "",
      Error: () => "err",
      Panic: () => "",
    });
    expect(peeks).toEqual([
      { kind: "peek", peeker: "logErrors", tag: "Error", hit: true },
    ]);
    expect(matches).toEqual([
      { kind: "match", tag: "Error", peekers: ["logErrors"] },
    ]);
  });
});

describe("global floor", () => {
  it("logs Panic even when the instance mask is off", () => {
    const cons = (
      globalThis as unknown as { console: { error: (...args: unknown[]) => void } }
    ).console;
    const spy = vi.spyOn(cons, "error").mockImplementation(() => {});
    enableDiagnostics(["Panic"]);
    const panic = Status.Panic("boom", diagnostics({ enabled: false }));
    Status.peek(panic, { Panic: () => {} });
    Status.match(panic, {
      Idle: () => "",
      Success: () => "",
      Error: () => "",
      Panic: () => "panic",
    });
    expect(spy).toHaveBeenCalled();
    expect(peekTrace(panic).map((e) => e.kind)).toEqual(["peek", "match"]);
    const ok = Status.Success(1);
    Status.peek(ok, { Success: () => {} });
    expect(peekTrace(ok)).toEqual([]);
  });

  it("unions enableDiagnostics calls and clears on disableDiagnostics", () => {
    const cons = (
      globalThis as unknown as { console: { error: (...args: unknown[]) => void } }
    ).console;
    const spy = vi.spyOn(cons, "error").mockImplementation(() => {});
    enableDiagnostics(["Panic"]);
    enableDiagnostics(["Error"]);
    Status.peek(Status.Error("x"), { Error: () => {} });
    Status.peek(Status.Panic("p"), { Panic: () => {} });
    expect(spy.mock.calls.length).toBe(2);
    disableDiagnostics();
    spy.mockClear();
    Status.peek(Status.Panic("p2", diagnostics({ enabled: true })), {
      Panic: () => {},
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
