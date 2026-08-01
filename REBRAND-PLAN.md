# Rebrand Plan: quenetiq → Quenetiq

**Scope**: 402 files, 2,504 lines, 20 packages
**Branch**: `feature/rebrand-quenetiq`
**Strategy**: Dual-publish — `@quenetiq/*` is the new canonical name, `@quenetiq/*` becomes thin deprecation wrappers

---

## Phase 1 — Directory & file renames (structural)

Rename physical paths first so subsequent phases have stable file locations.

### 1a. Project directory
```
projects/quenetiq/  →  projects/quenetiq/
```

### 1b. Config files (root)
```
quenetiq.config.ts      →  quenetiq.config.ts
quenetiq.schema.json    →  quenetiq.schema.json
```

### 1c. Config files (demos/starters)
```
demos/angular/quenetiq.config.json  →  demos/angular/quenetiq.config.json
demos/vue/quenetiq.config.json      →  demos/vue/quenetiq.config.json
demos/react/quenetiq.config.json    →  demos/react/quenetiq.config.json
```

### 1d. Angular component/directive files (rename files + class names)
```
projects/quenetiq/core/src/lib/quenetiq-config.ts       →  quenetiq-config.ts
projects/quenetiq/core/src/lib/quenetiq-router.ts        →  quenetiq-router.ts
projects/quenetiq/core/src/lib/quenetiq-resolver.ts      →  quenetiq-resolver.ts
projects/quenetiq/core/src/lib/directives.ts           →  (stays, but classes inside rename)
projects/quenetiq/vue/src/lib/quenetiq-config-plugin.ts  →  quenetiq-config-plugin.ts
projects/quenetiq/react/src/lib/quenetiq-config-provider.tsx → quenetiq-config-provider.tsx
projects/quenetiq/codegen/bin/quenetiq-codegen.mjs       →  quenetiq-codegen.mjs
projects/quenetiq/dev-server/bin/quenetiq-dev.mjs        →  quenetiq-dev.mjs
```

### 1e. Logo/branding assets (rename files)
```
**/assets/quenetiq_logo.svg  →  **/assets/quenetiq_logo.svg
public/quenetiq-logos.*      →  public/quenetiq-logos.*
```

### 1f. Browser extension
```
browser-extension/quenetiq-graphql-debugger-firefox.zip  →  (update contents, not just name)
```

**Commands**: `git mv` for all of the above.

---

## Phase 2 — Bulk text replacements (source code)

Apply in this order (most specific first to avoid double-replacement):

### 2a. Import paths — `@quenetiq/` → `@quenetiq/`
```bash
rg -l '@quenetiq/' --type ts --type tsx | xargs sed -i 's|@quenetiq/|@quenetiq/|g'
```
Affects: ~350 import statements across ~270 files

### 2b. Injection tokens — `QUENETIQ_` → `QUENETIQ_`
```bash
rg -l 'QUENETIQ_' --type ts | xargs sed -i 's|QUENETIQ_|QUENETIQ_|g'
```
Examples: `QUENETIQ_CONFIG` → `QUENETIQ_CONFIG`, `QUENETIQ_CLIENT_KEY` → `QUENETIQ_CLIENT_KEY`

### 2c. Class/type names — `Quenetiq` → `Quenetiq` (PascalCase)
```bash
rg -l 'Quenetiq' --type ts --type tsx | xargs sed -i 's|Quenetiq|Quenetiq|g'
```
Examples: `QuenetiqClient` → `QuenetiqClient`, `QuenetiqConfig` → `QuenetiqConfig`

### 2d. Directive prefix — `quenetiq-` → `qtq-` (kebab-case, in templates and selectors)
```bash
rg -l 'quenetiq-' --type html --type ts --type tsx | xargs sed -i 's|quenetiq-|qtq-|g'
```
Examples: `<quenetiq-query>` → `<qtq-query>`, `<quenetiq-auto-fetch>` → `<qtq-auto-fetch>`

