## [LRN-20260717-016] correction

**Logged**: 2026-07-17T17:39:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
匹配 Pass IR capsule 节点取色时必须同时复用不透明表面处理，不能只复用色相后继续使用“描边 + 透明混色填充”。

### Details
3D deck 虽然已切到共享 semantic colormap，但节点 CSS 仍是 `border` 配合 24% `color-mix` 到 surface 的半透明效果，因此视觉仍与参考 capsule 不符。参考实现的 op-pill 是从 `node-accent` 到其暗部的 100% 不透明渐变，并带轻微内高光；外层 card 在 capsule host 中明确取消 border 和透明背景。

### Suggested Action
视觉对齐 renderer-driven/hybrid pattern 时，除颜色键以外还必须核对 fill opacity、gradient stops、border、shadow 和 selected state。不得把“语义色一致”误判为“节点取色效果一致”。

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/pattern.css, patterns/pass-ir-graph-node/pattern.css, patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: capsule, opaque-fill, gradient, border, source-parity
- See Also: LRN-20260717-015

### Resolution
- **Resolved**: 2026-07-17T17:39:00+08:00
- **Notes**: 节点与 Expert Pool 已改为无边框的不透明语义色渐变，保留参考内高光；selected 使用白色外环，浅色 IO tensor 使用实心灰色。

---

## [LRN-20260728-002] correction

**Logged**: 2026-07-28T17:03:23+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Model graph layout corrections must audit the complete semantic pattern instead of patching only the node pair shown in a screenshot.

### Details
Repeated drill-down screenshots showed the same defect in Dense/MoE and Routed/Shared Expert rows: a right-branch Weight remained between parallel operators because placement depended on a local hard-coded case. Coordinate-based MoE detection and schema-based edge-direction checks also allowed the same class of defect to return when an imported layout used slightly different coordinates or when a Cache moved after Dot layout.

### Suggested Action
Enumerate every Parameter/State edge and every same-rank processing row. Derive the outer flank from final rendered peer positions, anchor mixed State inputs beyond the opposite boundary of the complete row, derive edge ports from final geometry, and verify the default view plus each expandable architecture group. Keep canonical Weight encoding as `kind=state` plus `state_type=parameter`, mapped to the Parameter visual type.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/deepseek_v32_modelviz.html, patterns/model-graphviz/graphviz/deepseek_v32_source_graph.html, patterns/model-graphviz/assets/deepseek_v32_model_architecture.json, patterns/model-graphviz/pattern.json, scripts/verify-model-capsule-assets.mjs
- Tags: model-graphviz, semantic-layout, parallel-branches, parameter-lanes, drilldown, systematic-audit
- See Also: LRN-20260707-004, LRN-20260707-003, LRN-20260707-001

### Resolution
- **Resolved**: 2026-07-28T17:03:23+08:00
- **Notes**: Replaced local coordinate cases with shared semantic placement, added final-geometry edge routing and schema-wide auxiliary-lane assertions, and browser-smoked both MLA and nested MoE drill-down states.

---

## [LRN-20260728-001] correction

**Logged**: 2026-07-28T15:49:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
A control labeled “继续按……分组” must compose grouping dimensions; restyling mutually exclusive tabs does not implement cumulative grouping.

### Details
The first implementation replaced the ALL/PP/TP/EP/EDP tab visuals with a centered settings panel but retained a single `topologyMode`. The intended product rule is multiplicative and hierarchical: PP plus EP keeps four PP parents and partitions each parent into eight EP children. Every active dimension is independently removable by clicking it again.

### Suggested Action
Model grouping as an ordered set of active dimensions, derive nested partitions from the complete Rank coordinate tuple, render every active grouping level, expose `aria-pressed`, and add regression tests for both composition and second-click removal.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-parallel-rank-deck/pattern.js, patterns/model-parallel-rank-deck/planner.test.mjs
- Tags: multi-select, hierarchical-grouping, parallelism, interaction-semantics

### Resolution
- **Resolved**: 2026-07-28T15:49:00+08:00
- **Notes**: Replaced the single mode with canonical PP → TP → EP → EDP grouping axes, added nested layout frames and explicit toggle tests.

---

## [LRN-20260728-001] correction

**Logged**: 2026-07-28T09:57:46+08:00
**Priority**: critical
**Status**: pending
**Area**: frontend

### Summary
模型 Layer 复用不能只靠“保持原样”的文字约定，必须用不可变迁移基线和阻断式 parity gate 防止简化、遗漏、篡改与样式漂移。

### Details
用户指出这是反复发生的高风险问题：在提取或组合模型架构视图时，实现容易为了接入新 renderer 或提高性能而改掉原始样式、漏掉节点/边/分支，或篡改模型内容。仅让独立 Deck 与 Rank Deck 共用一个新 renderer 也不足以证明正确，因为两边可能同时复用同一个已经被改坏的实现。

### Suggested Action
在任何 renderer 重构前冻结独立 reference fixture、全 Layer 结构 manifest、Dark/Light computed-style manifest、interaction manifest 和截图。迁移必须分为 renderer extraction、Rank wrapper、ownership extension 三个独立 gate。自动检查 node/edge/cluster set equality、exact label/role、geometry、computed styles、theme/state 和视觉 diff；baseline 不得由实现者在测试失败后静默更新，任何差异都必须有可读报告和用户明确批准。

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/CSS3D_RANK_PACKING_SPEC.md, patterns/model-architecture-3d-deck/pattern.js, patterns/model-architecture-3d-deck/pattern.css
- Tags: source-parity, immutable-baseline, css3d, model-architecture, anti-simplification, regression-gate
- See Also: LRN-20260717-013

---

## [LRN-20260722-001] correction

**Logged**: 2026-07-22T14:20:00+08:00
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
Interactive canvas features must be verified with a real pointer press/release sequence, not only initialization state or synthetic DOM click dispatch.

### Details
The Layer expansion rendered correctly when initialized with `?layer=13` and when a DOM `click` event was dispatched directly. A real mouse press did not open the Layer because the base deck captured the pointer for canvas dragging on `pointerdown`; `pointerup` therefore landed on the viewport and the browser never synthesized a click for the SVG Layer hit strip.

