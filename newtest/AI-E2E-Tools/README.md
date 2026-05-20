# E2E DOM Locator Debugging Guide

## Overview

This toolkit maps Angular routes to their HTML templates, so when an E2E test has a wrong DOM locator you can fix it quickly without searching the codebase manually.

## Files

| File | Description |
|------|-------------|
| `route_scanner.py` | Scans the StyleBI project and generates `dom-routes.json`. Can be placed anywhere. |
| `e2e/dom-routes.json` | Route → component → HTML template mapping. **Already up to date — use directly.** |

## Workflow

### Step 1 — Update dom-routes.json (only when new web features are added)

`route_scanner.py` can be placed in any directory. Pass the StyleBI project root as the argument — output is automatically written to `<project>/e2e/dom-routes.json`:

```bash
python /any/path/to/route_scanner.py E:/inetsoft/stylebi1/e2e
```

> Only re-run when the product adds new Angular routes or components. The current `e2e/dom-routes.json` is up to date and ready to use.

---

### Step 2 — Fix a wrong locator

When an E2E test fails because a DOM locator is wrong, tell Claude:

> "在 `e2e/dom-routes.json` 里找 `/em/settings/content/repository` 这个路由的 `html_template`，读后修正 Delete 按钮的 locator"

Claude will:
1. Look up the route in `e2e/dom-routes.json` to find the `html_template` path
2. Read that one HTML file
3. Return the correct locator

This costs **2 file reads** and requires no manual file searching.

---

## Three Debugging Methods (choose by what you know)

| Method | What you provide | Token cost | When to use |
|--------|-----------------|------------|-------------|
| **1** | Exact file path | Lowest (1 read) | You already know the component file |
| **2** | URL segment or module name | Low (2 reads) | You know the page/feature area — **recommended** |
| **3** | Spec file + line number only | High (3+ reads) | Avoid — requires reverse-lookup |

**Method 2 is the recommended default.** Just describe the page:

- `"EM → Settings → Content Repository 的 Delete 按钮 locator 不对"`
- `"/em/settings/content/repository page, Delete button"`

Claude resolves the rest via `e2e/dom-routes.json`.

---

## Locator Priority

Always use locators in this order (highest priority first):

| Priority | Locator | Example |
|----------|---------|---------|
| 1 | `getByRole` | `page.getByRole('button', { name: 'Delete' })` |
| 2 | `getByLabel` | `page.getByLabel('Username')` |
| 3 | `getByTestId` | `page.getByTestId('delete-btn')` |
| 4 | CSS selector | `page.locator('.delete-button')` |

Use a lower-priority locator only when a higher one is not available in the HTML.

When asking Claude to fix a locator, include this rule:

> "按照 README 的 locator 优先级，在 `e2e/dom-routes.json` 里找 `/em/settings/content/repository` 的 `html_template`，修正 Delete 按钮的 locator"

---

## dom-routes.json Format

```json
{
  "angular_routes": [
    {
      "path": "settings/content/repository",
      "full_url": "/em/settings/content/repository",
      "app": "em",
      "component": "ContentRepositoryPageComponent",
      "html_template": "projects/em/src/app/settings/content/repository/content-repository-page/content-repository-page.component.html",
      "test_utils": null
    }
  ]
}
```

The `html_template` path is relative to `community/web/`.
