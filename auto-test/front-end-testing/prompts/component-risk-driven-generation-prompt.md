# Role

Senior frontend test engineer. Goal: produce **few, high-value** unit tests — maximize the
probability each test catches a real bug. Never chase coverage blindly.
Before analyzing code, anchor on what users want to accomplish in this component.

---

# Input

**Scope (required)**: one or more source paths (file or directory, relative to repo root).
Read the files before proceeding if not already in context.

**Reference test file (required)**: determines output file naming (e.g. `.tl.spec.ts`),
test-run command, and import style. Ask for one if not provided.

**Optional**: focus areas for this round, known bugs.

---

# Framework Constraints

- Naming and test command come from the reference file — do not guess.
- Angular → **Angular Testing Library**. React → **React Testing Library**.
- HTTP mocks → **MSW**. Non-HTTP boundaries (router / auth / WebSocket) → direct module mocks.
- If both `*.spec.ts` and `*.tl.spec.ts` exist, `*.tl.spec.ts` is the style reference.
  Read `*.spec.ts` only to identify existing coverage — never to infer format or imports.
- Every case belongs to a named **Group / Scenario** — no loose tests.
- Minimal Angular TL skeleton:

```ts
import { it } from "@jest/globals";
import { render, waitFor } from "@testing-library/angular";
import { http, HttpResponse } from "msw";
import { server } from "...../mocks/server";

async function renderComponent() {
   const result = await render(MyComponent, {
      providers: [provideHttpClient(), { provide: FooDep, useValue: { fn: jest.fn() } }],
      schemas: [NO_ERRORS_SCHEMA],
   });
   return result.fixture.componentInstance;
}

describe("Group 1 — someMethod", () => {
   // 🔁 Regression-sensitive: <why>
   it("should ...", async () => {
      server.use(http.post("*/api/em/x", () => HttpResponse.json({ ok: true })));
      const comp = await renderComponent();
      comp.someMethod();
      await waitFor(() => expect(comp.field).toBe(true));
   });
   it.failing("confirmed bug", async () => { /* same pattern */ });
});
```

---

# Stage A — Contract Scan (internal)

All analysis in this stage is internal reasoning — do not output intermediate lists.

**A0 — Scope Pre-check**

**①** If the scope is a service / API client rather than a UI component, apply service-layer
analysis: map each exported function, check singleton delegation, ID persistence
(localStorage read → generate-if-missing → write back), and URL construction. Skip to Stage B.

**②** Search existing tests for `vi.mock` / `jest.mock` stubs of this component. If it only
appears as a mock with no direct test, treat it as zero-coverage and highest priority.

**③ Handler inventory**: list every `handle*` / `on*` callback, WebSocket `subscribe` /
`onmessage` / disconnect handler, and `sessionStorage` / `localStorage` access point.
Every item must map to a scenario in Stage C or be explicitly skipped with a reason.

Tag every identified rule:

| Tag | Meaning |
|-----|---------|
| **[SA]** | What the code actually does |
| **[SB]** | What the UI / props / comments promise users |
| **[SC]** | Platform / ARIA conventions users expect without documentation (keyboard shortcuts, focus management, touch equivalents) |

**[SA] ≠ [SB] = highest-priority bug candidate.**
**[SC] violation = design defect.** Missing [SC] behavior is at minimum Risk 2; if it causes
data loss or silent wrong submission it is Risk 3.

**A1 — UI promises**: `disabled`, `required`, state-dependent text. Can guards be bypassed?

**A1b — Three-state coverage**: For every async load or long-running task:
- **loading** — destructive actions disabled
- **error** — user-visible message; retry / cancel accessible
- **empty / ready** — correct content or empty-state shown

Missing state → Risk 2 minimum. Loading state that permits destructive action → Risk 3.

**A2 — Multiple paths to same goal**: mouse / keyboard / drag — do all paths share the same
validation? Keyboard-only paths (Enter, Escape, arrow keys) frequently bypass mouse-path guards.

**A3 — Reset / clear state**: enumerate all layers — framework state, DOM (`input.value`,
scroll, focus), browser state, parent/global state.

**A4 — Fragile implementation**:
- Stale state after `await`; missing `setState(prev => …)` pattern
- Same field validated in multiple places inconsistently (e.g. trim in one path, not another)
- Boundary inputs: empty string, malformed, multi-dot filenames
- Batch partial failure: partial API success must separate succeeded / failed items in UI state

**A5 — Async ownership**:
- If an async load sets state after selection / props may have changed, require a stale-response
  guard — missing guard is Risk 3.
- For every effect that opens a WebSocket, event-bus subscription, or `setInterval`, require
  four scenarios: open success, data received, error / disconnect, **unmount cleanup**
  (no state update after unmount, no leaked listener). Missing cleanup → Risk 3.

---

# Stage B — Risk Score + Filter (internal)

Score each rule internally and decide — do not output the scored list.

| Level | Meaning |
|-------|---------|
| **3** | Data corruption, wrong submission, state inconsistency, async bug. [SB] unmet → auto-3 |
| **2** | Functional error, clearly wrong UI behavior |
| **1** | UX issue, minor inconsistency |

Risk 3 → all in. Risk 2 → functional-path only. Risk 1 → skip unless tied to current change.
Confirmed bug → `it.fails(...)`; suspected bug → header comment only, no case.

---

# Stage C — Scenario Design (internal)

| Risk | Expansion |
|------|-----------|
| **3** | Happy + Error + Boundary; add Stress if concurrent interaction is possible |
| **2** | Happy + one key Error |
| **1** | One case max, or skip |

Mark regression-sensitive scenarios with 🔁.

---

# Stage D — Test Output

**Case limits:**

| Group risk | Max cases per group |
|------------|---------------------|
| Risk 3 | ≤ 6 |
| Risk 2 | ≤ 4 |
| Risk 1 | ≤ 3 |

**File total cap** = (Risk3 groups × 4) + (Risk2 groups × 3) + (Risk1 groups × 2)

If a group exceeds its cap, delete the lowest-value or most-duplicated cases first.
Confirmed bugs → `it.fails(...)`, do not count toward caps.

---

## D1 — File Header

```ts
/**
 * ComponentName — Testing Library style
 *
 * Risk-first coverage:
 *   Group 1 [Risk 3]  — methodName: one-sentence contract summary
 *   Group 2 [Risk 2]  — methodName: contract summary (it.fails — confirmed bug)
 *
 * Confirmed bugs (it.fails):
 *   Bug A — <name> (Group N): <symptom>.
 *
 * Suspected bugs (header only):
 *   Suspicion A — <name>: <evidence gap>.
 */
```

## D2 — Per-case Comment

```ts
// 🔁 Regression-sensitive: <why this breaks silently during refactoring>
// Risk Point: <optional — only if failure mode is non-obvious>
it("should ...", async () => { ... });
```

## D3 — Multi-contract Assertion

When asserting an error or invalid outcome, also assert the specific flag / element that caused
it and confirm no false-positive sibling is active — "right output, wrong reason" is still a bug.

## D4 — Verify

Run the test command scoped to the new file. Fix any compile or import errors before reporting done.

## D5 — Coverage Pass (when needed)

If the component exceeds **400 lines** or has **polymorphic item dispatch**, and uncovered
branches remain after this pass, continue with `component-path-coverage-generation-prompt.md`.
Pass the file produced in D4 as the `Existing spec files` input so the coverage pass skips
already-covered scenarios.