### 2e. Directive class prefix — `Quenetiq` → `Qtq` (in Angular directive/component class names)
```bash
rg -l 'QuenetiqQuery\|QuenetiqAutoFetch\|QuenetiqSpinner\|QuenetiqSkeleton\|QuenetiqProgress\|QuenetiqDots\|QuenetiqOverlay' --type ts | xargs sed -i 's|QuenetiqQuery|QtqQuery|g; s|QuenetiqAutoFetch|QtqAutoFetch|g; s|QuenetiqSpinner|QtqSpinner|g; s|QuenetiqSkeleton|QtqSkeleton|g; s|QuenetiqProgress|QtqProgress|g; s|QuenetiqDots|QtqDots|g; s|QuenetiqOverlay|QtqOverlay|g'
```

### 2f. Lowercase references — `quenetiq` → `quenetiq` (in strings, comments, docs)
```bash
rg -l 'quenetiq' --type md | xargs sed -i 's|quenetiq|quenetiq|g'
rg -l 'quenetiq' --type yaml | xargs sed -i 's|quenetiq|quenetiq|g'
```

### 2g. Logo file references
```bash
rg -l 'quenetiq_logo\|quenetiq-logo\|quenetiq-logos' --type ts --type tsx --type scss --type css | xargs sed -i 's|quenetiq_logo|quenetiq_logo|g; s|quenetiq-logo|quenetiq-logo|g; s|quenetiq-logos|quenetiq-logos|g'
```

### 2h. Config file references
```bash
rg -l 'quenetiq\.config\|quenetiq\.schema' --type ts --type mjs --type js | xargs sed -i 's|quenetiq\.config|quenetiq.config|g; s|quenetiq\.schema|quenetiq.schema|g'
```

---

## Phase 3 — Config & tooling

### 3a. `tsconfig.json` (root)
Update all 21 path mappings:
```json
"@quenetiq/core": ["projects/quenetiq/core/src/public-api.ts"],
"@quenetiq/client": ["projects/quenetiq/client/src/public-api.ts"],
... (all 20 packages + sub-paths)
```

### 3b. `vitest.workspace.ts`, `vitest.config.ts`, `vitest.react.config.ts`, `vitest.lib.config.ts`
Update all aliases from `@quenetiq/*` → `@quenetiq/*` and `projects/quenetiq` → `projects/quenetiq`

### 3c. `eslint.config.ts`
- Update tsconfig.lib.json path references
- Change directive prefix: `quenetiq` → `qtq`
- Update file glob patterns

### 3d. `angular.json`
- Update any `projects/quenetiq` references (if present)

### 3e. `package.json` (root)
- Workspace glob: `projects/quenetiq/*` → `projects/quenetiq/*`
- lint-staged globs: `{src,projects/quenetiq}` → `{src,projects/quenetiq}`
- Build/lint scripts: update paths

### 3f. All 20 sub-project `package.json` files
- `name` field: `@quenetiq/*` → `@quenetiq/*`
- `repository` URLs: update to `Quenetiq/quenetiq`
- `homepage` / `bugs` URLs

### 3g. All `ng-package.json` files (8 Angular packages)
- `dest` paths: `../../../dist/quenetiq/<name>` → `../../../dist/quenetiq/<name>`

### 3h. `codecov.yml`
- Update `projects/quenetiq` exclude path

---

## Phase 4 — Deprecation wrappers (`@quenetiq/*`)

Create thin wrapper packages that re-export everything from `@quenetiq/*` with a runtime deprecation warning.

### 4a. For each of the 20 packages, create `projects/quenetiq/<name>-compat/` with:

**`package.json`**:
```json
{
  "name": "@quenetiq/<name>",
  "version": "1.0.0-deprecated.0",
  "description": "DEPRECATED — use @quenetiq/<name> instead",
  "main": "public-api.js",
  "peerDependencies": {
    "@quenetiq/<name>": "*"
  }
}
```

