# Errors

## [ERR-20260720-002] github_pages_build_stuck_queued

**Logged**: 2026-07-20T10:10:00+08:00
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
GitHub Pages 未发布已推送的 model-architecture-3d-deck，页面持续返回 404。

### Error
```
pages build 1104480306: status=building, duration=0
Actions runs 29711334888 and 29711923851: status=queued
```

### Context
- Commit `b95d7a34ff18071697aaf5eb7d2dc77c723dd67e` 已在 origin/main。
- Contents API 已确认 `patterns/model-architecture-3d-deck/pattern.html` 存在于该 commit。
- 原 Pages run 长时间 queued；取消/重跑后仍 queued。
- 通过 Pages Builds API 重新触发 build 1104480306，仍未获得 runner，线上路径继续 404。

### Suggested Fix
等待 GitHub Pages/Actions 队列恢复；若长期不恢复，再评估从 legacy main/root 发布迁移到显式 GitHub Actions Pages workflow。

### Metadata
- Reproducible: yes
- Related Files: patterns/model-architecture-3d-deck/pattern.html
- See Also: ERR-20260720-001

---

## [ERR-20260721-002] zero-width-side-projection-filter

**Logged**: 2026-07-21T11:30:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
The first operator-band overlay filtered out every strict side-projected node because their bounding boxes can legitimately have zero width.

### Error
```text
Operator bands were absent even though the corresponding nodes were rendered.
```

### Context
- A strict `rotateY(-90deg)` projection can produce `getBoundingClientRect().width === 0` while preserving meaningful x and y coordinates.
- The initial filter incorrectly required both nonzero width and height.

### Suggested Fix
For strict side projections, accept zero-width bounds and require only a meaningful projected height. Use the node's left coordinate as the row anchor.

### Metadata
- Reproducible: yes
- Related Files: patterns/model-architecture-training-sidecar/pattern.js

### Resolution
- **Resolved**: 2026-07-21T11:30:00+08:00
- **Notes**: Changed the row-bound filter to `rect.height > 0`; projected bands and centered labels then rendered correctly.

---

## [ERR-20260721-001] design-contract-path-assumption

**Logged**: 2026-07-21T11:15:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
A read-only inventory command assumed `DESIGN.md` was at the repository root, but this repository keeps the current design contract under `references/DESIGN.md`.

### Error
```text
rg: DESIGN.md: No such file or directory (os error 2)
```

### Context
- The command was checking pattern registry and preview references before adding a new sidecar pattern.
- The missing optional path did not affect implementation files.

### Suggested Fix
Use `references/DESIGN.md` for this repository and inspect paths with `rg --files` before combining optional documentation paths into one command.

### Metadata
- Reproducible: yes
- Related Files: references/DESIGN.md

### Resolution
- **Resolved**: 2026-07-21T11:15:00+08:00
- **Notes**: Continued with the correct repository layout and kept the new pattern contract self-contained in `pattern.json` plus the registry and preview documentation.

---

## [ERR-20260720-001] apply_patch_sandbox_helper_sigkill

**Logged**: 2026-07-20T09:42:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
一次跨四个 pattern 文件的大补丁被文件沙箱 helper 以 SIGKILL 中断。

### Error
```
apply_patch verification failed: fs sandbox helper failed with status signal: 9 (SIGKILL)
```

### Context
- 补丁同时修改 pattern.js、pattern.css、pattern.html 和 pattern.json。
- 文件均位于允许写入的 `/Users/yin` 下，重试拆分补丁后成功。

### Suggested Fix
遇到 sandbox helper SIGKILL 时，将跨文件大补丁拆成更小的 apply_patch 调用并逐个验证。

### Metadata
- Reproducible: unknown
- Related Files: patterns/model-architecture-3d-deck/

### Resolution
- **Resolved**: 2026-07-20T09:43:00+08:00
- **Notes**: 拆分为 JS 与 CSS/HTML/JSON 两次补丁后完成，并已提交推送。

---

## [ERR-20260717-002] chrome_app_name_resolution

**Logged**: 2026-07-17T17:41:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
`open -a "Google Chrome"` 临时无法按应用名解析 Chrome。

### Error
```
Unable to find application named 'Google Chrome'
```

### Context
- 尝试直接刷新本地 pattern 页面到 Google Chrome。
- Chrome 可执行文件实际存在于 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。

### Suggested Fix
应用名解析失败时直接调用 Chrome 可执行文件绝对路径，并传入本地 HTTP URL。

### Metadata
- Reproducible: unknown
- Related Files: patterns/model-architecture-3d-deck/pattern.html

### Resolution
- **Resolved**: 2026-07-17T17:41:00+08:00
- **Notes**: 已通过 Chrome 可执行文件绝对路径成功启动页面。

---

