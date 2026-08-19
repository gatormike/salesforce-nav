# Salesforce Setup Navigator — Refactor & Fix Plan

**Purpose:** working instructions for Claude Code. Read this file top to bottom before making changes. Work one phase at a time, in order, and stop for review at the end of each phase.

---

## 0. How to use this file

1. Start a session with: `Read REFACTOR_PLAN.md and confirm the phase you're starting.`
2. Do **one phase per session/commit**. Do not start Phase N+1 until Phase N is verified.
3. At the end of each phase, run the manual test script in §9 and report which items pass.
4. If a task in this plan conflicts with what you find in the actual code, **stop and ask** — this plan was written against a partial snapshot (`constants.js`, `config.js`, `utils.js`, `storage.js`, `menu.js`, `star.js`, `settings.js`, `history.js`). It does **not** account for `manifest.json`, the content-script entry point, or the CSS. Read those first and reconcile.

### Before Phase 0, answer these
These change the shape of later phases. Do not guess.

- **A. Org scoping.** Should menu config be shared across all Salesforce orgs, or namespaced per My Domain host? (Admins working sandbox + prod + multiple clients will hit this. `ObjectManager/01I0h000000fETd/...` in the default config is org-specific and already broken outside its home org.)
- **B. Mount strategy.** Keep injecting `<li>` into Aura's tab bar and repair on re-render, or move to a Shadow DOM host on `body`? This plan assumes **Shadow DOM host** (see §3). If you want to stay in the tab bar, Phase 2 changes substantially.
- **C. Build step.** Stay with plain globals + `manifest.json` script order, or introduce a bundler (esbuild) and ES modules? This plan assumes **plain globals for now**, with a namespace object to reduce collision risk.
- **D. `all_frames`.** Check `manifest.json`. Setup embeds Classic pages in iframes; if the content script runs in them you may be getting nested menus.

---

## 1. What this extension is

A Chrome content script that injects a custom navigation bar into Salesforce Lightning Setup. It provides:

- A configurable multi-group dropdown menu of Setup pages (`menu.js`, `config.js`)
- A star button to add/remove the current Setup page from the menu (`star.js`)
- A history dropdown of recently visited Setup pages (`history.js`)
- A settings modal to edit groups/items (`settings.js`)
- Config in `chrome.storage.sync`, history in `chrome.storage.local` (`storage.js`)

The layering is fine: `constants` → `utils` → `storage` → UI modules. Dependencies point one direction, no cycles. **The problems are in the runtime model, not the file layout.** Do not reorganize files for their own sake.

---

## 2. Ground rules

- **No new dependencies** without asking.
- **Preserve public behavior** unless a task explicitly changes it. This is a tool someone uses daily; a broken menu is worse than an imperfect one.
- **Match existing style**: JSDoc on exported functions, 2-space indent, single quotes, `const` by default.
- **Use the `log()` helper**, never bare `console.*`. There are existing violations in `utils.js` (`findSetupContainer`, `getActiveSetupPath`) and `history.js` (debug button) — fix them as you pass through.
- **Never `innerHTML` with user-controlled data.** Existing `innerHTML` uses are static SVG/entities and are fine; keep it that way.
- **Every async handler that writes DOM needs a staleness check.** This is the single most repeated bug class in the codebase.
- **Commit per phase**, message format: `phase N: <short description>`.
- Add a `.editorconfig` and Prettier config in Phase 0. `constants.js` line 47 (`HISTORY_DISPLAY_LIMIT`) has stray indentation, which means nothing is enforcing format today.

---

## 3. Target architecture

Four pieces to introduce. Everything else becomes a consumer of them.

### 3.1 Config store (`store.js`)
Owns the config array. Nothing else holds a long-lived reference to it.

```
SFNav.store = {
  get(),                  // returns a deep-frozen or cloned snapshot
  update(mutatorFn),      // clone → mutate → validate → persist → notify
  subscribe(cb),          // returns unsubscribe fn
  _reconcile(newConfig)   // called by chrome.storage.onChanged
}
```

Rules:
- All writes serialize through a single promise chain (prevents lost updates from rapid clicks and from two Setup tabs).
- `storage.onChanged` reconciles into the store, which then notifies subscribers **once**. No UI module rebuilds itself directly after a save.
- Callers get snapshots, not the live array. This retires the aliasing hack in `handleReset` (`menuConfig.length = 0; push(...)`), which only exists to keep shared references valid.