### Suggested Action
Mark interactive overlay targets with `data-deck-no-drag`, make the base deck bypass pointer capture for those targets, and include a DevTools `Input.dispatchMouseEvent` press/release regression that asserts selected Layer, expanded depth state, and visible focus content.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/pattern.js, patterns/model-architecture-training-sidecar/pattern.js
- Tags: pointer-capture, canvas-drag, svg-hit-area, click-regression, layer-expansion

### Resolution
- **Resolved**: 2026-07-22T14:20:00+08:00
- **Notes**: Added the `data-deck-no-drag` interaction contract and verified a real mouse press/release opens L13 with `selected=13`, `expanded=13`, and a visible 310px focus panel.

---
## [LRN-20260721-010] correction

**Logged**: 2026-07-21T16:32:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Ordered per-Layer metrics need an encoding that exposes trend and anomaly, and metric names must match their actual calculation.

### Details
The current overview encodes three per-Layer mock values as opacity-varying color cells. This is compact but makes adjacent values hard to compare without a visible scale. The field labeled `Norm` is currently populated from hidden-state standard deviation, so the label is semantically inaccurate. Because Layer is an ordered topology coordinate, aligned small-multiple line charts would expose changes, spikes, and PP-boundary discontinuities more clearly than isolated color blocks.

### Suggested Action
Rename the current `Norm` series to `Std σ` or compute an actual RMS/L2 norm. Replace the three heat strips with aligned line charts for Std/RMS, Amax, and Layer latency, each with its own unit, reference band, and hover/click details. Keep Loss as an output summary rather than forcing it into a per-Layer line.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: metrics, line-chart, heatmap, semantic-accuracy, layer-topology
- See Also: LRN-20260721-007

### Resolution
- **Resolved**: 2026-07-21T16:42:00+08:00
- **Notes**: Replaced opacity heat cells with three aligned per-Layer line charts, added independent reference bands and units, preserved per-point hover/click details, and renamed the standard-deviation proxy from Norm to Std σ.

---
## [LRN-20260721-011] correction

**Logged**: 2026-07-21T16:53:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Tensor-flow rails need dedicated non-overlapping lanes and persistent directional texture.

### Details
The hidden-state rail was derived from the in-model residual row, which allowed it to overlap the model silhouette. A single terminal arrow also made direction hard to scan across a wide canvas.

### Suggested Action
Anchor the forward hidden-state rail to a lane between metric charts and the model top. Add low-contrast repeated chevrons beneath both forward and backward primary paths, with chevron direction matching transport direction and all geometry sharing the model zoom scale.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: hidden-state, activation-gradient, lane-layout, directional-texture, zoom
- See Also: LRN-20260721-008, LRN-20260721-010

### Resolution
- **Resolved**: 2026-07-21T16:53:00+08:00
- **Notes**: Moved the hidden-state rail above the model and added scaled forward/backward chevron textures beneath both tensor-flow paths.

---
## [LRN-20260721-012] correction

**Logged**: 2026-07-21T18:39:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Flow texture must be projected geometry, not a viewport-fixed SVG pattern, and semantic lanes must reserve real whitespace.

### Details
Although the hidden-state rail was moved above the model, its title still overlapped the input-context band because both were packed into the same narrow interval. The chevrons used `patternUnits=userSpaceOnUse`, anchoring repetition to viewport coordinates rather than the projected model path, so panning could produce apparent texture drift. The texture band also had an unnecessary border.

### Suggested Action
Expand the top layout and assign separate y coordinates to metrics, input context, hidden state, embedding, and model top. Generate each chevron as SVG path geometry from the current projected endpoints on every render, and use a borderless low-contrast band.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: overlap, projected-geometry, pan, texture, semantic-lanes
- See Also: LRN-20260721-008, LRN-20260721-011

### Resolution
- **Resolved**: 2026-07-21T18:39:00+08:00
- **Notes**: Expanded the top lanes, projected the two input bands onto dedicated rows, replaced SVG patterns with explicit projected chevron paths, and removed the texture border.

---
## [LRN-20260721-013] correction

**Logged**: 2026-07-21T18:44:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Do not duplicate direction encoding or decorate a topology coordinate axis with categorical color and dot ticks.

### Details
The repeated chevrons already communicated tensor-flow direction, making the large terminal arrowheads visually redundant. The model-depth axis used the backward-flow purple and a circle at every Layer, incorrectly borrowing flow semantics for a neutral topology coordinate.

### Suggested Action
Remove terminal arrowheads from both tensor-flow paths. Render the model-depth axis in neutral gray, keep Layer number labels and alignment guides, and remove the Layer circles.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: redundant-encoding, topology-axis, arrowhead, tick-dot, neutral-color
- See Also: LRN-20260721-005, LRN-20260721-012

### Resolution
- **Resolved**: 2026-07-21T18:44:00+08:00
- **Notes**: Removed both terminal markers, changed the topology axis to neutral gray, and removed all Layer axis circles.

---
## [LRN-20260721-014] correction

**Logged**: 2026-07-21T18:49:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Connection-direction chevrons must belong to graph segments, not merely to the containing rail.

### Details
The chevrons were projected with the rail but still repeated at a generic interval, so they could coincide with Layer dots. A chevron represents the connection between two Layer states and therefore needs to be centered on that exact segment.

### Suggested Action
Use the projected Layer-dot x coordinates as anchors. Generate one direction chevron at `(x_i + x_{i+1}) / 2` for every adjacent pair, and recompute after every render, zoom, pan, or expanded-Layer layout change.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.json
- Tags: chevron, graph-segment, midpoint, layer-dot, projection
- See Also: LRN-20260721-012, LRN-20260721-013

### Resolution
- **Resolved**: 2026-07-21T18:49:00+08:00
- **Notes**: Replaced interval-based chevrons with one midpoint chevron per adjacent projected Layer-dot pair on both forward and backward lanes.

---
## [LRN-20260721-015] correction

**Logged**: 2026-07-21T18:55:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Point details must anchor to point-owned targets, and a label-only topology lane must not retain a decorative horizontal axis.