## [ERR-20260717-001] git_diff_untracked_file_path

**Logged**: 2026-07-17T15:53:38+08:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
`git diff` with an untracked HTML path failed while checking the Pass-IR capsule ModelViz changes.

### Error
```text
fatal: bad revision 'patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html'
```

### Context
- Command attempted: `rtk git -C /Users/yin/pto-design-system diff -- patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html .learnings/LEARNINGS.md`
- The target HTML file is currently untracked, so normal `git diff` is not the right inspection path for that file.
- Follow-up validation used targeted `rg` checks and JavaScript syntax validation instead.

### Suggested Fix
Use `git diff --no-index /dev/null <untracked-file>` for newly created files, or inspect targeted sections with `rg`/`sed` until the file is tracked.

### Metadata
- Reproducible: yes
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html

---

## [ERR-20260709-001] chrome_headless_dump_dom

**Logged**: 2026-07-09T01:31:31Z
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
Chrome headless `--dump-dom` aborted while validating a local SVG graph page.

### Error
```text
process terminated by signal 6
```

### Context
- Command attempted: Google Chrome headless `--dump-dom` against the local `pangu_moe_modelviz.html` preview.
- Screenshot mode with the same Chrome binary and URL succeeded.
- The page was served from the local `pto-design-system` static server on port 8766.

### Suggested Fix
Use Chrome headless screenshot mode for visual verification, or use a browser automation backend that can evaluate DOM after render when available.

### Metadata
- Reproducible: unknown
- Related Files: /Users/yin/pto-design-system/patterns/model-graphviz/assets/pangu_moe_modelviz.html

---

## [ERR-20260715-001] skill-required-design-path-drift

**Logged**: 2026-07-15T15:30:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
The design-system skill lists `DESIGN.md` as a root-level required file, but the repository stores it under `references/DESIGN.md`.

### Error
```text
sed: /Users/yin/pto-design-system/DESIGN.md: No such file or directory
```

### Context
- The required-read sequence in `SKILL.md` names `DESIGN.md` without the `references/` prefix.
- The repository root contains no `DESIGN.md`; `references/DESIGN.md` is present.

### Suggested Fix
Update the required-read path and final reference in `SKILL.md` to `references/DESIGN.md`.

### Metadata
- Reproducible: yes
- Related Files: SKILL.md, references/DESIGN.md

### Resolution
- **Resolved**: 2026-07-15T15:30:00+08:00
- **Notes**: Continued the audit using `references/DESIGN.md`.

---

## [ERR-20260715-002] browser-runtime-no-backends

**Logged**: 2026-07-15T16:10:00+08:00
**Priority**: low
**Status**: pending
**Area**: tests

### Summary
The in-app browser runtime initialized, but no browser backend was available for local visual verification.

### Error
```text
No browser is available
```

### Context
- Target: `file:///Users/yin/pto/deepseek-v32-report-overlay/index.html`.
- The browser troubleshooting flow was followed without resetting the runtime.
- `agent.browsers.list()` returned an empty array.
- Recurrence: 2026-07-17 while planning the Pass-IR capsule variant of `patterns/model-graphviz/assets/openpangu_2_0_flash_modelviz.html`; `getForUrl(...)` again returned `No browser is available`, and the required one-time discovery check again returned `[]`.
- Recurrence: 2026-07-17 while visually validating the implemented `openpangu_2_0_flash_pass_ir_capsule_modelviz.html`; the Browser runtime again returned `No browser is available`, and discovery remained `[]` after the required troubleshooting read.
- Recurrence: 2026-07-17 after the user explicitly asked to open the capsule variant preview; `getForUrl(file:///Users/yin/pto-design-system/patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html)` still returned `No browser is available`, and the required backend list was `[]`.
- Recurrence: 2026-07-17 while validating `patterns/model-architecture-3d-deck/pattern.html`; `getForUrl(http://127.0.0.1:8765/pangu-moe-trainviz/op-rank-time-openpangu-flash-events.html)` returned `No browser is available`, and the required troubleshooting discovery check returned `[]`. Static HTTP, JS syntax, JSON, registry, and diff checks were used instead; visual parity remains dependent on attaching a browser backend.

### Suggested Fix
Start or attach an in-app browser backend, then rerun the visual and interaction audit against the local page.

### Metadata
- Reproducible: yes
- Related Files: /Users/yin/pto/deepseek-v32-report-overlay/index.html

---

## [ERR-20260716-001] modelviz-validator-target-mismatch

**Logged**: 2026-07-16T16:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The generic architecture projector was used as a proxy for a hand-authored ModelViz page layout, producing overlap errors that did not describe the page's actual rendered graph.

### Error
```text
ERROR: nodes 'input_tokens' and 'kv_cache' overlap by 63.0x48.0
ERROR: sibling clusters overlap in the temporary projected graph
```

