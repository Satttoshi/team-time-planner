---
paths:
  - '**/*.{ts,tsx}'
---

# TypeScript Strictness Rules

## No `as` type assertions, no `any`

- **Never use `as` type assertions** (`value as SomeType`, `as unknown as SomeType`) in code you write or modify.
- **Never use the `any` type** — explicit (`: any`, `<any>`, `any[]`) or via `@ts-ignore`/`@ts-expect-error` to silence type errors.

These bypass the type checker and hide real bugs. Use instead:

- **Type guards / narrowing** for values of uncertain shape (e.g. jsonb columns, JSON.parse results): write a predicate (`function isJSONContent(v: unknown): v is JSONContent`) and validate.
- **`unknown` + narrowing** instead of `any` when a type is genuinely not known yet.
- **Generics** to preserve types through helpers instead of widening and re-asserting.
- **`satisfies`** to check a literal against a type without changing its inferred type.
- **Drizzle `.$type<T>()`** on jsonb columns in `src/lib/db/schema.ts` so DB values come back typed instead of needing casts at usage sites.
- **Proper mock typing** in tests: type factories/mocks against the real interfaces (see `src/test-utils/factories.ts`) rather than casting partial objects.

Still fine (not type assertions):

- `as const` (const assertions)
- Import renames: `import { type Swiper as SwiperClass } from 'swiper'`

## Existing violations

None — the codebase is clean as of July 2026 (jsonb columns are typed via `.$type<T>()` in the schema, `mockDb.ts` uses a typed thenable proxy, mocks are structurally typed). Keep it that way: do not add new `as` casts or `any` usages.
