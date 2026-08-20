# Changelog

## 0.2.0

First feature release after `0.1.0`.

- **`MatchableOf<Ns, Data, Err>`** — specialize `data` then `err`. Use `type X<T> = MatchableOf<typeof X, T>`.
- **Constructor inference** — one-argument constructors whose parameter is `unknown` infer `data` / `err` from the value.
- **`merge` / `Ns.merge`** — zip same-tag results into tuples; mixed tags become `Error` with `TagMismatch`. Requires an `Error` variant that stores `err`.
- **Bound `match`** infers from the value (narrow constructor results only require that arm; extra arms allowed on `Ns.match` only).
- **`merge` is a reserved variant name** (breaking for a 0.1.0 matchable that used `merge` as a tag).
- Source split under `src/`; examples catalog in `examples/`.