**`public-api.ts`**:
```typescript
// DEPRECATED: This package has been renamed to @quenetiq/<name>.
// Install @quenetiq/<name> instead. This wrapper will be removed in a future version.
console.warn(
  '[DEPRECATED] @quenetiq/<name> has been renamed to @quenetiq/<name>. ' +
  'Please update your dependencies. This compatibility package will be removed in the next major version.'
);

export * from '@quenetiq/<name>';
```

### 4b. Workspace config
Add all 20 compat packages to the workspace glob:
```json
"workspaces": [
  "projects/quenetiq/*",
  "projects/quenetiq/*-compat"
]
```

---

## Phase 5 — CI/CD & scripts

### 5a. `.github/workflows/release.yml`
- Update `@quenetiq/*` → `@quenetiq/*` in publish steps
- Update `projects/quenetiq` → `projects/quenetiq` paths
- Update `dist/quenetiq` → `dist/quenetiq`

### 5b. `scripts/version.mjs`
- Update `@quenetiq` name prefix check
- Update `projects/quenetiq` → `projects/quenetiq`
- Update `dist/quenetiq` → `dist/quenetiq`

### 5c. `scripts/build-packages.mjs`
- Update `@quenetiq` symlinks
- Update `dist/quenetiq` → `dist/quenetiq`
- Update `projects/quenetiq` → `projects/quenetiq`

### 5d. `scripts/fix-symlinks.mjs`
- Update `node_modules/@quenetiq` → `node_modules/@quenetiq`
- Update `dist/quenetiq` → `dist/quenetiq`

### 5e. `deploy/deploy.sh`
- Update GitHub repo URL: `Quenetiq/quenetiq`
- Update `@quenetiq/*` build references

### 5f. `tools/load-config.mjs`
- Update search pattern: `quenetiq.config.*` → `quenetiq.config.*`

### 5g. `tools/download-schema.mjs` & `tools/generate-types.mjs`
- Update import paths

---

## Phase 6 — Documentation

### 6a. Root `README.md`
- Update title, badges, install commands, all references

### 6b. All 20 sub-project `README.md` files
- Update package names, install commands, import paths

### 6c. `CHANGELOG.md`
- Add rebrand entry

### 6d. Angular docs site (`src/app/features/docs/pages/`)
- ~40+ HTML/TS files with code examples and GitHub source links
- Replace all `quenetiq` → `quenetiq` references

### 6e. `browser-extension/PRIVACY.md`
- Update product name references

---

## Phase 7 — Verification

### 7a. Build check
```bash
npx nx run-many --target=build --all
```

### 7b. Lint check
```bash
npm run lint
```

### 7c. Test suites
```bash
npx vitest run --config vitest.config.ts           # Base: 591+ tests
npx vitest run --config vitest.react.config.ts     # React: 84 tests
```

### 7d. Manual smoke test
- Verify Angular demo compiles
- Verify React demo compiles
- Verify Vue demo compiles

### 7e. Deprecation warning test
- Import from `@quenetiq/core` in a test file
- Verify console.warn fires with deprecation message
- Verify re-exported APIs work

---

## Risk mitigation

1. **Phase 2 ordering matters**: Do 2a (imports) before 2c (class names) to avoid `@quenetiq` → `@Quenetiq` mangling
2. **Run tests after Phase 2** to catch any missed replacements
3. **Commit after each phase** so we can bisect if something breaks
4. **Angular JIT**: Some Angular tests need `vi.mock('@angular/core')` — ensure mock tokens match new names
5. **Directive selectors**: Must update BOTH the `selector:` in `@Component`/`@Directive` AND every template usage

---

## Estimated effort

| Phase | Files | Complexity |
|-------|-------|-----------|
| 1. Directory renames | ~50 | Low (git mv) |
| 2. Bulk text replace | ~400 | Medium (careful ordering) |
| 3. Config & tooling | ~30 | Medium (JSON/TS config) |
| 4. Deprecation wrappers | 20 new packages | Low (template) |
| 5. CI/CD & scripts | ~10 | Low |
| 6. Documentation | ~65 | Low |
| 7. Verification | — | High (debugging) |
