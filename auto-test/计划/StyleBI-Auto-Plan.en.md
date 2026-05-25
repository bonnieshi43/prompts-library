# StyleBI Frontend Test Rollout Plan

> **Report date:** May 2026 ｜ **Owner:** QA Team — Bonnie  
> **Context:** Based on the Epic-70095 test migration audit; defines short-term (2 weeks) and mid-term (1 month) execution plans.

### Scope of This Plan (Read First)

Product has designed a three-layer test architecture (Unit / Playwright E2E / Stagehand AI smoke). **This plan covers only the first two layers:**

| In scope | Out of scope |
|----------|----------------|
| **Unit cases (main line)** — Vitest migration; Portal/Composer unit test supplementation and quality improvement | **Stagehand AI smoke** — Not scheduled or accepted in this plan |
| **E2E (parallel track)** — Portal viewer golden paths, etc., local Playwright | Deferred to **next phase** or **external support** (no internal owner yet) |

> **In one sentence:** This plan advances primarily via Unit cases + E2E; Stagehand is evaluated separately and starts only with external help or a later Sprint.

---

## 📊 Current Test Status

**1,292 testable units across the product; current coverage is only 26% (338), framework upgrade pending, CI not integrated — a high-risk area for quality.**

| Area | Total | Covered | Coverage | Risk |
|------|-------|---------|----------|------|
| Portal shared components (core reuse layer) | 575 | 165 | 29% | ⚠️ Medium |
| Portal user-facing components | 171 | 9 | **5%** | 🔴 High |
| Composer components | 217 | 52 | 24% | 🔴 High (under redesign) |
| EM admin module | 309 | 111 | 36% | 🟡 Low (outside redesign scope) |
| Shared libraries | 20 | 1 | **5%** | 🔴 High |

> In the full three-layer architecture, **Layer 3 (Stagehand) is currently zero** and **not in this plan’s delivery scope** (see “Scope of This Plan” above). This 1-month effort focuses on measurable Unit + E2E outcomes.

---

## ⚠️ Other Factors During Execution

The following will likely diverge from expectations later:

**1. Existing tests are low quality — count alone is misleading**  
Many of the 338 existing specs rely heavily on CSS selectors and snapshot tests, covering mostly the simplest service paths. **Component template behavior and user interaction are barely covered.** “Migration + quality uplift” is more work than simply adding new specs.

**2. Framework must be upgraded before expansion**  
Running current framework (Jest) alongside target framework (Vitest) doubles maintenance cost. **Framework migration is a prerequisite**; writing many new tests before migration creates technical debt. Week 1 must complete migration so later efficiency can be realized.

**3. Adding unit cases will surface many legacy bugs**  
This is an expected byproduct of raising coverage and a core value of this effort. 74% of code has never been systematically tested, so latent issues were never validated by automation. While batch-adding cases, expect ongoing discovery of:

- **Logic boundary bugs:** abnormal behavior under specific input/state combinations, hard to hit in manual testing
- **Service call issues:** HTTP error handling, null propagation, unsubscribed observables, etc.
- **UI interaction defects:** conditional rendering errors, missing form validation, events not propagated correctly

**Convention after finding bugs:** mark with **`it.failing`** so the full spec suite stays green; **file requests in the ticket system**; **start fixes in parallel with writing cases** — workloads intertwine. Unit case owners must coordinate AI-assisted fixes and avoid dropping items.

This is the main reason to reserve buffer in the schedule. If bug density exceeds expectations, sync early and adjust the timeline.

**4. E2E requires deep human involvement — slower than expected**  
E2E is not “just coding”: case design, Docker setup, real-instance integration, frontend debug. **Per-case debug cost is much higher than Unit tests.** Requires AI + QA collaboration; progress follows module priority (from colleagues or experience), not parallel blast across all modules.

**5. E2E Jenkins CI deferred**  
Browser E2E today is only ~9 cases (mostly EM), too small for meaningful CI gates or trend analysis. **`Jenkinsfile` E2E stage** waits until case volume is sufficient.

**6. Composer redesign risk — wasted effort**  
Composer shell containers (layout/toolbar) will be replaced wholesale; tests written there now will be discarded. We explicitly split **“write now”** (internal logic components) vs **“write after stabilization”** (shell containers). **This is deliberate waste avoidance, not delay.**

