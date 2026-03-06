# Script Recognition Regression Test Cases

> **Purpose**: Regression testing for the `script` flag identification in the SubjectAreas module.
> **Coverage**: All 7 prompt-level rules that set `script=true`, their negative/boundary counterparts, the `gui_required` override behavior, and multi-turn conversation scenarios.
> **Final `script` value** is determined by `isScriptModule(gui_required, script)` — `gui_required=true` overrides `script=true` to produce `false`.

**Multi-turn format**: Each turn shows `User` question and `Expected script` for that turn. The "Current Turn" row is the one under test.

---

## Positive Cases — script = true

### TC-P01 — Explicit Script / Code Creation

| Field | Value |
|---|---|
| **CaseID** | TC-P01 |
| **User Question** | How do I write a script to dynamically change the color of chart data points based on their values? |
| **Expected script** | `true` |
| **Design Intent** | The user explicitly uses the word "script" in the context of authoring code. Any query that directly mentions writing, creating, or editing scripts, code, or custom expressions must produce `script=true`, regardless of which component is targeted. |

---

### TC-P02 — Programming Language Reference

| Field | Value |
|---|---|
| **CaseID** | TC-P02 |
| **User Question** | How can I use JavaScript to control the visibility of a Text component based on a RadioButton selection? |
| **Expected script** | `true` |
| **Design Intent** | The query names a specific programming language (JavaScript) in a coding context — the user clearly intends to write code, not use a UI control. Referencing any concrete programming language in a code-authoring context must trigger `script=true`. |

---

### TC-P03 — Complex Logic Control Structure

| Field | Value |
|---|---|
| **CaseID** | TC-P03 |
| **User Question** | How do I write an expression that loops through all table rows and marks each row red when the sales value exceeds 1000? |
| **Expected script** | `true` |
| **Design Intent** | The query requires a loop (iteration over rows), which is a complex logical control structure that cannot be expressed through any UI dialog. Implementing loops or multi-level nested conditionals must trigger `script=true`. |

---

### TC-P04 — Custom Function Definition

| Field | Value |
|---|---|
| **CaseID** | TC-P04 |
| **User Question** | How do I define a custom function that converts a timestamp into a human-readable date string like "Mar 5, 2026" for use in a dashboard expression? |
| **Expected script** | `true` |
| **Design Intent** | The user intends to define a new, named function that does not exist as a built-in feature. Authoring a custom function or algorithm not available in the product out of the box must trigger `script=true`. |

---

### TC-P05 — Admin Console Operation

| Field | Value |
|---|---|
| **CaseID** | TC-P05 |
| **User Question** | How do I use the Admin Console to automate the creation of a new JDBC data source? |
| **Expected script** | `true` |
| **Design Intent** | The user explicitly mentions "Admin Console" in the context of performing an operation. Admin Console tasks are scripted via Groovy DSL; any query that references Admin Console for performing an action must trigger `script=true`. |

---

### TC-P06 — runQuery Usage

| Field | Value |
|---|---|
| **CaseID** | TC-P06 |
| **User Question** | How can I use runQuery to load data from a Data Worksheet and assign the first row's value to a Text component? |
| **Expected script** | `true` |
| **Design Intent** | The query explicitly involves `runQuery`, which is a programmatic API callable only from script (not accessible via UI). Any query that mentions using or manipulating runQuery results must trigger `script=true`. |

---

### TC-P07 — "function" Keyword in Code-Calling Context

| Field | Value |
|---|---|
| **CaseID** | TC-P07 |
| **User Question** | How do I call the createBulletGraph() function to build a bullet chart programmatically? |
| **Expected script** | `true` |
| **Design Intent** | The query uses "function" in the sense of invoking a code function (`createBulletGraph()`). When "function" refers to calling, defining, or operating on a code-level function (not a product feature), it must trigger `script=true`. |

---

## Negative Cases — script = false

### TC-N01 — CALC Formula Function (GUI-Assisted, Not Script)

| Field | Value |
|---|---|
| **CaseID** | TC-N01 |
| **User Question** | How do I use CALC.sumif to calculate total sales where the quantity purchased exceeds 50? |
| **Expected script** | `false` |
| **Design Intent** | CALC functions (e.g., `CALC.sumif`) are entered through the Formula Editor dialog — a GUI-assisted feature that requires no JavaScript authoring. Although they resemble function calls, they are not scripting and must not trigger `script=true`. |

---

### TC-N02 — Pure UI Configuration Operation

| Field | Value |
|---|---|
| **CaseID** | TC-N02 |
| **User Question** | How do I configure a selection list component to filter a table by region using the dashboard designer? |
| **Expected script** | `false` |
| **Design Intent** | The user is navigating product menus and dialogs to set up a component — no code authoring is implied. UI-based configuration operations must produce `script=false` regardless of their complexity. |

---

### TC-N03 — Conceptual / Descriptive Question

| Field | Value |
|---|---|
| **CaseID** | TC-N03 |
| **User Question** | What types of chart elements are available in StyleBI and what are the differences between them? |
| **Expected script** | `false` |
| **Design Intent** | The user is seeking product knowledge — no code, no UI action. Purely conceptual or descriptive questions that do not involve writing expressions, scripts, or performing GUI steps must produce `script=false`. |

---

### TC-N04 — Programming Language Mentioned with Non-Coding Intent (Boundary of TC-P02)

| Field | Value |
|---|---|
| **CaseID** | TC-N04 |
| **User Question** | Is the StyleBI frontend built with JavaScript or TypeScript? |
| **Expected script** | `false` |
| **Design Intent** | A programming language name appears, but the intent is a factual/architectural question — not a request to write code. Merely mentioning a language name without coding intent must not trigger `script=true`. This is the boundary condition for the programming-language rule. |