### Details
Hidden-state dots had no detail metadata, so clicking near a dot selected the full hidden-state path and the inspector anchored to that path's wide bounding box. The neutral horizontal model-depth line remained after its dots and color were removed, even though Layer numbers and vertical guides already supplied the coordinate structure.

### Suggested Action
Remove the horizontal topology line. Give every hidden-state and activation-gradient dot a stable unique detail key and point-specific payload, enable pointer events on those dots, and re-query that stable target when positioning the inspector after render, pan, or zoom.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: inspector-anchor, hidden-state, point-detail, topology-axis, stable-key
- See Also: LRN-20260721-008, LRN-20260721-014

### Resolution
- **Resolved**: 2026-07-21T18:55:00+08:00
- **Notes**: Removed the horizontal topology line and added stable point-owned inspector targets for every hidden-state and activation-gradient dot.

---
## [LRN-20260721-016] best_practice

**Logged**: 2026-07-21T19:03:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Dense projected overlays need a compositor-only drag path instead of full DOM reconstruction on every pointer move.

### Details
The sidecar queried all model nodes and rebuilt hundreds of SVG/DOM annotations on every drag frame. In right view, dragging changes only `panX/panY`, so the expensive projection rebuild was unnecessary and caused visible input latency.

### Suggested Action
Capture the base pan at pointerdown. During drag, apply the pan delta with `translate3d` to existing projected overlays, compensate fixed semantic headers, and move anchored panels by the same delta. On pointerup, perform exactly one full projection rebuild and clear compositor hints.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: performance, drag, compositor, requestAnimationFrame, projection
- See Also: LRN-20260721-008, LRN-20260721-015

### Resolution
- **Resolved**: 2026-07-21T19:03:00+08:00
- **Notes**: Removed full sidecar renders from pointermove, added a pan-delta compositor preview, kept fixed headers compensated, translated anchored panels during drag, and retained one exact rebuild on release.

---
## [LRN-20260721-017] correction

**Logged**: 2026-07-21T19:10:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Repeated PP boundary labels need unique target keys and boundary-specific telemetry payloads.

### Details
All three forward `h S/R` labels shared the same fallback detail key. After a render, the inspector queried the first matching key rather than the clicked boundary, causing visible anchor drift. The fallback payload also contained only a generic sentence and no boundary telemetry.

### Suggested Action
Generate unique keys from direction, boundary Layer, and target type. Attach structured details to both the visible label and communication tick, including source/destination Stage and ranks, tensor identity, activation or gradient statistics, mock P2P latency, anomaly assessment, and step/microbatch context.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.json
- Tags: pp-boundary, stable-key, inspector-anchor, telemetry, communication
- See Also: LRN-20260721-015, LRN-20260721-016

### Resolution
- **Resolved**: 2026-07-21T19:10:00+08:00
- **Notes**: Added unique keys and structured numeric inspector payloads for every forward/backward PP boundary label and tick.

---

## [LRN-20260721-002] correction

**Logged**: 2026-07-21T11:25:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Side-view operator labels must be projected onto their actual operator rows instead of collected in a detached right-side legend.

### Details
The detached legend caused labels to overlap in the Dense/MoE region and broke the visual relationship between a name and the row it describes. A repeated operator across layers should use one band spanning the real projected row extent, with its name centered on that band. Conditional Dense and MoE rows must use their own actual layer ranges.

### Suggested Action
In the training sidecar, disable the base legend through `showSideLabels:false`, read node bounds from the canonical renderer, and add sibling dashed operator bands plus centered labels. Merge labels only when they occupy the same projected row and substantially overlapping horizontal ranges.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css
- Tags: model-architecture, side-view, operator-labels, projection, collision-avoidance

### Resolution
- **Resolved**: 2026-07-21T11:32:00+08:00
- **Notes**: Replaced the sidecar's detached right legend with projected dashed row bands and centered labels, preserved separate Dense/MoE extents, merged only substantially overlapping rows, and verified light/dark plus Layer-focus renders in Chrome.

---

## [LRN-20260721-001] correction

**Logged**: 2026-07-21T00:00:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Training annotations for the model architecture side view must be implemented as a non-destructive sidecar; the canonical side view is an immutable visual baseline.

### Details
The user explicitly required that the already implemented right-view geometry, PP boundary lines, four residual-state rails, Dense/MoE bands, operator labels, input/output links, projection, and colors remain unchanged. New forward/backward, hidden-state, parameter, optimizer, metric, and Layer-focus behavior must be added as sibling overlays that read projected bounds rather than changing the base renderer.

### Suggested Action
Build a separate pattern that attaches SVG/DOM overlays after `PtoModelArchitecture3dDeck.render`. Keep Layer detail extensibility behind a renderer hook. Verify that the base pattern directory has no diff before handoff.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck, patterns/model-architecture-training-sidecar
- Tags: model-architecture, side-view, immutable-baseline, overlay, training-semantics

### Resolution
- **Resolved**: 2026-07-21T11:15:00+08:00
- **Notes**: Added `model-architecture-training-sidecar` as a sibling SVG/DOM overlay with an immutable base renderer dependency, verified the base pattern directory has no diff, and validated default/focused dark and light renders in Chrome.

---

## [LRN-20260717-015] correction

**Logged**: 2026-07-17T17:24:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
提取模型架构 pattern 时，节点取色必须复用当前 `model-graphviz` colormap，并保持与参考图一致的节点语义键，不能另建近似色板。

### Details
3D deck 最初使用了私有颜色（例如粉色 MoE、绿色 Comm），同时把 causal conv、SiLU、Shared Expert、LM Head、MTP 输出等节点归入了错误类别。正确做法是以 OpenPangu Pass IR capsule 的 `NODE_SPEC.colorKey` 和共享 `modelArchitectureColormap()` 为契约：Conv/SiLU/Add 使用 `sem:act`，Shared Expert 使用 `sem:mlp`，LM/MTP Head 使用 `sem:head`，输出与参数保持 IO 语义。

### Suggested Action
模型架构可视化新增视图时，应加载共享 `patterns/model-graphviz/pattern.js` 并从 `modelArchitectureColormap()` 获取语义色；本地 fallback 只能复刻共享键值，且需逐节点核对参考页面的 `colorKey`。

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/pattern.js, patterns/model-architecture-3d-deck/pattern.css, patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, colormap, semantic-color, openpangu, source-parity

