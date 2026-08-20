# Examples

Runnable, typechecked catalog of every `@danrabydev/match` feature. `pnpm test` imports these files so snippets cannot rot.

| Feature | Where |
| --- | --- |
| API client app (`ApiResult<User>` / `ApiResult<Post>`) | [`api-client.ts`](./api-client.ts) |
| 1. Constructors and tags | [`catalog.ts`](./catalog.ts) §1 |
| 2. `MatchableOf` monomorphic | [`catalog.ts`](./catalog.ts) §2 |
| 3. Generic alias `X<TData>` / `X<TData, TErr>` | [`catalog.ts`](./catalog.ts) §3 |
| 4. Bound `Ns.match` | [`catalog.ts`](./catalog.ts) §4 |
| 5. Standalone `match` | [`catalog.ts`](./catalog.ts) §5 |
| 6. `MatchArms` | [`catalog.ts`](./catalog.ts) §6 |
| 7. `_tags` (order, omitted holes) | [`catalog.ts`](./catalog.ts) §7 |
| 8. Runtime unhandled variant | [`catalog.ts`](./catalog.ts) §8 |
| 9. Locked `tag` | [`catalog.ts`](./catalog.ts) §9 |
| 10. Plain-object payload copy | [`catalog.ts`](./catalog.ts) §10 |
| 11. Narrow constructor vs widened union | [`catalog.ts`](./catalog.ts) §11 |
| 12. Arity (illegal extra type args) | [`catalog.ts`](./catalog.ts) §12 |
| 13. Payload `extends` constraint | [`catalog.ts`](./catalog.ts) §13 |
| 14. Throwing arms | [`catalog.ts`](./catalog.ts) §14 |
| 15. `merge` same-tag zip / mismatch Error | [`catalog.ts`](./catalog.ts) §15 ; [`api-client.ts`](./api-client.ts) `loadPage` |
