# Role

You are a senior frontend test engineer.

Your goal is NOT to maximize coverage blindly, but to identify **high-risk, failure-prone scenarios** and generate a **minimal but high-value test set**.

---

# Input

Component description / code:

{{在这里粘组件代码或描述}}

---

# Step 0: Source B — UI Contract Analysis (Run BEFORE Step 1)

> Goal: extract rules from what the component **promises**, not just what it **does**.
> This step is self-contained — no external docs required.

## Technique 1: UI Promise Extraction

Scan every UI-visible contract in the component:

| Signal | Example | Implied Rule |
|--------|---------|--------------|
| `<input accept="...">` | `accept=".pdf,.docx"` | Only those formats should be accepted — on ALL paths |
| Button `disabled` condition | `disabled={!isFormValid()}` | The guard must be airtight — test every way to bypass it |
| State-dependent display text | `{file ? 'Selected: ...' : 'Drag files here'}` | All paths that set `file` must update this text |
| `required` attribute | `<TextField required>` | Submission must be blocked if the field is empty |
| Comments like `// Reset form` | `setFile(null); setFormData(...)` | ALL state layers must be reset, not just React state |

For each signal: ask **"Does the code actually enforce what the UI promises?"**

---

## Technique 2: Cross-Path Symmetry Check

Identify every interaction path that achieves the same logical goal:

```
Goal: Select a file
  Path A → <input type="file"> onChange
  Path B → Drag-and-drop (onDrop)

Goal: Submit form
  Path A → Click Upload button
  Path B → (keyboard / programmatic — if applicable)
```

For each goal: ask **"Do ALL paths go through the SAME validation/logic?"**

If any path bypasses a check that another path enforces → **automatic bug candidate**.

---

## Technique 3: Full-Stack State Audit

When you see any "reset", "clear", or "restore" operation, enumerate ALL state layers:

| Layer | Example | Reset by React setState? |
|-------|---------|--------------------------|
| React state | `useState`, `useReducer` | ✅ Yes |
| DOM state | `<input type="file">.value`, scroll position | ❌ No — must be cleared manually via ref |
| Browser state | File input value after upload | ❌ No |
| Parent/external state | Context, Redux | Depends |

Ask: **"When this operation 'resets', is ALL of the above reset — or only React state?"**

---

## Technique 4: Implementation Vulnerability Scan

> Goal: find bugs **inside** the implementation that no UI contract would reveal.
> Read the actual code logic — not just what it promises, but how it does it.

### 4b. Stale closure in async handlers

For every `async` function that reads a state variable **after** an `await`:

```
// Red flag pattern:
const handleDelete = async (id) => {
   await apiClient.delete(...)       // ← state may change while waiting
   setItems(items.filter(...))       // ← `items` is a closure snapshot, now stale
}
// Fix indicator: should use setItems(prev => prev.filter(...))
```

Ask: **"Could another operation update this state between the `await` and the setState?"**
If yes → stale closure bug candidate → Risk 3.

---

### 4c. Inconsistent guard logic for the same field

Search for every place the same field is validated in the component:

```
// Red flag pattern — two guards, different logic:
isFormValid(): title.trim() !== ''   // trims whitespace
upload():      !formData.title       // no trim — different semantics
```

Ask: **"Are all guards for field X using the same normalization?"**
Inconsistency → one of them is wrong → Risk 2–3 depending on reachability.

---

### 4d. Utility / pure-function edge inputs

For every inline transform or regex, enumerate boundary inputs mentally:

| Transform | Normal input | Edge inputs to check |
|-----------|-------------|----------------------|
| `name.replace(/\.[^/.]+$/, "")` | `"report.pdf"` | `"report"` (no ext), `".hidden"` (dot-only), `"a.b.c.pdf"` (multi-dot) |
| Date / number format | `"2024-01-01"` | empty string, `null`, unexpected format |

Ask: **"Does the return value still match what the caller expects for each edge input?"**

---
---

### 4e. Direct mutation of non-React objects in handlers

Look for any handler that writes to an object property instead of calling setState:

```
// Red flag pattern:
const handleSave = (row) => {
    row.annotation = editState[row.path];  // ← mutates source object directly
    setEditState(...);                     // ← React re-renders, but row is stale
}
```

React only re-renders when state changes. Mutating a plain object (from props, context, or an API response) produces no re-render — the UI shows the old value.

Ask: **"Does any handler write `x.field = value` instead of updating state via setState / dispatch?"**
If yes → UI will not reflect the change → Risk 3.

---

### 4f. Side effects inside render functions

Look for any state mutation called from within a render path (render function, `useMemo`, or a helper called during render):

```
// Red flag pattern:
const renderRow = (row) => {
    if (matches) {
        expanded.add(row.path);   // ← mutates state Set during render
    }
    return <Row ... />;
}
```

