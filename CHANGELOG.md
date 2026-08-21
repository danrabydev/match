# Changelog

## 0.3.0

- **`peek` / `Ns.peek`** — optional void observers on a tagged value. Returns the same object (`===`). Omitted arms are no-ops. `match` is still the only exhaustive, value-returning actor.
- **`peeker(name, arms)`** — name a reusable peek map for diagnostics.
- **Diagnostics** — `diagnostics({ enabled, branches? })` as a branded last constructor argument; `Ns.withDiagnostics(opts)` at client init; `enableDiagnostics(["Panic", "Crit"])` as a process-wide floor. `onPeek` / `onMatch` are optional. `peekTrace(value)` pulls the trail. `peek` and `withDiagnostics` are reserved variant names.

## 0.2.0

First feature release after `0.1.0`.

- **`MatchableOf<Ns, Data, Err>`** — specialize `data` then `err`. Use `type X<T> = MatchableOf<typeof X, T>`.
- **Constructor inference** — one-argument constructors whose parameter is `unknown` infer `data` / `err` from the value.
- **`merge` / `Ns.merge`** — zip same-tag results into tuples; mixed tags become `Error` with `TagMismatch`. Requires an `Error` variant that stores `err`.
- **Bound `match`** infers from the value (narrow constructor results only require that arm; extra arms allowed on `Ns.match` only).
- **`merge` is a reserved variant name** (breaking for a 0.1.0 matchable that used `merge` as a tag).
- Source split under `src/`; examples catalog in `examples/`.