### 3.2 Navigation event source (`navigation.js`)
One place that detects SPA route change and fans out.

```
SFNav.nav = {
  getCurrentPath(),       // canonical, see 3.4
  onChange(cb)            // fires on real navigation only
}
```

Sources: `popstate`, `hashchange`, a MutationObserver on the Setup iframe's `src` attribute, and a fallback `setInterval` at a low frequency (≥2s) only if the observer proves unreliable. Consumers: history recording, star state, menu health check.

This replaces the 1s `setInterval` in `star.js`, which currently calls `getActiveSetupPath()` — including `querySelectorAll('iframe')` — every second, forever, per star instance.

### 3.3 Mount manager (`mount.js`)
Owns injection, teardown, and repair.

```
SFNav.mount = {
  mount(),      // idempotent
  unmount(),    // removes host + all listeners/timers
  rebuild()     // single entry point for "config changed, redraw"
}
```

- **Kills the hidden marker div.** `injectMenu` currently appends a `<div id="sf-custom-nav" style="display:none">` to `body` as an existence sentinel. Because it lives on `body`, Aura's re-render of the tab bar removes your `<li>`s but leaves the marker — so the existence check reports "mounted" while the menu is visibly gone, and it can never self-heal. The sentinel must be the host element itself.
- **Fixes the duplicate-injection path.** `if (targetUL && !document.getElementById(CUSTOM_NAV_ID))` falls through to the `else` branch when the marker exists, inserting a *second* bar with the same `id`.
- Observes for its own removal and re-mounts (debounced ≥250ms).

### 3.4 Canonical path (`utils.js`)
One function, used everywhere a path is compared or stored.

```js
function canonicalizePath(input) // → '/lightning/setup/ManageUsers/home'
```

Must: resolve relative → absolute, strip query string and hash, strip trailing slash, reject `..` segments. Callers: `findMenuItemByPath`, `saveToHistory` dedup, star state, `normalizePathForStorage`.

**This is the highest-value single fix in the codebase.** Today `getActiveSetupPath()` returns `pathname + search`, while `resolveConfigPath(item.path)` never has a query string. Real Setup URLs carry `?0.source=`, `?setupid=`, trailing slashes. Consequences: the star reads hollow on a page that *is* saved → clicking adds a duplicate; history dedup fails → the list fills with near-identical rows for one page.

---

## 4. Phases

### Phase 0 — Baseline & tooling
**Goal:** know what you're working with; stop churn from formatting.

Tasks:
1. Read `manifest.json`, the content-script entry point, and the CSS. Write a short `ARCHITECTURE.md` describing actual load order, injection timing, and where `HISTORY_LABEL_SELECTORS`, `HISTORY_LABEL_SETTLE_DELAY`, `HISTORY_LABEL_MAX_WAIT`, and `CONTAINER_SEARCH_TIMEOUT` are consumed. If they're unused, say so — they may be unwritten features.
2. Answer §0 questions A–D from the code where possible; flag what needs a human decision.
3. Add `.editorconfig` + Prettier config. Run once across the repo as a **separate commit** so it doesn't pollute later diffs.
4. Add a minimal test harness (node + a DOM shim, or just a `tests/` folder of pure-function tests). Only pure functions need cover: `canonicalizePath`, `normalizePathForStorage`, `findMenuItemByPath`, `validateMenuConfig`, migrations.

**Done when:** `ARCHITECTURE.md` exists, format commit is isolated, `npm test` runs (even with two tests).

---

### Phase 1 — Canonical paths
**Goal:** retire the exact-string path matching. No new modules yet.

Tasks:
1. Implement `canonicalizePath()` in `utils.js` per §3.4. Reject `..`.
2. Rewrite `findMenuItemByPath` to compare canonical forms on both sides.
3. Use it in `saveToHistory` dedup (`storage.js`), star state (`star.js`), and the "already in menu" check in `refreshHistoryDropdown` (`history.js`).
4. Replace the regex in `normalizePathForStorage` with `path.slice(SF_SETUP_BASE.length)` after a prefix check — it builds a regex to strip a known constant.
5. Tighten `validateMenuConfig` to reject `..` and empty paths. **Note:** the "+ Item" button in `settings.js` inserts `{ label: 'New item', path: '' }`, which will now fail validation on the next Save with an unhelpful "Item N in group M" error. Either skip empty rows at save time or flag them inline in the settings UI — pick one and do it in this phase, not later.
6. Tests for `canonicalizePath` covering: query strings, trailing slash, hash, already-absolute, relative, `..` rejection, empty/null.