---

### TC-N05 — "function" Referring to Product Feature, Not Code (Boundary of TC-P07)

| Field | Value |
|---|---|
| **CaseID** | TC-N05 |
| **User Question** | How does the drill-down feature work in a crosstab table? |
| **Expected script** | `false` |
| **Design Intent** | "Feature" (and by extension product capability names) describe UI functionality, not code functions. When "function" or related terms refer to a product feature rather than a callable code function, `script=true` must not be triggered. This is the boundary condition for the function-mention rule. |

---

### TC-N06 — Conditional Logic Achievable via UI (Boundary of TC-P03)

| Field | Value |
|---|---|
| **CaseID** | TC-N06 |
| **User Question** | How do I set a highlight rule in the conditional formatting dialog to color table rows red when the value exceeds 1000? |
| **Expected script** | `false` |
| **Design Intent** | The task involves conditional logic (if value > 1000 → red) but is fully achievable through the built-in conditional formatting UI dialog. The existence of a GUI path for the same logic means it does not qualify as "complex logic requiring script." This is the boundary condition separating UI-supported conditions from script-only loop/nesting logic. |

---

## gui_required Override Case — script = false despite script-triggering content

### TC-G01 — gui_required Overrides script (isScriptModule Logic)

| Field | Value |
|---|---|
| **CaseID** | TC-G01 |
| **User Question** | How do I open the Script tab in the component properties panel and write a JavaScript expression to hide a text label? |
| **Expected script** | `false` |
| **Design Intent** | The query contains two script-triggering signals: naming JavaScript (Rule 2) and mentioning writing an expression (Rule 1). However, it also requires navigating the GUI (opening the Script tab in the properties panel), which sets `gui_required=true`. The `isScriptModule(gui_required=true, script=true)` function must return `false` because `gui_required` takes precedence. Verifies that the code-level override logic is applied correctly after the LLM produces `script=true`. |

---

## Multi-Turn Conversation Cases

### TC-M01 — Confirmation of a Script-Oriented Previous Turn

| Turn | User | Expected script |
|---|---|---|
| Previous | How do I write a script in the onInit handler to load data using runQuery and assign the first record's value to a Text component? | `true` |
| **Current** | Yes, that approach looks right. How do I properly structure the variable assignment? | **`true`** |

**Design Intent**: When the prior turn established a script context (explicit script authoring intent), a brief confirmation or follow-up in the current turn contains no standalone script trigger. The `completeQueryByHistory` prompt must detect `script=true` in history and reconstruct a script-oriented `replaced_query` (e.g., "How do I structure the variable assignment in the onInit script using runQuery results?"). The `querySubjectAreas` prompt then evaluates this rewritten query and must produce `script=true`. Validates that history-driven query completion preserves script orientation.

---

### TC-M02 — Non-Script History, Script Intent Introduced in Current Turn

| Turn | User | Expected script |
|---|---|---|
| Previous | How do I add a filter condition to a table using the filter toolbar? | `false` |
| **Current** | Can I achieve the same filtering logic by writing a JavaScript expression instead? | **`true`** |

**Design Intent**: The previous turn was a non-script UI question. The current turn independently introduces script-triggering content: both a programming language reference (JavaScript) and explicit expression-writing intent. The current query's own signals must dominate. Validates that a single turn can switch `script` from `false` to `true` without being suppressed by non-script history.

---

### TC-M03 — Script History, Unrelated UI Operation in Current Turn

| Turn | User | Expected script |
|---|---|---|
| Previous | How do I write a script to dynamically set the foreground color of a Text component? | `true` |
| **Current** | How do I change the font size for the same component using the Format panel? | **`false`** |

**Design Intent**: The previous turn was script-oriented, but the current turn is a standalone UI configuration question (Format panel) with no coding intent. The current query must be evaluated independently and produce `script=false`. Validates that prior script context does not "bleed" into the current turn when the current query is clearly non-script.

---

## Summary Table

| CaseID | Category | Expected script | Rule Verified |
|---|---|---|---|
| TC-P01 | Positive | `true` | Explicit mention of writing/creating/editing script or code |
| TC-P02 | Positive | `true` | Specific programming language referenced in coding context |
| TC-P03 | Positive | `true` | Loop or multi-level nested conditional logic |
| TC-P04 | Positive | `true` | Custom function/algorithm definition (non-built-in) |
| TC-P05 | Positive | `true` | Admin Console operation mentioned |
| TC-P06 | Positive | `true` | runQuery used or manipulated |
| TC-P07 | Positive | `true` | "function" used in code-calling/invocation context |
| TC-N01 | Negative | `false` | CALC formula function is GUI-assisted, not script |
| TC-N02 | Negative | `false` | Pure UI configuration operation |
| TC-N03 | Negative | `false` | Conceptual / descriptive product question |
| TC-N04 | Negative | `false` | Language name in non-coding intent (boundary of TC-P02) |
| TC-N05 | Negative | `false` | "function/feature" refers to product capability (boundary of TC-P07) |
| TC-N06 | Negative | `false` | Conditional logic achievable through UI (boundary of TC-P03) |
| TC-G01 | Override | `false` | gui_required=true overrides script=true in isScriptModule() |
| TC-M01 | Multi-turn | `true` | Script history + confirmation → query completion preserves script=true |
| TC-M02 | Multi-turn | `true` | Non-script history + script intent in current turn → script=true |
| TC-M03 | Multi-turn | `false` | Script history + non-script current turn → script=false |