### Resolution
- **Resolved**: 2026-07-17T17:24:00+08:00
- **Notes**: 3D deck 已接入共享 modelArchitectureColormap，补齐 semantic/IO 色键并修正错误节点分类；深浅主题均通过同一共享入口更新。

---

## [LRN-20260717-014] correction

**Logged**: 2026-07-17T17:26:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
openPangu CSS 3D 轴测态只有每个 PP stage 的首层保留语义色，重复层必须去色并以 0.08 透明度呈现。

### Details
源页通过 `data-stage-role="first|repeat"` 控制轴测层级：L0、L12、L23、L35 为 PP 首层且 opacity 1；其余层 opacity 0.08，并把 norm/attention/linear/gate/moe/comm/state/residual/hidden 全部映射到 `foreground-muted`。重复层 hover 时才恢复完整语义色与 opacity 1，selected 只提升到 0.28。

### Suggested Action
提取 3D deck 时必须校验 stage emphasis CSS，不得只用 `filter:saturate()` 做近似去色，也不能让 inline custom property 覆盖 repeat-layer 的透明度规则。

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/pattern.css, patterns/model-architecture-3d-deck/pattern.js
- Tags: source-parity, iso-view, pp-stage, opacity, semantic-color

### Resolution
- **Resolved**: 2026-07-17T17:26:00+08:00
- **Notes**: 轴测态已按源规则设置 PP 首层全彩、repeat 层 foreground-muted + 0.08、hover 恢复、selected 0.28。

---

## [LRN-20260717-013] correction

**Logged**: 2026-07-17T17:18:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
提取可视化 pattern 必须保持业务架构语义原样，不能用代表节点重建简化模型；preview 还必须覆盖深浅主题状态。

### Details
本次首次实现保留了 CSS 3D、PP 投影和多视图机制，却把源页每层完整 Sparse MLA、Dense/MoE 分支、mHC state、输入/输出和 MTP 尾部简化成 10 个代表节点，并遗漏主题切换。用户明确指出模型架构被擅自改变。

### Suggested Action
renderer-driven pattern 提取时，除几何和交互外，还要逐项校验源节点 ID、边、分支、层范围和 theme states。对模型架构至少做 source/pattern node-id set equality 检查，禁止用“视觉近似”替代原始语义结构。

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/pattern.js, patterns/model-architecture-3d-deck/pattern.css, patterns/model-architecture-3d-deck/pattern.html
- Tags: pattern-extraction, source-parity, model-architecture, theme, semantic-integrity

### Resolution
- **Resolved**: 2026-07-17T17:18:00+08:00
- **Notes**: 恢复 53 个源页唯一节点 ID、真实 Dense/MoE/DSA/block-post/stage 结构和 MTP 尾部，并加入深浅模式按钮、URL theme 与 preview message 同步。

---

## [LRN-20260717-012] correction

**Logged**: 2026-07-17T17:06:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: tests

### Summary
PTO 本地页面预览必须直接拉起 Google Chrome，不要使用 in-app browser。

### Details
用户已多次明确要求本地 HTML / localhost 预览直接通过静态服务和 Google Chrome 打开。本次仍错误调用了 in-app browser，造成无意义的 backend discovery 和错误日志，并且没有把页面呈现给用户。

### Suggested Action
需要预览 PTO 本地页面时，直接启动或复用本地 HTTP server，然后执行 `open -a "Google Chrome" <localhost-url>`。不要调用 Browser skill、in-app browser runtime 或 backend discovery，除非用户以后明确要求使用 in-app browser。

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-3d-deck/pattern.html
- Tags: chrome, local-preview, browser, workflow, repeated-correction

### Resolution
- **Resolved**: 2026-07-17T17:06:00+08:00
- **Notes**: 立即改为启动本地静态服务并用 Google Chrome 打开新 pattern 页面。

---

## [LRN-20260717-011] correction

**Logged**: 2026-07-17T16:41:00+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Cluster metadata tags should be weak in color but still large enough to read as intentional UI.

### Details
After removing the repeat tag border, I made the tag too short at 18px. The user corrected that this looks poor and the tag should be at least 32px tall. The issue was over-compressing the component while reducing emphasis.

### Suggested Action
When demoting metadata visual emphasis, reduce border/contrast before reducing component height. Keep architecture metadata tags around 32px high with muted colors and no border.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, repeat-tag, tag-height, typography, correction

---

## [LRN-20260717-010] correction

**Logged**: 2026-07-17T16:35:00+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Repeat/range tags inside model architecture clusters should be weak metadata, not strong bordered pills.

### Details
The user pointed out that the decoder range tag looked ugly: it had a prominent bordered capsule treatment and awkward proportions under a large cluster title. This made secondary metadata compete with the cluster title and primary nodes.

### Suggested Action
Style cluster repeat/range tags as low-emphasis labels: no border, muted text, subtle transparent fill, compact height, and width fitted closely to the text.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, repeat-tag, hierarchy, typography, correction

---

## [LRN-20260717-009] correction

**Logged**: 2026-07-17T16:28:00+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Horizontal model architecture fold should keep the decoder frame expanded while folding only deep internals.

### Details
The user clarified that “fold” in the horizontal OpenPangu layout should not collapse `Decoder Layers` into a single capsule. The desired default is an expanded decoder-layer frame with mid-level architecture modules inside, while deeper vertical drill-down details such as Q/KV projection internals stay folded.

### Suggested Action
When adding layout-specific folded defaults, distinguish container expansion from child-detail expansion. For horizontal architecture views, preserve major repeated-block frames and fold only deeper submodules or implementation-level ops.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, horizontal-layout, decoder-frame, folded-default, correction

---

## [LRN-20260717-008] correction

**Logged**: 2026-07-17T16:18:54+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Horizontal model-architecture views should default to high-level folded granularity and use tighter node widths.

