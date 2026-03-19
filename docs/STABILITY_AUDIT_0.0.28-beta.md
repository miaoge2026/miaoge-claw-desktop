# 0.0.28-beta Stability Audit

This document records the highest-priority source issues found during review of `miaoge-claw-desktop` and the concrete patch plan for the next release.

## Highest-priority problems

### 1. `src/main/lib/auto-updater.ts`

Current problems:

- Imports `autoUpdater` from `electron-updater`, then exports `const autoUpdater = new AutoUpdater()`. This creates a naming conflict and is easy to break during build / maintenance.
- Uses `StructuredLogger` as a type but does not import it.
- Imports `app` but does not use it.
- References `this.mainWindow` in `showInstallDialog`, but the class does not define a `mainWindow` field or setter.
- Calls `startUpdateChecks()` before `isEnabled = true`, while `checkForUpdates()` exits early when not enabled. That makes the initial check ineffective.
- Re-registers updater listeners on repeated initialization unless guarded carefully.

Recommended patch:

- Rename the Electron updater import to `electronAutoUpdater`.
- Add `private mainWindow: BrowserWindow | null = null` and a `setMainWindow(window)` method.
- Import `StructuredLogger` explicitly.
- Set `isEnabled = true` before the first update check.
- Remove unused imports.

### 2. `src/main/lib/performance-monitor.ts`

Current problems:

- `recordMetric(...)` is defined twice with the same name.
- The public method and private method duplicate the same responsibility.
- Uses `StructuredLogger` as a type but does not import it.
- `recordCustomMetric()` does not call `limitMetrics()`, so long-running sessions can still grow memory usage.

Recommended patch:

- Keep a single private `recordMetricInternal(...)` helper.
- Keep one public API for recording metrics.
- Import `StructuredLogger` explicitly.
- Ensure both standard and custom metrics use the same limiting path.

### 3. `src/main/lib/logger.ts`

Current problems:

- Uses `process.userData`, which is not a standard Electron path API and is likely incorrect in main-process runtime.
- Imports `createWriteStream`, `fileURLToPath`, and `__dirname` helpers that are not actually used.
- Depends on `winston`, but `package.json` currently does not list `winston` in dependencies or devDependencies.
- Calls `this.logger.crit(...)`; Winston standard levels usually do not include `crit` unless custom levels are configured.

Recommended patch:

- Replace path resolution with `app.getPath('logs')`.
- Remove unused imports.
- Change `critical()` to map to `error()` unless custom levels are introduced.
- Add `winston` to `dependencies`.

### 4. `src/main/index.ts`

Current problems:

- `ensureSingleInstance()` is called from `start()`. `start()` can be reached again from the `activate` handler, which risks repeated lock checks and repeated startup wiring.
- `setupMenuShortcuts()` registers an app-level listener each time `start()` runs.
- `initializePerformanceMonitoring()` creates a `setInterval(...)` but does not keep / clear the timer on exit.
- `AutoUpdater` is initialized, but the current class implementation has no window handoff for install dialogs.

Recommended patch:

- Acquire the single-instance lock once during bootstrap.
- Guard startup with `isStarted` and `shortcutsRegistered` flags.
- Store cleanup timer handles and clear them on exit.
- Pass the main window into the updater via `setMainWindow(...)`.

### 5. `package.json`

Current problems:

- Version is `1.0.6`, which is inconsistent with the changelog / release stream (`0.0.xx-beta`).
- `build.publish.owner` / `repo` still point to the upstream repo instead of this fork.
- Missing `winston` dependency required by the current logger implementation.
- Scripts mix `npm run` with a `pnpm`-centric setup.

Recommended patch for `0.0.28-beta`:

- Set version to `0.0.28-beta`.
- Set `build.publish.owner` to `miaoge2026`.
- Set `build.publish.repo` to `miaoge-claw-desktop`.
- Add `winston` dependency.
- Optionally normalize scripts to `pnpm run` for consistency.

## Proposed release scope for `0.0.28-beta`

### Fixes

- Fix updater implementation conflicts and main-window dialog handling.
- Fix duplicate metric recording definitions in performance monitor.
- Fix logger runtime path resolution and missing dependency declaration.
- Fix repeated startup listeners / timer lifecycle in main process.
- Fix publish target metadata for in-app update and release consistency.

### Non-goals for this patch

- No large renderer refactor.
- No business-logic changes to chat / agent orchestration.
- No installer UX redesign.

## Suggested validation checklist

- `pnpm install`
- `pnpm run build`
- Start packaged app in dev mode once
- Verify updater initialization does not throw
- Verify log path resolves correctly on first startup
- Verify no duplicate startup listeners are registered after app re-activation
- Verify release metadata points at `miaoge2026/miaoge-claw-desktop`
