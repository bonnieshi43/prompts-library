# Role

Supplement to `component-risk-driven-generation-prompt.md`. Use **after** the risk-driven pass
when branch coverage is still insufficient.

Input format, framework constraints, skeleton code, and `*.tl.spec.ts` style reference rules
are identical to the risk-driven prompt — do not repeat them here.

---

# When to Introduce

Trigger this prompt when any of the following applies after a risk-driven pass:

- Component > 400 lines or > 12 public methods and coverage is visibly incomplete
- Component dispatches on a polymorphic item type (one field drives 3+ distinct UX paths)
- Risk-driven tests exist but large clusters of branches remain uncovered

---

# Analysis (internal — no intermediate output)

Do all of the following silently. Read the existing risk-driven spec file first to avoid
duplicating already-covered scenarios.

**1. Capability map** — list every distinct thing a user can intentionally accomplish.
Use verb phrases, not method names. Aim for 6–12.

**2. Context variant matrix** — for each capability, enumerate contexts that produce a
meaningfully different user experience:
- Item type (when one field drives different UX paths, each type is its own variant)
- Permission / role (editable, deletable, read-only, feature-flag-gated)
- Component mode (search vs browse, root vs nested, selected vs not)
- Item state (base vs extended/derived, loading vs ready, empty vs populated)

A variant is worth defining only when it produces a **visible difference**:
different navigation target, different label, different action visibility, different message,
or different state change.

**3. Branch coverage audit** — map variants to code branches.
For each uncovered branch: ask *"what user context causes this path?"*
→ If answerable: add a variant and cover it.
→ If no user action reaches it: mark as dead code and skip — write no test.

**4. Gap filter** — remove any variant already covered by the existing risk-driven spec.
Only the remaining gaps proceed to output.

---

# Test Design Rules

**Naming** — describe what the user does and observes, never internal method names:
```
✅  "edit: extended item → navigates with parent param"
❌  "editModel: isPhysicalView=true, parent != null"
```

**One variant = one `it()` minimum.** Never collapse two context variants into one test.

**Polymorphic types → mandatory `describe` separation.** Never use `it.each` to collapse
type variants — a single failure message does not identify which type broke.

```ts
describe("label — Type A", () => {
   it("base → label-X", ...);
   it("extended → label-Y", ...);
});
describe("label — Type B", () => {
   it("base → label-Z", ...);
});
```

**Expand cases by variant type:**

| Variant type | Required cases |
|---|---|
| Display / label | Happy only — assert **exact** text value |
| Navigation / routing | Happy only — assert full route array **and** query / matrix params |
| Permission guard | Happy only — assert absent action **and** a permitted sibling is present |
| Async (HTTP) | Success + error response; use `waitFor` |
| Destructive action (delete, move, overwrite) | Happy + cancel/reject + error response |

---

# Output

**Default: one additional file** — all gap variants go into a single
`ComponentName.coverage.tl.spec.ts`. Clusters become `describe` blocks within that file,
not separate files.

**Split into a second file only when** two groups of variants require technically incompatible
`renderComponent()` setups that cannot coexist in one helper
(e.g. one group requires `enterprise=true`, another requires `enterprise=false`).

**Hard limit: two files maximum** from a single path-coverage pass.
If more than two incompatible setups exist, the component needs refactoring — do not add more files.

Each file has its own `renderComponent()` helper and is runnable in isolation.
Typed item stubs are defined as `const` at file top, outside `describe`.

**File header:**
```ts
/**
 * ComponentName — coverage pass
 *
 * Fills gaps left by ComponentName.tl.spec.ts (risk-driven pass).
 * Capabilities: C3 (variants V2, V4), C9 (variants V1–V6)
 *
 * Skipped: [variant/branch — dead code | e2e territory | covered in ComponentName.tl.spec.ts]
 */
```

**Per-case comment (3 lines, mandatory):**
```ts
// Variant: C3-V2 — [type / state summary]
// Setup: [what mock or state must be established]
// Observable: [what specifically changes]
it("edit: extended item → navigates with parent param", async () => { ... });
```

Every skipped branch must appear in the `Skipped:` line with an explicit reason:
`dead code`, `e2e territory`, `covered in <file>`, or `deferred — <reason>`.
Omitting a branch silently is not allowed.

After all files are written, run the test command scoped to the new files and fix any
compile or runtime errors before reporting done.