**7. Stagehand not in this plan (see “Scope of This Plan”)**  
Composer semantic smoke (Stagehand) **has no dedicated full-time owner this phase**. Still conceptual — exploring AI-driven semantic smoke; feasibility TBD. Willam and others will research and validate; **formal scheduling is next phase**. Composer Stage 2 risks tracked separately; **do not measure this Sprint by Stagehand progress.**

---

## 🧭 Overall Strategy

**Within this plan**, two work types advance differently — clear ownership, not mixed scheduling (Stagehand per scope above):

| Type | Approach | Rationale |
|------|----------|-----------|
| **Component Unit Case (main line)** | Test engineers with unit-case experience drive at full speed | AI automation ~80–95%, no environment dependency, highest efficiency — core lever for coverage in the short term |
| **E2E (parallel track)** | QA advances independently, does not block main line; **can start Week 1** | Dashboard pipeline proven; Portal viewer golden paths first by priority; each case slow but can start early |
| **Stagehand AI smoke** | ⏸ **Pending** | No internal owner; needs external setup. Original goal: safety net before composer2026 Stage 2 — **not in this plan** |

> **Principle: Unit cases are the main line — highest efficiency, fastest payoff; E2E runs in parallel without crowding the main line; Stagehand is Pending — do not judge overall test progress by Stagehand.**

---

## 🗓 Short-Term Plan (Weeks 1–2)

> **Goals: Week 1 — Vitest migration + Portal unit test pilot + Playwright MCP workflow validation (prerequisite); Week 2 — main line Portal unit batch only (source reading, no UI); E2E parallel track non-blocking (Stagehand Pending)**

### Week 1｜Framework Migration + Portal Unit Pilot + Parallel Track Start

**Main line: FE engineers**

| Task | Details |
|------|---------|
| **Vitest framework migration** | Mechanical migration of 338 Jest specs to Vitest (`jest.fn` → `vi.fn`), regenerate 28 snapshot files in one pass, full green run |
| **Portal shared Tier 1 pilot (10)** | Start immediately after migration; supplement/write Vitest unit tests mainly via **source reading**; solidify prompts and review standards; **no Playwright MCP dependency** |
| **Composer Playwright workflow validation** | Complete at pilot tail or in parallel; pick Composer Wiz modules and prove the path; **prerequisite for Week 2 batch — batch phase does not use UI again** |
| **Legacy bug quick fixes** | Fix component bugs behind failing specs found in pilot (buffer reserved) |

**Parallel track: QA engineers**

| Task | Details |
|------|---------|
| **E2E high-priority start** | Reuse proven Testcontainers + Playwright pipeline; write Composer viewer golden paths per audit priority; each case includes env integration and locator debug — slow but starts Week 1 (may spill to Week 2) |

**Week 1 acceptance:**
- ✅ All 338 specs pass under Vitest
- ✅ Pilot 10 Tier 1 component specs pass review (source-reading workflow and quality bar ready)
- ✅ “Source reading + Composer Playwright MCP” combined workflow validated (Week 2 batch prerequisite)

---

### Week 2｜Portal Unit Batch (Main Line) + Parallel Track Wrap-Up

**Main line: FE engineers** (Portal Vitest unit tests only, **source reading**, no Playwright MCP / real UI)

| Task | Details |
|------|---------|
| **Portal shared Tier 1 batch (~130)** | Full-speed generation with Week 1 **source-reading** workflow; all simple components (≤5 injected services, no canvas); ~95% AI automation; **no browser, no Playwright MCP** |
| **Legacy bug quick fixes** | Fixes from spec failures during batch generation (within buffer) |

**Parallel track: QA engineers**

| Task | Details |
|------|---------|
| **E2E golden path Composer continuation** | Continue Week 1; go deeper on modules such as interaction Action, drill, worksheet, and other core areas |

**Week 2 acceptance:**
- ✅ Portal shared Tier 1 complete (pure source-reading unit tests); coverage **29% → ~50%**
- ✅ E2E: Composer new core modules handled

---

### Short-Term Summary (End of 2 Weeks)