### Details
The user corrected that the horizontal OpenPangu architecture view was too sparse because it expanded the decoder-layer internals and kept vertical-layout operator widths. For a horizontal model-architecture view, the default should show common architecture-level units such as decoder layers, not every drill-down op inside the decoder. UI cluster titles should use architecture language like `Decoder Layers`, not implementation/schema terms like `Template`.

### Suggested Action
For layout toggles in ModelViz, keep per-layout defaults: vertical can show detailed internals, while horizontal should initially fold decoder internals and compress op capsule widths independently. Avoid exposing source/schema implementation names in visual titles when a clearer architecture label exists.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, horizontal-layout, folded-default, capsule-width, cluster-title, correction

---

## [LRN-20260521-001] correction

**Logged**: 2026-05-21T11:58:00+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Design-system theme requests must be implemented in shared token/component sources, not only in the preview page.

### Details
The user asked to add a glass mode for the design system. I first added a `glass` mode directly to `design-system-preview.html`, which made the preview page look correct but did not make the component design system itself support `data-theme="glass"`.

### Suggested Action
When adding a theme, update `tokens/semantic.css`, `tokens/components.css`, token generation, and only then wire the preview page as a consumer.

### Metadata
- Source: user_feedback
- Related Files: design-system-preview.html, tokens/semantic.css, tokens/components.css
- Tags: design-system, theme, glass

---

## [LRN-20260717-007] correction

**Logged**: 2026-07-17T16:01:08+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Pass-IR capsule expand controls must reserve layout space instead of overlapping the type label.

### Details
The user showed that the ModelViz overlay expand icon covered the capsule's right-side type text such as `Module`. The icon was positioned over the same right-end area used by `.op-pill-latency`, and changing icon styling alone would not fix the collision.

### Suggested Action
When adding overlay controls on Pass-IR capsules, reserve right-side padding or otherwise exclude the control area from text layout. Use a simple transparent-black control fill with white glyphs and no circular border when the control sits on top of a colored capsule.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, pass-ir, capsule-node, expand-control, overlap, correction

---

## [LRN-20260717-006] correction

**Logged**: 2026-07-17T15:53:38+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Light-mode op color sliders must normalize perceived luminance across hues, not raw HSL lightness.

### Details
The user showed that blue-purple and cyan-green op capsules still looked very different when converted to grayscale. The cause is that HSL `lightness` is not perceptual luminance: at the same HSL lightness, cyan/green has much higher relative luminance than blue/purple. Direct HSL slider values make cross-hue capsule brightness inconsistent.

### Suggested Action
For semantic color controls that need comparable visual weight across hues, derive the final color by targeting relative luminance and solve per-hue HSL lightness from that target. Keep hue/saturation controls as palette controls, but make brightness controls operate on perceived luminance.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, pass-ir, light-mode, color-panel, luminance, grayscale, correction

---

## [LRN-20260717-005] correction

**Logged**: 2026-07-17T15:42:25+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Pass-IR capsule op gradients in the ModelViz light variant should stay vertical.

### Details
The user corrected that changing the light op capsule gradient to a diagonal direction was wrong. The color controls should affect the gradient colors only; the capsule gradient direction should remain top-to-bottom.

### Suggested Action
Use `linear-gradient(180deg, top, bottom)` for light-mode Pass-IR op capsules and their color-panel swatches. Do not change gradient direction while tuning the palette.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, pass-ir, light-mode, gradient-direction, correction

---

## [LRN-20260717-004] correction

**Logged**: 2026-07-17T15:39:01+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Light-mode color controls for the Pass-IR capsule ModelViz variant should drive op capsule backgrounds directly, while tensor nodes stay neutral gray.

### Details
The user clarified that tensor nodes in light mode should remain gray fills, and that the light color sliders were not controlling the op node background as expected. The prior implementation colored tensors from semantic HSL and derived capsule color from the renderer's already-transformed rect fill, which made the control path indirect.

### Suggested Action
For this variant, keep `.is-tensor` light fills neutral gray without borders. Compute op capsule gradients directly from `node.colorKey` plus the current light HSL controls, and make the panel swatches use the same capsule palette function.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, light-mode, color-panel, op-capsule, tensor-fill, correction

---

## [LRN-20260717-003] correction

**Logged**: 2026-07-17T15:25:41+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
ModelViz light-mode colors must not be lightened twice, and capsule text contrast must be derived from the rendered color.

### Details
The user showed that with light-mode HSL around hue `-12`, saturation `83%`, and lightness `58%`, green capsules became too pale and their white labels were unreadable. The cause was a two-step lightening path: the graph renderer first produced a light HSL accent, then the Pass-IR capsule CSS mixed that already-light accent with white.

### Suggested Action
For light-mode capsule variants, generate the pill gradient from the active accent with controlled HSL lightness instead of additional white mixing, and set text/muted/icon contrast from the final palette. Tensor gradients should use colored same-hue saturation gradients, not neutral gray fallbacks.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, light-mode, capsule-node, contrast, tensor-gradient, correction

---

## [LRN-20260717-002] correction

**Logged**: 2026-07-17T15:09:11+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
Do not place essential preview controls only in a topbar when the page defaults to embedded mode.

### Details
The user did not see the light-mode color panel because the OpenPangu ModelViz preview defaults to `data-embed="1"`, which hides `.opv-topbar`. The only obvious `Light Color` trigger was in that hidden topbar, while the panel depended on query-parameter auto-open behavior.

### Suggested Action
For ModelViz preview controls that must be reachable in embed mode, provide a floating control alongside the existing floating theme button and make critical panels open automatically for their active mode. Do not rely solely on hidden topbar controls or URL parameters.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, embed-mode, preview-controls, light-mode, color-panel, correction

---

## [LRN-20260717-001] correction

**Logged**: 2026-07-17T14:44:20+08:00
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
When compacting Pass-IR capsule nodes in ModelViz, do not scale the node frame and its icon/text proportionally.

### Details
The user clarified that the capsule node felt too large because the surrounding pill frame dominated while the icon and label looked too small by comparison. The correct adjustment is to reduce the node's frame/empty space while preserving or increasing the internal icon and typography scale.