**Done when:** navigating to a saved page with `?0.source=alohaHeader` shows a filled star; clicking the same page twice never creates a duplicate entry; history shows one row per page.

---

### Phase 2 — Mount manager & Aura survival
**Goal:** the menu stops disappearing.

Assumes answer **B = Shadow DOM host**. If B = stay in tab bar, replace tasks 1–3 with: MutationObserver on the tab bar's parent, debounced re-injection, and a real sentinel (`document.querySelector('li.sf-injected-menu-item')`).

Tasks:
1. Create `mount.js` per §3.3. Render into a Shadow DOM host appended to `body`, positioned alongside the tab bar. This isolates you from Aura re-renders **and** from SLDS style bleed in both directions.
2. Move all CSS into the shadow root.
3. Delete the hidden marker div and the `!document.getElementById(CUSTOM_NAV_ID)` guard entirely.
4. Single `rebuild()` used by: settings save, store notification, initial mount. `handleSave` in `settings.js` currently calls `removeExistingMenu()` + `injectMenu()` **and** `onConfigChange()` **and** triggers `storage.onChanged` — two or three rebuilds per save. Reduce to one.
5. Add `unmount()` that clears every timer and listener, and call it before re-mount.

**Done when:** opening and closing several console tabs, and navigating between Setup pages for 5 minutes, never loses the menu. Saving from settings rebuilds the menu exactly once (verify with a `log()` counter).

---

### Phase 3 — Navigation events, kill the poll
**Goal:** remove `setInterval` from `star.js`.

Tasks:
1. Create `navigation.js` per §3.2.
2. `star.js` subscribes to `nav.onChange` instead of polling. Delete the interval and the `isConnected` self-clear.
3. Route history recording through the same event (find where it currently lives — likely the entry file).
4. Mount manager subscribes for its health check.

**Done when:** no `setInterval` remains outside an explicit, documented fallback. Star state still updates within ~300ms of navigation. CPU profile on an idle Setup tab shows no recurring work.

---

### Phase 4 — Config store & settings modal
**Goal:** stop mutating shared state; make Cancel mean cancel.

Tasks:
1. Create `store.js` per §3.1 with a serialized write queue.
2. Migrate `menu.js`, `star.js`, `history.js`, `settings.js` to `store.get()` / `store.update()` / `store.subscribe()`.
3. **Rename the global `onConfigChange(callback)` in `storage.js`** to `subscribeToConfigChanges` (or fold it into the store). Eight functions currently take a *parameter* named `onConfigChange` with an incompatible signature; they don't collide only because of shadowing. This is a landmine.
4. Settings modal renders against a **deep clone**; commit on Save, discard on Close/outside-click. Today `input` listeners write to the live array on every keystroke and Close doesn't revert.
5. `star.js`: mutate a clone, persist, *then* swap in. Today `items.splice()` runs before `await saveMenuConfig`, so a failed save leaves memory and storage disagreeing.
6. Serialize `saveToHistory` through the same queue — it's a non-atomic read-modify-write and drops entries on rapid navigation or with two Setup tabs open.

**Done when:** editing a group title and clicking Close leaves the menu unchanged. Clicking the star 10 times rapidly produces a consistent final state. Config edited in tab A appears in tab B without either tab losing data.

---

### Phase 5 — Storage robustness
**Goal:** stop failing silently.

Tasks:
1. **Schema versioning.** Move to `{ schemaVersion: 1, groups: [...] }` with a migration chain. Retrofitting this onto deployed unversioned data is painful — do it before wider release. `backfillGroupPaths` is an ad-hoc migration keyed on group *title*, so it silently does nothing for anyone who renamed a group; fold it in as migration 0→1.
2. **Quota handling.** `chrome.storage.sync` caps at 8,192 bytes per item; the default config is already ~2.5KB. Catch `QUOTA_BYTES_PER_ITEM` and surface a human message ("your menu is too large to sync"), not the raw Chrome error string. Also note the 120 writes/min, 1,800/hour limits — the star can be clicked faster than that.
3. **Orphaned context.** After an extension reload, `isContextValid()` returns false, every read resolves to defaults and every write no-ops. The user edits, sees no error, and loses the work. Surface a visible "reload this page" state instead.
4. **Org scoping** if §0 answer A says per-org. Key by My Domain host with a shared/global section.
5. Remove `ObjectManager/01I0h000000fETd/FieldsAndRelationships/view` ("Plan") from `DEFAULT_MENU_CONFIG` — it's a custom-object key prefix from one specific org and 404s for everyone else.

