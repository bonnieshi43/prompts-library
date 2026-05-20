#!/usr/bin/env python3
"""
route_scanner.py - Scans StyleBI routes and resolves Angular components to HTML templates.

Follows loadChildren lazy-load chains recursively to produce fully-qualified URLs, e.g.
  /em/settings/content/repository  (not just /em/repository)

Outputs two files:
  discovered_routes.json        - legacy format (angular_routes as strings, spring_routes)
  <project>/e2e/dom-routes.json - enhanced format: route -> component -> HTML template path
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Set
from datetime import date


# ── Excluded directories ──────────────────────────────────────────────────────
EXCLUDE_DIRS = {
    "target", "build", "dist", "node_modules", ".git",
    "__pycache__", ".angular", ".idea", ".vscode",
}

# Angular project name -> base URL prefix
APP_PREFIXES: Dict[str, str] = {
    "em":     "/em",
    "portal": "/app/portal",
}


def is_excluded(path: Path) -> bool:
    return any(part in EXCLUDE_DIRS for part in path.parts)


def to_fwd(p) -> str:
    return str(p).replace("\\", "/")


def rel(path: Path, base: Path) -> str:
    try:
        return to_fwd(path.relative_to(base))
    except ValueError:
        return to_fwd(path)


# ══════════════════════════════════════════════════════════════════════════════
# Component -> HTML resolver
# ══════════════════════════════════════════════════════════════════════════════

class ComponentResolver:
    """
    Maps Angular component class names to their .component.html file paths
    (relative to community/web/).

    Strategy 1: parse import statements in the calling routing file.
    Strategy 2: full index scan of all *.component.ts files.
    """

    def __init__(self, web_dir: Path):
        self._web_dir = web_dir
        self._index: Dict[str, str] = {}
        self._indexed = False

    def _build_index(self):
        print("   [scan] building component HTML index...")
        n = 0
        for ts in self._web_dir.rglob("*.component.ts"):
            if is_excluded(ts):
                continue
            html = ts.with_suffix(".html")
            if not html.exists():
                continue
            try:
                src = ts.read_text(encoding="utf-8", errors="ignore")
                m = re.search(r"export\s+class\s+(\w+)", src)
                if m:
                    self._index[m.group(1)] = rel(html, self._web_dir)
                    n += 1
            except Exception:
                pass
        self._indexed = True
        print(f"   [done] component index: {n} components")

    def _via_import(self, cls: str, routing_file: Path, content: str) -> Optional[str]:
        """
        Locate:  import { FooComponent } from './foo/foo.component';
        HTML at: ./foo/foo.component.html
        """
        pat = (
            rf"import\s*\{{[^}}]*\b{re.escape(cls)}\b[^}}]*\}}"
            rf"\s*from\s*['\"]([^'\"]+)['\"]"
        )
        m = re.search(pat, content)
        if not m:
            return None
        imp = m.group(1)
        base = (routing_file.parent / imp).resolve()
        for candidate in [Path(str(base) + ".html"), base.with_suffix(".html")]:
            if candidate.exists():
                return rel(candidate, self._web_dir)
        return None

    def resolve(self, cls: str, routing_file: Path, content: str) -> Optional[str]:
        r = self._via_import(cls, routing_file, content)
        if r:
            return r
        if not self._indexed:
            self._build_index()
        return self._index.get(cls)


# ══════════════════════════════════════════════════════════════════════════════
# Routing file parser helpers
# ══════════════════════════════════════════════════════════════════════════════

# Matches:  { path: 'foo', component: FooComponent }
# or multi-line variants within a ~10-line window
_PATH_RE   = re.compile(r"path\s*:\s*['\"]([^'\"]*)['\"]")
_COMP_RE   = re.compile(r"component\s*:\s*(\w+)")
_LAZY_RE   = re.compile(
    r"loadChildren\s*:\s*\(\s*\)\s*=>\s*import\s*\(\s*['\"]([^'\"]+)['\"]"
)
_REDIR_RE  = re.compile(r"redirectTo\s*:")


def extract_route_entries(content: str) -> List[Tuple[str, Optional[str], Optional[str]]]:
    """
    Return list of (path_value, component_class | None, lazy_import | None).
    Uses a forward-only line-window: for each `path:` line, scan the next 10 lines.
    No lookback — Angular routing always defines path before component/loadChildren,
    and lookback causes parent component to bleed into nested child routes.
    Skips pure redirect entries.
    """
    # Strip single-line comments so commented-out routes are not picked up
    content = re.sub(r'//[^\n]*', '', content)
    lines = content.splitlines()
    seen: Set[str] = set()
    results = []

    for i, line in enumerate(lines):
        pm = _PATH_RE.search(line)
        if not pm:
            continue
        pv = pm.group(1)
        if pv == "**" or pv in seen:
            continue
        seen.add(pv)

        window = "\n".join(lines[i: min(len(lines), i + 10)])

        if _REDIR_RE.search(window):
            continue

        cm = _COMP_RE.search(window)
        lm = _LAZY_RE.search(window)
        results.append((pv, cm.group(1) if cm else None, lm.group(1) if lm else None))

    return results


# ══════════════════════════════════════════════════════════════════════════════
# Angular route scanner — tree-traversal version
# ══════════════════════════════════════════════════════════════════════════════

class AngularRouteScanner:
    """
    Starts from each app-routing.module.ts, follows loadChildren chains
    recursively, and builds fully-qualified URLs:
      /em/settings/content/repository  (3 levels of lazy loading)
    """

    def __init__(self, project_root: Path):
        self._root     = project_root
        self._web_dir  = self._find_web_dir()
        self._resolver = ComponentResolver(self._web_dir)
        self._e2e_dir  = project_root / "e2e" / "tests" / "browser"
        self._visited: Set[str] = set()   # prevent infinite recursion

    def _find_web_dir(self) -> Path:
        for c in [self._root / "community" / "web", self._root / "web"]:
            if c.exists():
                return c
        return self._root

    # ── App prefix from path ──────────────────────────────────────────────────

    def _app_prefix(self, routing_file: Path) -> Tuple[str, str]:
        parts = routing_file.parts
        try:
            pi = next(i for i, p in enumerate(parts) if p == "projects")
            app = parts[pi + 1] if pi + 1 < len(parts) else ""
            return app, APP_PREFIXES.get(app, "")
        except StopIteration:
            return "", ""

    # ── Lazy module resolution ────────────────────────────────────────────────

    def _find_child_routing(self, lazy_import: str, from_file: Path) -> Optional[Path]:
        """
        Given loadChildren import path (e.g. './settings/settings.module'),
        locate the child module's *-routing.module.ts.
        """
        module_path = (from_file.parent / lazy_import).resolve()
        module_dir  = module_path.parent

        # Direct sibling: settings-routing.module.ts in same dir
        candidates = list(module_dir.glob("*-routing.module.ts"))
        if candidates:
            return candidates[0]

        # One level deeper (lazy module in sub-package)
        for sub in module_dir.rglob("*-routing.module.ts"):
            if not is_excluded(sub):
                return sub

        return None

    # ── Test-utils lookup ─────────────────────────────────────────────────────

    def _test_utils(self, full_url: str, app_name: str) -> Optional[str]:
        if not self._e2e_dir.exists():
            return None
        # Strip app prefix
        path_part = full_url
        for pfx in ("/app/portal/", "/em/"):
            if full_url.startswith(pfx):
                path_part = full_url[len(pfx):]
                break
        static = [p for p in path_part.split("/") if p and ":" not in p]
        d = self._e2e_dir / app_name
        for seg in static:
            d = d / seg
        if d.exists():
            for f in d.glob("*-test-utils.ts"):
                return rel(f, self._root)
        return None

    # ── Recursive tree traversal ──────────────────────────────────────────────

    def _traverse(self, routing_file: Path, url_prefix: str, app_name: str) -> List[Dict]:
        """
        Recursively process a routing module file.
        url_prefix: accumulated URL so far (e.g. '/em/settings')
        """
        key = to_fwd(routing_file)
        if key in self._visited:
            return []
        self._visited.add(key)

        try:
            content = routing_file.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return []

        results: Dict[str, Dict] = {}

        for path_val, component, lazy in extract_route_entries(content):
            # Build the URL for this segment
            if path_val:
                url = re.sub(r"/+", "/", f"{url_prefix}/{path_val}")
            else:
                url = url_prefix   # path: '' means same level

            if component:
                # Leaf route — resolve HTML
                html = self._resolver.resolve(component, routing_file, content)
                entry = {
                    "path": path_val,
                    "full_url": url,
                    "app": app_name,
                    "component": component,
                    "html_template": html,
                    "test_utils": self._test_utils(url, app_name),
                }
                # Keep first entry with HTML if duplicates arise
                if url not in results or (html and not results[url]["html_template"]):
                    results[url] = entry

            elif lazy:
                # Branch — follow loadChildren
                child_file = self._find_child_routing(lazy, routing_file)
                if child_file:
                    for child in self._traverse(child_file, url, app_name):
                        child_url = child["full_url"]
                        if child_url not in results or (
                            child["html_template"] and not results[child_url]["html_template"]
                        ):
                            results[child_url] = child

        return list(results.values())

    # ── Public scan ───────────────────────────────────────────────────────────

    def scan(self) -> List[Dict]:
        root_files = [
            f for f in self._web_dir.rglob("app-routing.module.ts")
            if not is_excluded(f)
        ]
        if not root_files:
            # Fallback: scan all routing modules flat
            root_files = [
                f for f in self._web_dir.rglob("*-routing.module.ts")
                if not is_excluded(f)
            ]

        # Prefer subdirectory routing files over top-level dispatchers.
        # A top-level dispatcher (parent dir = "app") lazily loads subapp modules,
        # so scanning it produces doubled prefixes like /app/portal/portal/...
        # When subdirectory roots exist for the same app, skip the top-level.
        from collections import defaultdict
        by_prefix: Dict[str, List[Path]] = defaultdict(list)
        for f in root_files:
            _, prefix = self._app_prefix(f)
            if prefix:
                by_prefix[prefix].append(f)

        selected: List[Path] = []
        for files in by_prefix.values():
            subdir = [f for f in files if f.parent.name != "app"]
            toplevel = [f for f in files if f.parent.name == "app"]
            selected.extend(subdir if subdir else toplevel)

        # Add roots with no recognized prefix (skipped anyway, but kept for fallback)
        selected.extend(f for f in root_files if not any(self._app_prefix(f)[1]))

        print(f"   [scan] Angular app roots: {len(selected)}")

        all_routes: Dict[str, Dict] = {}

        for root in selected:
            app_name, prefix = self._app_prefix(root)
            if not prefix:
                continue  # skip internal/shared routing modules
            self._visited.clear()
            for entry in self._traverse(root, prefix, app_name):
                url = entry["full_url"]
                if url not in all_routes or (
                    entry["html_template"] and not all_routes[url]["html_template"]
                ):
                    all_routes[url] = entry

        result = sorted(all_routes.values(), key=lambda r: r["full_url"])
        resolved = sum(1 for r in result if r["html_template"])
        print(f"   [done] Angular routes: {len(result)}  |  HTML templates resolved: {resolved}")
        return result

    def legacy_paths(self, routes: List[Dict]) -> List[str]:
        """Plain path strings for backward-compatible discovered_routes.json."""
        return sorted({r["path"] for r in routes if r["path"]})


# ══════════════════════════════════════════════════════════════════════════════
# Spring Boot REST API scanner (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

class SpringBootScanner:
    CLASS_PATH_PATTERNS = [
        r'@RequestMapping\s*\(\s*path\s*=\s*"([^"]+)"',
        r'@RequestMapping\s*\(\s*value\s*=\s*"([^"]+)"',
        r'@RequestMapping\s*\(\s*"([^"]+)"',
    ]
    METHOD_PATTERN = re.compile(
        r'@(?:GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)'
        r'\s*\(\s*(?:path\s*=\s*|value\s*=\s*)?["\']([^"\']+)["\']'
    )

    def scan(self, project_path: Path) -> List[str]:
        files = [f for f in project_path.rglob("*Controller.java") if not is_excluded(f)]
        if not files:
            return []
        print(f"   [scan] Spring Boot controllers: {len(files)}")
        routes = []
        for f in files:
            routes.extend(self._parse(f))
        return sorted(set(routes))

    def _parse(self, file: Path) -> List[str]:
        try:
            src = file.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return []
        if "@RestController" not in src and "@Controller" not in src:
            return []
        cp = self._class_path(src)
        mps = self.METHOD_PATTERN.findall(src)
        if not mps:
            return [cp] if cp else []
        return [re.sub(r"/+", "/", f"{cp.rstrip('/')}/{mp.lstrip('/')}") if cp else mp
                for mp in mps]

    def _class_path(self, src: str) -> Optional[str]:
        for pat in self.CLASS_PATH_PATTERNS:
            m = re.search(pat, src)
            if m:
                return m.group(1)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# Orchestrator
# ══════════════════════════════════════════════════════════════════════════════

class RouteScanner:
    def __init__(self, project_path: str):
        self.project_root = Path(project_path)
        self._angular = AngularRouteScanner(self.project_root)
        self._spring  = SpringBootScanner()

    def scan_all(self) -> Dict:
        print(f"\n[scan] project: {self.project_root}\n")
        angular = self._angular.scan()
        spring  = self._spring.scan(self.project_root)
        if spring:
            print(f"      [done] Spring Boot API: {len(spring)} routes")
        return {
            "angular_routes": angular,
            "spring_routes":  spring,
            "meta": {
                "scanned_at":   str(date.today()),
                "project_path": to_fwd(self.project_root),
            },
        }


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python route_scanner.py <project_path>")
        print("Example: python route_scanner.py E:/inetsoft/stylebi1")
        sys.exit(1)

    project_path = sys.argv[1]
    if not os.path.exists(project_path):
        print(f"ERROR: path not found: {project_path}")
        sys.exit(1)

    scanner = RouteScanner(project_path)
    results = scanner.scan_all()

    angular = results["angular_routes"]
    spring  = results["spring_routes"]
    resolved = sum(1 for r in angular if r["html_template"])

    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    print(f"  Angular routes:            {len(angular)}")
    print(f"  HTML templates resolved:   {resolved} / {len(angular)}")
    print(f"  Spring REST API routes:    {len(spring)}")

    if angular:
        print("\nAngular routes (first 15):")
        for r in angular[:15]:
            status = "[ok]" if r["html_template"] else "[--]"
            print(f"   {status} {r['full_url']}")
            if r["html_template"]:
                print(f"        -> {r['html_template']}")
        if len(angular) > 15:
            print(f"   ... and {len(angular) - 15} more")

    # Output 1: legacy format
    legacy = {
        "angular_routes": scanner._angular.legacy_paths(angular),
        "spring_routes":  spring,
    }
    legacy_file = Path("discovered_routes.json")
    with open(legacy_file, "w", encoding="utf-8") as f:
        json.dump(legacy, f, indent=2, ensure_ascii=False)
    print(f"\n[saved] legacy format : {legacy_file.absolute()}")

    # Output 2: enhanced dom-routes.json
    e2e_dir = Path(project_path) / "e2e"
    dom_file = (e2e_dir if e2e_dir.exists() else Path()) / "dom-routes.json"
    with open(dom_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"[saved] DOM route map  : {dom_file.absolute()}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