### Suggested Action
For `model-graphviz` variants using `pass-ir-graph-node` capsules, tune frame width/height independently from `.op-pill-icon`, `.op-pill-name`, and `.op-pill-latency`. Validate perceived proportions from a rendered preview, not only from numeric scale factors.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_pass_ir_capsule_modelviz.html
- Tags: model-graphviz, pass-ir, capsule-node, typography, icon-scale, correction

---

## [LRN-20260707-004] correction

**Logged**: 2026-07-07T15:05:00+08:00
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
Long model graph fixes must verify the exact reported viewport region, not only the graph's first screen.

### Details
The user reported overlap in the openPangu-2.0-Flash FFN/MoE region and uneven DeepSeek side tensor routing. A first direct screenshot only captured the top attention area, which would have missed the reported Flash overlap. The correct validation needed a taller viewport covering the FFN/MoE section and a rendered DeepSeek screenshot that shows parameter/state side inputs.

### Suggested Action
When fixing PTO model-graphviz layouts, render screenshots that include the user's reported region. For side Parameter/Weight and State/Cache tensors, set explicit left/right anchors and `curve: straight` for same-row inputs, and keep enough lane spacing so tensor rectangles do not overlap adjacent op/module nodes.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/pattern.js, patterns/model-graphviz/assets/openpangu_2_0_flash_modelviz.html, patterns/model-graphviz/assets/deepseek_v32_gallery_modelviz.html
- Tags: design-system, model-graphviz, layout-validation, edge-routing

---

## [LRN-20260707-003] correction

**Logged**: 2026-07-07T14:24:00+08:00
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
Model architecture gallery tabs must use one shared renderer contract, not mixed legacy pages.

### Details
The user pointed out that the model architecture tabs still looked inconsistent after partial alignment. The root issue was that DeepSeek still used a legacy Graphviz/D3 page while Qwen, openPangu, and Pangu MoE used shared-renderer pages, and some model pages carried their own light-mode typography, fit strategy, or Parameter/Weight placement. Gallery visual parity requires checking every tab as a rendered asset, not only adjusting shared CSS.

### Suggested Action
For PTO model-architecture gallery work, route each tab through a shared-renderer asset page or a thin adapter page. Verify dark and light screenshots for every visible model. Enforce openPangu-2.0-Flash style rules across models: transparent expanded parent clusters, true neutral Parameter/Weight fills, Parameter/Weight inputs on the left lane, State/Cache auxiliaries on the right lane, no light-only font-size jumps, and a readable fit floor.

### Metadata
- Source: user_feedback
- Related Files: design-system-preview.html, patterns/model-graphviz/assets/deepseek_v32_gallery_modelviz.html, patterns/model-graphviz/assets/qwen7b_modelviz.html, patterns/model-graphviz/assets/pangu_moe_modelviz.html
- Tags: design-system, model-graphviz, gallery-parity, rendered-pattern

---

## [LRN-20260521-002] correction

**Logged**: 2026-05-21T12:10:00+08:00
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
Liquid Glass themes should not turn large content surfaces into glass.

### Details
The user clarified that the PTO IDE Frame Pattern looked wrong because the glass skin was applied too broadly. Apple HIG treats Liquid Glass as a functional layer for controls and navigation, not as a content-layer material. PTO should reserve glass for tabs, buttons, selected states, floating controls, search fields, and small interactive chrome while keeping panes, code surfaces, canvases, and large content regions stable.

### Suggested Action
Keep `data-theme="glass"` token overrides conservative by default. Use corner-only ambient page backgrounds and apply glass variables only to functional controls or floating UI.

### Metadata
- Source: user_feedback
- Related Files: tokens/semantic.css, tokens/components.css, patterns/ide-frame/pattern.css
- Tags: design-system, liquid-glass, ide-frame

---

## [LRN-20260707-001] correction

**Logged**: 2026-07-07T05:42:30Z
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
Rendered model graph layout changes must be verified against the actual served SVG, not only the source files.

### Details
The user reported "no change" after model-graphviz layout edits. The source files and served HTML had changed, but the user's browser view could still show an old tab, cached iframe, or a different entry. For renderer-driven PTO graph patterns, source inspection is insufficient; verify with the real URL, a cache-busted entry, and a screenshot or rendered DOM that shows node placement.

### Suggested Action
After changing model-graphviz layouts, fetch the served URL, inspect rendered node positions or screenshot the direct graph page, then open a cache-busted URL for the user. Keep semantic layout constraints explicit: Parameter/Weight inputs on the left lane, State/Cache auxiliary nodes on the right lane.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_modelviz.html, patterns/model-graphviz/assets/pangu_moe_modelviz.html, patterns/model-graphviz/pattern.json
- Tags: design-system, model-graphviz, rendered-pattern, cache

---

## [LRN-20260707-002] correction

**Logged**: 2026-07-07T14:02:02+08:00
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
Standalone rendered-pattern previews must use the current shared renderer style, not stale product demo geometry.

### Details
The user reported that `patterns/model-training-graphviz/pattern.html` was completely wrong. The file still presented an old Qwen7B training demo with stale topbar copy, oversized/old tensor styling, and a graph silhouette that did not match the current openPangu/model-architecture gallery. Because this pattern is hybrid/rendered, correcting only CSS would not fix the semantic layout; the preview data, phase map, renderer call, and pattern contract all needed to be realigned.

### Suggested Action
When a PTO graph pattern preview looks wrong, verify whether the preview is carrying old demo data. For model-training-graphviz, keep it as a thin wrapper over model-graphviz, use `modelArchitectureColormap()`, keep Parameter/Weight tensors on the left lane, State/Cache tensors on the right lane, and screenshot both dark and light file URLs after edits.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-training-graphviz/pattern.html, patterns/model-training-graphviz/pattern.css, patterns/model-training-graphviz/pattern.json
- Tags: design-system, model-training-graphviz, rendered-pattern, preview-parity

---

## [LRN-20260710-001] correction

**Logged**: 2026-07-10T10:58:00+08:00
**Priority**: critical
**Status**: pending
**Area**: frontend

### Summary
Model graph changes must be previewed for user confirmation before pushing unless push is explicitly requested for the current task.

### Details
The user corrected that the requested workflow was to finish the architecture graph update and provide a preview, not to push immediately. A previous "push after update" instruction from an older task was incorrectly carried forward into a new turn.