**Done when:** a config too large to sync produces a clear message; reloading the extension while a Setup tab is open shows a reload prompt rather than silent no-ops.

---

### Phase 6 — Interaction, a11y, cleanup
**Goal:** the parts users touch.

Tasks:
1. **Dropdown state machine.** In `createMenuItem` and `createHistoryButton`: `mouseenter` opens, then `click` sees `isOpen === true`, closes everything, and `if (!isOpen)` blocks reopening. The pointer never left, so `mouseenter` won't refire — the menu vanishes and stays gone. Reconcile click and hover into one state machine, and add ~150ms close latency on `mouseleave` so travel across a gap doesn't kill it.
2. **Stale async renders.** `refreshHistoryDropdown` does `innerHTML = ''` then appends after an `await`; two overlapping hovers interleave into duplicated rows. The `mouseenter` handler also adds `open` *after* the await unconditionally, so a dropdown can stick open with no pointer over it. Add a generation counter: capture a token before the await, bail on resume if stale.
3. **Modal close race.** `closeSettingsModal` removes `show` then sets `display:none` after 200ms. Close and reopen inside that window and the pending timeout fires after the reopen — modal is `show`n but `display:none`, invisible and unclickable. Store the timeout ID, clear it in open.
4. **Link click handlers.** `menu.js` and `history.js` both do `e.preventDefault(); window.location.href = fullPath;` on links whose `href` is already `fullPath`. The handler accomplishes nothing except breaking Cmd/Ctrl/middle-click "open in new tab" — a real loss for Setup work. **Delete the handlers.** If they must stay, bail on `e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0`.
5. **Message timers.** `showMessage` and the three inline `setTimeout(..., 3000)` clears aren't tracked; a second save's message gets wiped by the first save's timer. Track and clear.
6. **Accessibility.** `aria-haspopup` + `aria-expanded` on triggers; `aria-label` on icon-only buttons (`title` alone isn't reliably announced); `aria-pressed` on the star; Escape-to-close and focus trap on both modals; arrow-key navigation within dropdowns.
7. **Drag and drop.** The `⋮⋮`/`⋮` handles and the header copy ("Drag to reorder") promise something that isn't implemented — only the arrow buttons work. Either implement it or remove the affordance and the copy. Removing is acceptable.
8. **Import.** Export exists with no Import — asymmetric. Add Import, and note that this is where URL validation starts to matter for real. Validate every path through `canonicalizePath` + `validateMenuConfig` before accepting.
9. **Replace `confirm()`/`alert()`** with inline confirmation. Native dialogs in a content script on a Lightning page are jarring and block the page.
10. **Dead code:** delete `sanitizeInput()` (unused, and its HTML-escaped output would double-escape if ever passed to `textContent`). Remove or gate the "Debug: log history JSON" button in `history.js` behind a debug flag.
11. **Namespace.** Wrap module exports in an `SFNav` object rather than bare globals (unless §0 answer C moved you to a bundler).
12. **Duplicate detection.** Warn when the same canonical path is saved in two groups.

**Done when:** the a11y checklist in §9 passes and no promised-but-missing affordances remain.

---

## 5. Explicitly out of scope

Do not do these without asking:
- Rewriting in TypeScript
- Adding a UI framework
- Changing the visual design
- Reorganizing the file layout beyond adding `store.js`, `navigation.js`, `mount.js`
- Publishing / store listing changes

---

## 6. Bug → phase index

| # | Bug | Phase |
|---|---|---|
| 1 | Path matching ignores query strings → star flakiness, duplicate adds, broken history dedup | 1 |
| 2 | `..` accepted by URL validation | 1 |
| 3 | New item `{path: ''}` fails validation with unhelpful error | 1 |
| 4 | Menu destroyed by Aura re-render, never recovers | 2 |
| 5 | Hidden marker div makes recovery impossible | 2 |
| 6 | `injectMenu` inserts duplicate bar with duplicate `id` | 2 |
| 7 | 2–3 menu rebuilds per settings save | 2 |
| 8 | 1s poll per star instance, forever | 3 |
| 9 | No SPA navigation detection | 3 |
| 10 | Settings edits apply live; Close doesn't revert | 4 |
| 11 | `star.js` mutates before persisting | 4 |
| 12 | `onConfigChange` name collision (global vs. parameter) | 4 |
| 13 | `saveToHistory` non-atomic read-modify-write | 4 |
| 14 | No schema version / migrations | 5 |
| 15 | `chrome.storage.sync` quota unhandled | 5 |
| 16 | Orphaned context fails silently, loses user edits | 5 |
| 17 | Org-specific ID in shipped defaults | 5 |
| 18 | Click-while-hovering closes dropdown permanently | 6 |
| 19 | Overlapping `refreshHistoryDropdown` duplicates rows | 6 |
| 20 | Modal close/reopen race → invisible modal | 6 |
| 21 | Cmd/Ctrl/middle-click broken on all links | 6 |
| 22 | Untracked message timers clobber each other | 6 |
| 23 | No a11y (aria, Escape, focus trap, keyboard nav) | 6 |
| 24 | Drag handles that don't drag | 6 |
| 25 | Export without Import | 6 |
| 26 | `sanitizeInput` dead code; debug button shipped | 6 |
| 27 | Bare `console.*` instead of `log()` | any |

---

## 7. Files by phase

| Phase | Touches |
|---|---|
| 0 | `manifest.json`, entry point, CSS (read only); new `ARCHITECTURE.md`, `.editorconfig`, `tests/` |
| 1 | `utils.js`, `storage.js`, `star.js`, `history.js`, `settings.js` |
| 2 | new `mount.js`; `menu.js`, `settings.js`, CSS, entry point |
| 3 | new `navigation.js`; `star.js`, entry point |
| 4 | new `store.js`; `storage.js`, `menu.js`, `star.js`, `history.js`, `settings.js` |
| 5 | `storage.js`, `store.js`, `config.js`, `constants.js` |
| 6 | `menu.js`, `history.js`, `settings.js`, `star.js`, `utils.js`, CSS |

---

## 8. Commit checklist

Before each commit:
- [ ] No bare `console.*` added
- [ ] No new `setInterval` without a documented reason and a teardown path
- [ ] Every new async DOM writer has a staleness check
- [ ] Every new listener/timer is removed in `unmount()`
- [ ] Pure-function changes have tests
- [ ] Extension loads clean with zero console errors on a real Setup page

---

## 9. Manual test script

Run in a real Salesforce org after every phase. Sandbox is fine.

**Core**
1. Load a Setup page → menu appears within 2s
2. Click a group with a `path` → navigates
3. Click a group without a `path` → dropdown opens
4. Cmd/Ctrl-click a menu link → opens in a new tab *(fails until Phase 6)*
5. Middle-click a menu link → opens in a new tab *(fails until Phase 6)*

**Path handling** *(Phase 1)*

6. Navigate to a saved page via a link with `?0.source=alohaHeader` → star is filled
7. Click star on an already-saved page → offers Remove, not a duplicate add
8. Visit the same page 3 times by different routes → one history row

**Survival** *(Phase 2)*

9. Open 3 console tabs, close them → menu still present
10. Navigate Setup for 5 minutes → menu still present, no duplicates
11. Inspect DOM → exactly one host element, no orphaned `id="sf-custom-nav"`

**State** *(Phase 4)*

12. Open settings, rename a group, click Close → menu unchanged
13. Open settings, rename a group, click Save → menu updates once
14. Two Setup tabs: save in A → B updates, neither loses data
15. Click the star 10× rapidly → consistent final state, no console errors

**Storage** *(Phase 5)*

16. Reload the extension with a Setup tab open → visible reload prompt, not silent failure
17. Add items until sync quota is exceeded → clear human-readable message

**Interaction & a11y** *(Phase 6)*

18. Hover a menu, then click it → stays open (or toggles predictably), never becomes unrecoverable
19. Hover history, move away, hover again quickly → no duplicate rows, no stuck-open dropdown
20. Open settings, close, reopen within 200ms → modal visible and interactive
21. Tab to the star → announced with a name and pressed state
22. Escape closes both modals
23. Arrow keys navigate within an open dropdown