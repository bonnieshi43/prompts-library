# Service Unit Test Generation Prompt

Before generating tests for an Angular service, **analyze first, then write code**, following the steps below.

---

## Step 1: Understand the implementation

- What is this service responsible for?
- For public methods: what are inputs, outputs, and side effects?
- Which external services does it depend on?
- Which methods return values (assertable) and which are `void` (only side effects can be verified)?
- Which methods have conditional branches (if / switch / ternary)?

---

## Step 2: Scenario-level analysis

> Applies to methods with HTTP calls, dialog interactions, routing, state changes

For each candidate method, ask three questions:

**What does the user want to do?** Describe user intent in one sentence.

**What does the implementation do?** Which request is sent, where the body comes from, what happens on success vs failure.

**Are they aligned?** Is the URL correct, are error branches handled, do side effects fire at the right time, and **are return values on error branches suitable for production** (no mock / dev-only fallback data mixed in).

> If a method is `void` and chains multiple dialog callbacks in series, mark it **skip** and leave it to component integration tests.

### Risk tagging

After identifying each test point, tag it `[Risk N]`:

| Level | Meaning | Generate? | Max per group |
|-------|---------|-----------|---------------|
| **Risk 3** | Silent failure, error branches, critical multi-branch paths, data corruption, security-related | Required | ≤ 4 |
| **Risk 2** | Happy path, URL/request body correctness, post-success side effects, important contracts | At least 1 per scenario | ≤ 3 |
| **Risk 1** | Parameter variants highly similar to existing cases, situations derivable directly from happy path | Skip | — |

> When over the limit, **keep cases with the most independent trigger paths**; demote the rest to Risk 1 and skip.

**Analysis output format:**
```
Method: updateAuthenticationProvider
  [Risk 2] Add: POST to ADD URL, navigate to list on success, body contains correct model
  [Risk 3] URL routing: EDIT URL + name when name is non-empty (critical branch)
  [Risk 3] Failure: catchError → snackBar fires, no navigation
```

**Generation rules:**
- One scenario method maps to **one `describe`**, ordered Risk 3 → Risk 2, respecting per-group limits above
- A single `it` may contain multiple checkpoints (annotate with `// (a)` `// (b)`) when they jointly describe one scenario’s full outcome
- `it()` strings start with `[Risk N]` so priorities are visible in test reports

---

## Step 3: Pure logic analysis

> Applies to side-effect-free transforms, utilities, data mapping

Beyond normal behavior, **focus on cases the implementation does not cover**, checking each row:

| Check | Focus |
|-------|-------|
| null / undefined | Crash vs safe default |
| Empty values / empty collections | Boundary behavior for `""` / `[]` |
| Single element | Loops, join, split with one item |
| Duplicates | Whether dedup logic actually works |
| Special characters | Delimiters, spaces inside data |
| Method name semantics | Whether implied contracts hold (e.g. does `getDistinct` really dedupe) |
| State symmetry | Merge / priority: is each state value protected consistently on both sides (old / new)? |

Tag `[Risk N]` the same way; skip Risk 1. Merge similar boundaries into one `it`.

**Generation rules:** One pure-logic method → **one `describe`**, Risk 3 → Risk 2, respecting per-group limits.

---

## Step 4: Identify KEY contracts and Design gaps

Before writing code, also capture:

**KEY contracts:** Which behaviors are invariants callers depend on? (For the file header comment)

**Design gaps:** Which situations are unhandled by the implementation but not worth testing? (Record in file header; do not generate cases)

**Known bugs:** Which boundary inputs cause runtime errors or wrong results? Record with `it.failing()` and a note on how to trigger. In Angular projects, zone.js overrides global `it` and `test`, so `.failing` may be missing; import the original `it` from `@jest/globals`:
```ts
import { it as jestIt } from "@jest/globals";
jestIt.failing("...", () => { ... });
```

---

## Step 5: Generate test code

Follow these conventions:

**File header comment (required):**
```ts
/**
 * XxxService — unit tests
 *
 * Risk-first coverage (N groups, M cases):
 *   Group 1 [Risk 3, 3, 2] — methodName (3 cases)
 *   Group 2 [Risk 2, 2]    — anotherMethod (2 cases)
 *
 * Confirmed bugs (it.failing — remove wrapper once fixed):
 *   - Describe bug, or write none
 *
 * KEY contracts:
 *   - List key invariants
 *
 * Design gaps:
 *   - List what is not tested and why
 */
```

**Other conventions:**
- Before each Group (= one method), use a separator comment; `describe()` string = method name; `it()` strings start with `[Risk N]`:
  ```ts
  // ---------------------------------------------------------------------------
  // Group 1 [Risk 3, 3, 2] — methodName
  // ---------------------------------------------------------------------------
  describe("methodName", () => {
    it("[Risk 3] should ... when ...", () => { ... });
    it("[Risk 3] should NOT ... when ...", () => { ... });
    it("[Risk 2] should ... on success", () => { ... });
  });
  ```
- `// 🔁 Regression-sensitive: reason` **only** on Risk 3 `it`, or Risk 2 when regression risk is not obvious from the test name; skip for routine Risk 2 happy paths
- Multiple checkpoints inside `it` with `// (a)` `// (b)`
- **Framework:** Prefer whatever best fits the layer; no hard mandate
- **Do not generate:** `void` methods with deeply chained dialogs; Risk 1 cases