### Suggested Action
For PTO model-graphviz work, stop after local validation and open or provide a direct preview URL. Do not run `git push` unless the current user request explicitly asks for a push.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_modelviz.html
- Tags: workflow, preview-first, git-push, model-graphviz

---

## [LRN-20260710-002] correction

**Logged**: 2026-07-10T11:14:00+08:00
**Priority**: high
**Status**: pending
**Area**: frontend

### Summary
Do not disable shared model-graphviz click and hover behavior when removing page-local interaction drift.

### Details
The user clarified that fixing inconsistent OpenPangu Flash interactions should follow `/Users/yin/skills/modelviz_skill`: render through `PtoModelGraphvizPattern.renderController` while preserving `interaction: { panZoom: true, selectable: true, selectableClusters: false }`. Removing page-local popovers is acceptable, but turning off selectable/related highlight removes expected click/hover behavior.

### Suggested Action
When aligning model graph pages to `modelviz_skill`, remove duplicate wrappers or stale custom inspectors, but keep the shared renderer interaction model active. Validate by checking rendered selected classes and previewing click/hover behavior before handoff.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_modelviz.html, /Users/yin/skills/modelviz_skill/SKILL.md
- Tags: model-graphviz, interaction, hover, selectable, modelviz-skill

---

## [LRN-20260716-001] correction

**Logged**: 2026-07-16T17:08:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Training-cross expansion must open one embedded Decoder Layer inline to L2, not navigate to or substitute the complete model graph.

### Details
The first implementation treated the Decoder/Activation center as a link to a separate full-model view. The user clarified that the cross must remain the stable parent context: its center is one folded `Decoder Layer` at L1, and the plus control expands only that layer's direct L2 children in place. Attention and FFN stay folded at L2; QKV, router, expert, LM-head, and other deeper/full-model nodes do not appear automatically.

### Suggested Action
For hierarchical ModelViz drill-down, define the expansion boundary before reusing another graph: preserve the parent canvas, replace only the selected folded Module with its immediate children, keep deeper Modules folded, and preserve the clicked Module's viewport anchor.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_training_overlay_modelviz.html, patterns/model-graphviz/pattern.json
- Tags: model-graphviz, training-cross, inline-expansion, decoder-layer, l1-l2, hierarchy

### Resolution
- **Resolved**: 2026-07-16T17:08:00+08:00
- **Notes**: Replaced the full-model view switch with an inline Decoder Layer L1/L2 state, derived the L2 cluster from visible direct-child bounds, kept Attention and FFN folded, and verified L1, L2, and parameterized-Module overlay renders in Chrome.

---

## [LRN-20260716-002] correction

**Logged**: 2026-07-16T17:15:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Training-cross layouts must reserve both outer-canvas inset and explicit edge-tag clearance between adjacent horizontal nodes.

### Details
The user screenshot showed `Model State` clipped because its left bound was negative, while the `STATE` tag overlapped both neighboring pills because only 25 graph units were available between their boundaries. Renderer-side tag avoidance cannot compensate for an edge segment that is physically shorter than its tag.

### Suggested Action
Validate node bounds, not only node centers. Keep outer nodes at least 36–60 graph units inside the canvas and reserve roughly 80–100 graph units between horizontal pill boundaries when an edge carries a visible tag.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-graphviz/assets/openpangu_2_0_flash_training_overlay_modelviz.html
- Tags: model-graphviz, clipping, edge-tags, spacing, training-cross
- See Also: LRN-20260707-004

### Resolution
- **Resolved**: 2026-07-16T17:15:00+08:00
- **Notes**: Repositioned and narrowed the full training-update span, moved the Decoder column and residual bypass together, and verified the corrected default L1 render in Chrome.

---
## [LRN-20260721-003] correction

**Logged**: 2026-07-21T11:47:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Side-view annotation overlays must cover static input/output operators, avoid summary-label collisions, and keep hover targets stable.

### Details
The projected Layer-row labels did not include the static model input/output graphs, the Pre-MLP row could overlap the canonical Dense/MoE summary, and scheduling a full overlay render on every pointer move replaced the hovered DOM node before its tooltip could remain visible. The canvas also inherited a permanent `grab` cursor although drag feedback is only appropriate while pressed.

### Suggested Action
Project static input/output nodes into the same band system, search horizontal label positions against canonical summary bounds, render Stage/axis/metric labels on separate vertical tracks, and only refresh geometry during an active drag. Use the default cursor at rest and `grabbing` only while the viewport owns a pressed drag.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css
- Tags: side-view, operator-labels, tooltip, hover, cursor, redraw, collision-avoidance
- See Also: LRN-20260721-002

### Resolution
- **Resolved**: 2026-07-21T11:47:00+08:00
- **Notes**: Added projected input/output operator bands, consistent hover tips, separated top annotation tracks, horizontal summary-label avoidance, and drag-only overlay refresh/cursor feedback.

---
## [LRN-20260721-004] correction

**Logged**: 2026-07-21T14:00:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Dense model-training annotations should expand the canvas instead of compressing independent semantic tracks into a fixed-height viewport.

### Details
The first sidecar layout kept a 950px canvas and fit the entire right-view model into that height. Stage headers, topology, metric strips, samples, input operators, hidden state, and PP badges consequently occupied a narrow top band even though the pattern page can scroll and grow vertically.

### Suggested Action
Give dense training views an explicit tall-canvas contract. Reserve top and bottom semantic lanes in the fit calculation, preserve the base model scale, and place Stage, topology, metrics, samples, input, and hidden state on separate vertical tracks.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.html, patterns/model-architecture-training-sidecar/pattern.js, design-system-preview.html
- Tags: canvas, layout, semantic-lanes, fit, whitespace, side-view
- See Also: LRN-20260721-003

### Resolution
- **Resolved**: 2026-07-21T14:00:00+08:00
- **Notes**: Expanded the standalone and embedded canvas to 1400px, added 260px/130px top and bottom fit reserves, and separated the top annotation tracks without changing the canonical base pattern.

---
## [LRN-20260721-005] correction