| Metric | Start | After 2 weeks |
|--------|-------|---------------|
| Test framework | Jest (suboptimal) | ✅ Vitest (unified) |
| Portal shared unit coverage | 29% | **~50%** (main line) |
| Composer safety net (Stagehand) | None | ⏸ **Pending** (external help; not delivered this phase) |
| E2E (browser) | ~9 cases, local only | **~30–50 cases** (+2–3 Portal core paths, 1–2 Composer core paths, 1–2 EM core paths) |

---

## 🗓 Mid-Term Plan (Weeks 3–4, 1 Month Total)

> **Goals: Unit cases deepen into medium-complexity modules; E2E completes Portal user golden paths**

### Weeks 3–4｜Tier 2 Depth + Composer Services + E2E Golden Paths

**Main line: FE × 2 + QA**

| Task | Details |
|------|---------|
| **Portal shared Tier 2 (~210)** | Medium-complex components (6–12 injected services, @ViewChild/forms/async); ~80% AI automation, ~20% manual supplement and review |
| **Composer Category 1 components + all services (16)** | AssetTree, ToolboxPane, ComponentsPane, VSBindingPane internals, etc. — components retained after refactor; only 1 of 16 Composer services has a spec today |
| **Shared library services (15)** | Shared by Portal and EM; 0% coverage today, large blast radius, efficient pure-service tests |
| **Legacy bug quick fixes** | Tier 2 bug density higher than Tier 1 (within buffer) |

**Parallel track: QA + FE (debug support)**

| Task | Details |
|------|---------|
| **Portal / Composer E2E** | P0–P2 started Weeks 1–2; this phase fills remaining modules by priority |

**Mid-term challenges:**
- Tier 2 review cost clearly above Tier 1; AI quality ~80%, **remaining 20% needs individual human review** — slower than Week 2 batch
- E2E golden-path workflow is clear, but each case needs env integration + frontend debug — **not linear by case count**; QA independent to reduce FE main-line interruption

**Weeks 3–4 acceptance:**
- ✅ Portal shared unit coverage ~**70%**
- ✅ All 16 Composer services have specs; coverage **6% → ~80%**
- ✅ Shared library service coverage **0% → 60%+**
- ✅ All Portal/Composer paths green; core module cases added (e.g. schedule, wiz, etc.)

---

### Mid-Term Summary (End of 1 Month)

| Metric | Start | After 1 month | Primary source |
|--------|-------|---------------|----------------|
| Overall unit coverage | 26% | **~50%** | Unit main line |
| Portal shared coverage | 29% | **~70%** | Unit main line |
| Composer service coverage | 6% | **~80%** | Unit main line |
| Shared library service coverage | 0% | **~60%** | Unit main line |
| Portal user-facing coverage | 5% | **~15%** (services first) | Unit main line |
| E2E Portal browser specs (new) | 0 | **5** (viewer golden paths) | E2E parallel |
| Total E2E spec count | 22 (all EM, incl. Dashboard) | **27** (+5 golden paths) | E2E parallel |
| Composer safety net (Stagehand) | None | ⏸ **Pending** | External help; not in this plan |
| E2E Jenkins CI | Not integrated | **Still not integrated** (later) | — |

---

## 📋 Out of Scope for This Phase (Later Planning)

Items below are excluded from this 1-month plan due to complexity or dependencies; schedule separately:

| Item | Reason | Expected timing |
|------|--------|-----------------|
| Portal shared Tier 3 (~64 complex components) | VSChart/VSTable etc. need slice decomposition; heavy manual work | Weeks 7–9 |
| Full Portal user-facing component coverage (143) | Large volume; component layer after services | Weeks 7–10 |
| Composer Category 3 new component tests | Depends on composer2026 Stage 2 build progress | Aligned with Stage 2 |
| composer2026 E2E golden paths | Depends on shell structure stability | After Stage 2 complete |
| EM module coverage uplift | Outside redesign; fill zero-coverage subtrees as capacity allows | Flexible |
| **E2E Jenkins CI integration** | Few E2E cases today — limited CI value; Docker + license, high maintenance | After E2E scale is ready |
| **Stagehand Composer smoke (15–20 cases)** | No internal owner; env + semantic workflow need external help | Separate schedule when help available; ideally before composer2026 Stage 2 |
| Unit test Jenkins report archival | After Vitest migration, `junit.xml` in Jenkins (separate from E2E) | Evaluate post-migration |

---

*Document version: 1.0 ｜ Next update: after 2 weeks (sync progress at Sprint review)*