### Context
- The page builds its renderer graph through a hand-authored `buildGraphFromSchema()` adapter.
- `project_model_architecture_graph.py` generated a separate temporary layout with different cluster positions.
- `validate_modelviz_layout.py` correctly rejected that temporary projection, but the result cannot validate the page adapter.

### Suggested Fix
Validate the renderer-ready graph emitted by the page adapter. Do not substitute a generic projection when the deliverable uses hand-authored layout data.

### Metadata
- Reproducible: yes
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_training_overlay_modelviz.html

### Resolution
- **Resolved**: 2026-07-16T16:00:00+08:00
- **Notes**: Kept the canonical schema validation, added static page-script checks, and treated the generic projection result as out of scope for the hand-authored page layout.

---

## [ERR-20260716-002] node-inline-check-shell-quoting

**Logged**: 2026-07-16T16:12:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A Node inline validation command used a single quote inside a single-quoted shell argument, so the intended source cutoff was not applied and browser-listener code executed in the DOM stub.

### Error
```text
TypeError: Cannot read properties of null (reading 'addEventListener')
```

### Context
- The validator intended to stop before `document.getElementById('zoomIn')` listeners.
- Nested shell quoting changed the JavaScript string used to locate the cutoff.

### Suggested Fix
Avoid literal single quotes inside single-quoted `node -e` commands. Locate a quote-free structural marker or run the check from a reusable script.

### Metadata
- Reproducible: yes
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_training_overlay_modelviz.html

### Resolution
- **Resolved**: 2026-07-16T16:13:00+08:00
- **Notes**: Replaced the cutoff with a quote-free search starting after `async function loadDefaultSchema`; the validation then passed for 23 unique HTML ids and 8 parameterized Module bindings.

### Recurrence
- **Observed**: 2026-07-16T17:10:00+08:00
- **Cause**: A later `node -e` contract check again embedded an escaped regular expression whose group became invalid after shell parsing.
- **Resolved**: Replaced the regular expression with three plain `String.includes()` assertions; the inline L1/L2 runtime contract check then passed.
- **Rule**: Do not use regular-expression literals in shell-embedded Node checks for this page; prefer plain string assertions or a reusable validator file.

---

## [ERR-20260716-003] git-fetch-credential-wait

**Logged**: 2026-07-16T19:10:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
`git fetch origin main` waited without output in a non-interactive session even though authenticated GitHub API access was available.

### Error
```text
No output for more than 60 seconds; command was interrupted with exit code 130.
```

### Context
- The HTTPS remote can enter a credential or network handshake wait without surfacing a prompt.
- `gh api repos/yinyucheng0601/pto-design-system/pages` returned immediately, confirming authenticated GitHub API access and the Pages source branch.

### Suggested Fix
Use the authenticated GitHub API to compare the remote main SHA before publication, then perform a non-interactive push. Do not leave a silent HTTPS fetch running indefinitely.

### Metadata
- Reproducible: unknown
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_training_overlay_modelviz.html

### Resolution
- **Resolved**: 2026-07-16T19:10:00+08:00
- **Notes**: Interrupted the silent fetch and switched remote-state verification to `gh api`.

---
## [ERR-20260721-003] zsh_url_globbing

**Logged**: 2026-07-21T11:49:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
An unquoted local preview URL containing `?` was interpreted by zsh as a glob.

### Error
```
zsh:1: no matches found: http://127.0.0.1:8766/patterns/model-architecture-training-sidecar/pattern.html?view=right
```

### Context
- Attempted a local HTTP HEAD check before Chrome screenshot validation.
- Shell was zsh with nomatch behavior.

### Suggested Fix
Quote every URL that contains query parameters.

### Metadata
- Reproducible: yes
- Related Files: patterns/model-architecture-training-sidecar/pattern.html

### Resolution
- **Resolved**: 2026-07-21T11:49:00+08:00
- **Notes**: Re-ran the request with the URL quoted; the preview returned HTTP 200.

---
## [ERR-20260721-004] open_google_chrome_name_resolution

**Logged**: 2026-07-21T11:52:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
macOS `open -a 'Google Chrome'` did not resolve the installed Chrome application name in this shell session.

### Error
```
Unable to find application named 'Google Chrome'
```

### Context
- Attempted to open the validated local pattern preview in the external browser.
- Chrome is installed at `/Applications/Google Chrome.app`.

### Suggested Fix
Call the installed Chrome executable directly when LaunchServices name resolution fails.

### Metadata
- Reproducible: unknown
- Related Files: patterns/model-architecture-training-sidecar/pattern.html

### Resolution
- **Resolved**: 2026-07-21T11:52:00+08:00
- **Notes**: Opened the URL through `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --new-window`; Chrome reused the existing browser session.

---