**Logged**: 2026-07-21T14:04:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
A model-depth Layer axis is a coordinate system, not a directed-flow arrow.

### Details
The sidecar initially reused a forward arrow marker on the `MODEL DEPTH / TOPOLOGY` axis. The user clarified that this axis should identify Layer numbers and provide vertical cross-chart alignment, while forward direction is already represented by the hidden-state flow.

### Suggested Action
Render the topology axis as a plain baseline with `L0–L45` ticks. Project each Layer tick downward through the chart using faint gray dashed guides; reserve arrows for actual tensor or gradient flow.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css
- Tags: layer-axis, topology, grid, arrow-semantics, alignment
- See Also: LRN-20260721-004

### Resolution
- **Resolved**: 2026-07-21T14:04:00+08:00
- **Notes**: Removed the topology arrow, added every Layer number, and projected 46 faint dashed alignment guides from the axis through the parameter region.

---
## [LRN-20260721-006] correction

**Logged**: 2026-07-21T14:08:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
PP boundaries must span more semantic lanes and carry higher hierarchy than per-Layer alignment guides.

### Details
Layer guides were extended through the chart, but the PP boundaries still relied on the canonical model-local green lines and short Send/Recv ticks. This made Stage boundaries visually shorter than the lower-level Layer grid.

### Suggested Action
Add sidecar PP boundary guides at each Stage split. Start them above Stage labels, extend them past the optimizer lane, and use a stronger green stroke while keeping Layer guides faint gray.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css
- Tags: pipeline-parallel, stage-boundary, visual-hierarchy, layer-grid
- See Also: LRN-20260721-005

### Resolution
- **Resolved**: 2026-07-21T14:08:00+08:00
- **Notes**: Added three full-height green PP guides from above the Stage lane through the optimizer region, including hover explanations.

---
## [LRN-20260721-007] correction

**Logged**: 2026-07-21T14:24:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Dense training overlays need collision-free lanes, theme-safe text contrast, and one shared click-detail contract for every annotation.

### Details
The L45 sample collided with Main Loss, forward Send/Recv text was too light on the light theme, and hover tips alone were insufficient for interpreting training metrics or operator annotations.

### Suggested Action
Reserve distinct rows for sampled metrics, loss, and hidden-state flow; derive cyan label colors by mixing more foreground in light mode; and make all tooltip-bearing overlay nodes open a shared inspector. Metric details must explain the definition, value, reference range, anomaly result, provenance, and execution context.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css
- Tags: inspector, metric-definition, anomaly, collision, contrast, interaction
- See Also: LRN-20260721-003, LRN-20260721-004

### Resolution
- **Resolved**: 2026-07-21T14:24:00+08:00
- **Notes**: Added the shared click inspector, structured metric assessments, operator details, parameter-gradient details, collision-free loss placement, and stronger light-theme forward labels.

---
## [LRN-20260721-008] correction

**Logged**: 2026-07-21T14:36:00+08:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Projected annotation geometry and content must share the model zoom ratio, while inspectors must re-anchor to their selected object.

### Details
The sidecar recomputed annotation positions from projected model bounds but retained fixed pixel offsets, font sizes, strokes, dots, and lane spacing. During canvas zoom, the network scaled while annotation content did not, producing visible drift. The click inspector was also fixed to the viewport corner instead of following its source object.

### Suggested Action
Record the fitted model zoom as the overlay baseline. Multiply every model-relative annotation offset and visual dimension by `currentZoom / fitZoom`, and avoid viewport clamps that distort proportional geometry. Give every detail target a stable key and reposition the fixed-size inspector from the target's current projected bounds after render, pan, and zoom.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.js, patterns/model-architecture-training-sidecar/pattern.css
- Tags: zoom, projection, drift, inspector-anchor, coordinate-system
- See Also: LRN-20260721-003, LRN-20260721-007

### Resolution
- **Resolved**: 2026-07-21T14:36:00+08:00
- **Notes**: Unified lane offsets, labels, strokes, metric cells, dots, hit regions, and selections under one zoom ratio; added stable detail keys and object-following inspector positioning.

---
## [LRN-20260721-009] correction

**Logged**: 2026-07-21T15:32:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
A sidecar must remove duplicate semantic labels when its overlay already provides the canonical label lane.

### Details
The training overlay added full-width PP Stage labels above the topology axis while retaining the base deck's in-model PP0-PP3 pills. The duplicate pills occupied the same visual lane as the input and hidden-state annotations and caused overlap without adding information.

### Suggested Action
In the training sidecar's right-view PP composition, hide only the redundant base PP pills. Preserve the top Stage labels, full-height PP boundaries, and Send/Recv communication annotations, and do not modify the base pattern source.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.json
- Tags: pipeline-parallel, deduplication, annotation-collision, sidecar-scope
- See Also: LRN-20260721-006, LRN-20260721-007

### Resolution
- **Resolved**: 2026-07-21T15:32:00+08:00
- **Notes**: Added a sidecar-scoped right-view/PP selector that suppresses only the redundant in-model PP pills.

---

## [LRN-20260722-002] correction

**Logged**: 2026-07-22T15:05:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Expanded Layer telemetry must remain legible at the fitted canvas scale, and residual addition must use the conventional circled plus symbol instead of relying only on a label or faint accent color.

### Details
The initial in-place Layer panel preserved compact geometry but its operator labels and telemetry chips were too small at normal fit. Residual identity and Add values also mixed too heavily toward secondary gray, obscuring the main residual data path.

### Suggested Action
Validate expanded panels at the real fitted scale, give semantic data paths sufficient contrast, and render every true Residual Add row with an explicit circular plus marker. Do not apply the marker to generic merge operators unless their semantics are confirmed to be addition.

### Metadata
- Source: user_feedback
- Related Files: patterns/model-architecture-training-sidecar/pattern.css, patterns/model-architecture-training-sidecar/pattern.js
- Tags: typography, contrast, residual-add, semantic-symbol

### Resolution
- **Resolved**: 2026-07-22T15:05:00+08:00
- **Notes**: Increased the expanded panel typography, strengthened residual labels and telemetry values, and added a high-contrast circled plus to Residual Add and Routed + Shared Add rows.

---