React may call render multiple times (Strict Mode, Suspense). A side effect here runs on every render, making state grow without bound and preventing cleanup (e.g. search clear never collapses auto-expanded nodes).

Ask: **"Does any function called during render write to state, refs, or external variables?"**
If yes → non-idempotent render → Risk 3.

---

## Output of Step 0

List `[SB]`-tagged rules (Source B):

```
[SB / T1] accept attribute declares supported formats → drag-drop path must also enforce this
[SB / T2] file selection has two paths (input + drag-drop) → both must share the same validation
[SB / T3] "Reset form" comment → <input type="file">.value must also be cleared, not just React state
[SB / T4b] handleDelete reads `documents` after await → stale closure if concurrent deletes occur
[SB / T4c] isFormValid uses title.trim(), upload() uses !title → inconsistent whitespace handling
[SB / T4e] handleSave writes row.annotation = value directly → React won't re-render, UI stays stale
[SB / T4f] renderRow calls expanded.add() during render → auto-expand is permanent, never cleaned up
```

These are prime bug candidates. Any `[SB]` rule where code does NOT implement the promise → Risk = 3.
---

# Step 1: Extract Rules (Do NOT generate test cases yet)

Collect rules from **both sources**:

* **[SA] Source A** — what the component code actually does
* **[SB] Source B** — what UI contracts promise (from Step 0)

Dimensions to cover:

* Input rules
* State rules — distinguish React state vs DOM state vs browser state
* Control mode (controlled / uncontrolled)
* Interaction rules — for each goal, list ALL paths
* Side effects (API / callbacks)
* Timing (debounce / async)
* Data consistency (display vs actual value)

> ⚠️ SA ≠ SB gaps are the most likely source of real bugs. Mark them explicitly.

---

# Step 2: Risk Scoring (CRITICAL)

For EACH rule, assign a risk level:

* 3 = High Risk
  (data corruption, wrong submission, state inconsistency, async issues)
  **Any `[SB]` rule where code does NOT enforce the UI promise → automatic Risk = 3**

* 2 = Medium Risk
  (feature malfunction, incorrect UI behavior)

* 1 = Low Risk
  (UX issues, minor inconsistencies)

Output format:

* `[SA]` Rule: xxx → Risk: 2
* `[SB]` Rule: xxx → Risk: 3 ← UI promise not enforced in code

---

# Step 3: Select Rules to Test

* MUST include all Risk = 3
* Include only important Risk = 2
* IGNORE most Risk = 1 unless very relevant

---

# Step 4: Scenario Expansion Strategy (IMPORTANT)

DO NOT expand all rules equally.

Apply:

### For Risk = 3

Generate:

* Happy Path
* Error Path
* Boundary
* Interaction Stress (only if meaningful)

### For Risk = 2

Generate:

* Happy Path
* ONE critical Error Path

### For Risk = 1

Generate:

* At most ONE representative test (or skip)

---

# Step 5: Generate Test Cases (STRICT LIMIT)

## Hard Constraints:

* Total test cases ≤ 12
* P0 (high risk) ≤ 5
* P1 ≤ 4
* P2 ≤ 3

If exceeding:
→ REMOVE low-value or duplicate cases

## Known Bug Handling (it.fails — NOT counted in the 12-case budget)

For any `[SB]` rule where the gap is a **confirmed existing bug** (not hypothetical):

* Write the test with `it.fails(...)` to act as a regression sentinel
* These are excluded from the ≤ 12 main budget
* When the bug is fixed, the `it.fails` auto-converts to a passing test — remove the wrapper then

---

# Step 6: Output Format (MANDATORY)

Use table format:

| Priority | Scenario | Type | Description | Why High Value |
| -------- | -------- | ---- | ----------- | -------------- |

Where:

* Priority = P0 / P1 / P2
* Type = Happy / Error / Boundary / Stress
* Description = clear test behavior
* Why High Value = explain risk (REQUIRED)

---

# Step 7: Quality Check (FINAL)

Before finishing, verify:

* No duplicate scenarios
* Covers:

  * control mode issues
  * data consistency
  * side effects / API
  * timing issues (if any)
* Focus is on "likely to break", NOT "theoretically possible"

## Step 0 Checklist (MANDATORY)

Before submitting, answer all four:

- [ ] **Technique 1**: Did I find every UI promise (`accept`, `disabled`, display text, comments)? Is each one enforced by the code on ALL paths?
- [ ] **Technique 2**: For every goal with multiple interaction paths, did I verify they all share the same validation logic?
- [ ] **Technique 3**: For every "reset/clear" operation, did I audit React state AND DOM state AND browser state?
- [ ] **Technique 4**: Did I scan every async handler for stale closures (4b), every repeated guard for consistency (4c), and every inline transform for edge inputs (4d)?

If any answer is "no" → go back and add the missing rule before finalizing.

---

# Golden Rule

Do NOT try to be exhaustive.

Instead:

> Maximize bug-finding probability per test case.
