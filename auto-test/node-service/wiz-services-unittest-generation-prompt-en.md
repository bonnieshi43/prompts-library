# Node.js Service Unit Test Generation Prompt

Before writing unit tests for **Node.js + TypeScript** backend modules, **analyze first, then write code**. The test runner is **Jest** (`testEnvironment: "node"`).

---

## Scope and exclusions

**In scope:** Services, utils (pure functions), repositories, middleware, and other backend modules isolatable with `jest.mock`; when validating Express routes and handlers, **Supertest** may be used (see Step 6).

**Explicitly out of scope:**

- **Real outbound I/O:** Database / cache / third-party APIs / filesystem / external HTTP — always **mock**, or use in-memory substitutes (e.g. `mongodb-memory-server` only when clearly needed).
- **Semantic quality of AI model output** (if LLM calls exist: mock return values only; do not assert on “good” vs “bad” generated text).

---

## Step 1: Understand the implementation

Answer these before writing tests:

- What is the module’s **responsibility**? Which functions / classes / singletons are exported?
- **Public API** inputs and return types; which are `Promise` vs synchronous?
- **Side effects:** DB writes, cache, HTTP, files, messaging?
- Which modules are **injected or directly imported**? (Candidates for `jest.mock`)
- Which paths have **branches** (if / switch / ternary / early return)?
- Does the module hold **module-level state** (singleton cache, module-level vars)? Do you need `beforeEach` reset?
- Is the target function **exported**? During analysis, decide whether to add `export` (minimal source change); if export is inappropriate, use indirect testing or mark as integration-test scope.

---

## Step 2: Integration-boundary scenario analysis (I/O, async, multiple deps)

> Applies to: axios, DB drivers, cache, SDKs, other internal services, filesystem, etc.

For each candidate method, tighten the scenario in three sentences (**caller / API contract** language, not UI):

1. **What does the caller expect?** (Structure on success; on failure: throw vs distinguishable error codes.)
2. **What does the implementation actually do?** (Which dependency, which key arguments, what each success/failure branch does.)
3. **Are they aligned?** Including URL / method / headers, DB filters, **whether errors are swallowed after catch**, whether return values are production-suitable.

**For every outbound call assertion, verify together:**

- **Was it called:** `expect(mockFn).toHaveBeenCalledWith(...)` with full argument shape
- **Call count:** `expect(mockFn).toHaveBeenCalledTimes(N)` — omitting this misses double-execution bugs
- **Error type:** `.rejects.toThrow(SpecificError)` or `error.code` / `error.message`, not just “something threw”

You may mark **skip** for integration tests or manual checklists when:

- Behavior needs a real cluster or multi-service coordination.
- Only end-to-end can validate the full chain.

### Risk tagging

Tag each test intent `[Risk N]`:

| Level | Meaning | Generate? | Suggested max per `describe` (grouped by method or scenario) |
|-------|---------|-------------|----------------------------------------------------------------|
| **Risk 3** | Silent failure, error branches, critical branches, data corruption risk, security isolation | Required | ≤ 4 |
| **Risk 2** | Happy path, request parameter correctness, post-success persistence or return contract | At least 1 per group | ≤ 3 |
| **Risk 1** | Near-duplicate of existing cases, derivable from happy path | Do not generate | — |

When over the limit, **keep cases with the most independent trigger paths**; demote the rest to Risk 1 and skip.

**Analysis output example:**
```
Method: syncRecords
  [Risk 3] When id empty: should throw or early-return, no DB write
  [Risk 3] DB upsert failure: should log/throw, not succeed silently
  [Risk 2] Happy path: DB called with expected filter and fields
```

**Generation rules:**

- One focused scenario → **one `describe`**, case order **Risk 3 → Risk 2**.
- `it` titles start with **`[Risk N]`** for report filtering.
- Multiple assertions in one `it`: annotate with `// (a)` `// (b)`.

---

## Step 3: Pure logic analysis

> Applies to: side-effect-free transforms, validation, formatting, pure utility functions.

Beyond happy path, consider each row:

| Check | Focus |
|-------|-------|
| `null` / `undefined` | Throw vs safe default |
| Empty string / array / object | Clear boundary behavior |
| Single vs duplicate elements | Dedupe, merge, sort still correct |
| Special chars, delimiters | Parsing / concatenation robustness |
| Naming vs contract | e.g. does `getDistinct` really dedupe |
| Multi-state merges | Symmetric handling on old/new sides |
| **Input mutation** | Accidental in-place changes to args (compare before/after with `deepEqual`) |
| **Union types** | When input is `A | A[]`, etc., each branch has a case |
| **Enum exhaustiveness** | For switch / if-else on enums: every enum value maps explicitly; does `default` silently swallow unknowns? |

Use `[Risk N]` the same way; do not generate Risk 1; merge similar boundaries into one `it`.

---

## Step 4: KEY contracts, Design gaps, known issues

Before committing test code, capture:

**KEY contracts** — Invariants callers depend on (in the test file header).

**Design gaps** — Situations not covered by the implementation that are **not worth** unit tests (explain in header; no cases).

**Known bugs** — If any, record with **`it.failing`**, reproduction path, and assertions for the **correct** expected behavior. Tests keep running: while the bug exists they “pass” (expected failure); after a fix, Jest fails and reminds you to remove `.failing`. If the correct expectation **cannot be expressed yet** (types, nodes, APIs undefined), mark as **Design gap** instead; do not add `it.failing`.

---

## Step 5: Generate test code (conventions)

### 5.1 Location and naming

- Follow `testMatch` in the project’s `jest.config.ts`; place files under the appropriate `test/` directory.
- Suggested name: `{module-or-topic}.test.ts`.

### 5.2 Mock strategy and isolation

- **axios / fetch:** `jest.mock("axios")`, assert URL, method, body.
- **DB / ORM:** mock module or inject fake repository; avoid real connections.
- **Cache / queues / cloud SDKs:** mock the corresponding module exports.
- **LLM / AI SDK** (if any): mock `invoke` / `stream` with fixed values; do not assert on output text quality.
- **Internal side-effect modules:** If the module under test imports internal stateful modules (e.g. DB / Redis / HTTP client init), mock them in the test file too; mock paths resolve **relative to the test file**, not relative paths inside the module under test.
- **Isolation:** At the top of each `describe`, `beforeEach(() => jest.clearAllMocks())` to avoid cross-case call-count pollution.

### 5.3 File header comment

**Every new test file must start with this comment**, immediately before `jest.mock(...)` (if any) or before the first `import`.

```ts
/**
 * {ModuleName} — unit tests
 *
 * Risk-first coverage (N groups, M cases):
 *   Group 1 [Risk 3, 3, 2] — methodName (3 cases)
 *
 * Confirmed bugs (it.failing — remove wrapper when fixed):
 *   - ...
 *
 * KEY contracts:
 *   - ...
 *
 * Design gaps:
 *   - ...
 */
```

### 5.4 Structure and style

```ts
// ---------------------------------------------------------------------------
// Group 1 [Risk 3, 3, 2] — methodName
// ---------------------------------------------------------------------------
describe("methodName", () => {
  it("[Risk 3] should ... when ...", async () => {
    // (a) ...
    // (b) ...
  });
});
```

- **Async:** Prefer `async/await`; use `expect(...).rejects` for Promise rejections.
- **Do not** loosen production types or error handling just to pass tests (unless a separate PR).

### 5.5 Test helpers

- Define `makeXxx(...)`-style helpers per file, **only fields the function under test actually reads**; use `{} as any` for the rest to avoid tight coupling to full types.
- If different `describe` groups need different shapes, use **multiple focused helpers** instead of one mega-helper with many optional params.
- Helpers must not contain assertions; only build inputs.

---

## Step 6 (optional): Routes + Supertest

When validating **HTTP layer + service collaboration** (still with mocked lower layers):

- Use **Supertest** against a test `app` or standalone `Router`.
- Split from “pure service unit tests” to avoid huge files.

---

## Self-check (after generation)

- [ ] All outbound I/O mocked; tests run with no external deps
- [ ] No assertions on **AI model text content** (if LLM calls exist)
- [ ] Error branches (Risk 3) covered; exceptions not swallowed silently
- [ ] Critical outbound calls verify **call count** (`toHaveBeenCalledTimes`)
- [ ] Throw assertions check **error type or message**, not only “threw”
- [ ] Each `describe` has `beforeEach(() => jest.clearAllMocks())`
- [ ] New file paths match project `testMatch`
- [ ] New files have full header (Risk-first summary, Confirmed bugs, KEY contracts, Design gaps)
- [ ] `npx jest <file> --no-coverage` passes
