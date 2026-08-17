# Tensor Title 使用说明

`tensor-title` 是放在 Tensor / Matrix / Volume / Tiling 视图上方的共享标题条。它把当前 demo 里散落的名称、shape、dtype、format、memory、owner、partition、state、provenance、step、axes 和约束统一成结构化字段，再由共享 renderer 渲染。

它和 `matrix-canvas`、`tensor-volume-canvas` 同属 `tensor-visualization` Pattern 家族：

- 二维矩阵和三维体素仍然由 `matrix-canvas` / `tensor-volume-canvas` 负责。
- `tensor-title` 只负责标题条本身，不承担矩阵几何、体素投影、业务选择或播放逻辑。

## 基本用法

### 1. 加载样式和脚本

```html
<link rel="stylesheet" href="pto-design-system/tokens/foundation.css">
<link rel="stylesheet" href="pto-design-system/tokens/semantic.css">
<link rel="stylesheet" href="pto-design-system/tokens/components.css">
<link rel="stylesheet" href="pto-design-system/patterns/tensor-title/pattern.css">

<script src="pto-design-system/patterns/tensor-title/pattern.js"></script>
```

### 2. 添加标题宿主

标题宿主可以是任何有明确宽度的 div，通常放在 canvas 或矩阵视图上方。

```html
<div id="tensorTitle"></div>
<div id="tensorCanvas"></div>
```

### 3. 渲染标题

```js
const controller = window.PtoTensorTitle.render(
  document.getElementById('tensorTitle'),
  {
    label: 'xLocal',
    role: 'input',
    logicalShape: { label: '1D logical', dims: [16384] },
    physicalShape: { label: 'GM linear', dims: [16384] },
    tileShape: { label: 'tile', dims: [128] },
    dtype: 'float32',
    format: 'ND',
    axes: ['GM element offset'],
    memory: { tier: 'GM', sizeBytes: 65536, offset: 0, alignment: 32 },
    owner: 'xGm',
    partition: { blockCount: 8, blockLength: 2048, tileLength: 128, blockIndex: 0, tileIndex: 1 },
    state: 'loading',
    direction: 'GM → UB',
    provenance: { symbol: 'xGm', file: 'add_custom.asc', line: 72, evidence: '代码确认' },
    step: { phase: 'CopyIn', operationChips: ['DataCopy', 'EnQue'], stepIndex: 1, totalSteps: 16 },
    constraints: ['32B aligned', 'no tail'],
    status: 'block 0 · tile 1/16',
  }
);
```

## Scene 配置

### 必需字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `label` | string | 主 tensor 名称或变量符号 |

### 可选字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | string | 语义角色：`input`、`output`、`weight`、`bias`、`scratch`、`temp`、`reduction`、`fusion`、`broadcast`、`aggregate` |
| `logicalShape` | string 或 `{ label, dims }` | 逻辑 shape，例如 NCHW `[1,4,16,16]` |
| `physicalShape` | string 或 `{ label, dims }` | 物理布局 shape，例如 NC1HWC0、A1、A2 |
| `tileShape` | string 或 `{ label, dims }` | 当前 tile 或 base tile shape |
| `dtype` | string | dtype 或 dtype 链，例如 `half → float → half` |
| `format` | string | format / layout 标识 |
| `axes` | string[] | 坐标轴标签 |
| `memory` | object | `{ tier, sizeBytes, offset, range, stride, alignment }` |
| `owner` | string | 队列、分配器或 owning object |
| `queueDepth` | number | queue slot depth |
| `partition` | object | `{ blockCount, blockLength, tileLength, blockIndex, tileIndex, tileRange }` |
| `state` | string | 生命周期状态，例如 `loading`、`loaded`、`enqueued`、`current`、`produced`、`free` |
| `direction` | string | 数据搬运方向，例如 `GM → UB` |
| `provenance` | object | `{ symbol, file, line, evidence }` |
| `step` | object | `{ phase, operationChips, stepIndex, totalSteps }` |
| `constraints` | string[] | 约束说明，例如 `32B aligned`、`no tail`、`padding`、`broadcast` |
| `status` | string | 右侧实时状态文字 |

## Options 可配置项

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `ariaLabel` | string | `label` | 无障碍标题 |
| `density` | `full` / `compact` | `full` | compact 隐藏 chips / footer |
| `showRole` | boolean | `true` | 是否显示 role badge |
| `showShapes` | boolean | `true` | 是否显示 shape 组 |
| `showChips` | boolean | `true` | 是否显示 chips 组 |
| `showStatus` | boolean | `true` | 是否显示右侧 status |

## 更新和销毁

```js
// 更新场景
controller.update(nextScene);

// 同时更新场景和配置
controller.update(nextScene, {
  density: 'compact',
  showChips: false,
});

// 页面卸载或不再使用时销毁
controller.destroy();
```

## 标题条结构

标题条按五组渲染：

| 组 | 内容 |
|---|---|
| primary | `label`、`role`、`direction` |
| meta | `logicalShape`、`physicalShape`、`tileShape`、`dtype`、`format`、`axes` |
| chips | memory、owner / queueDepth、partition、state、operation chips |
| footer | constraints、provenance |
| status | `status` 或 step 摘要，右对齐 |

## 使用限制

- 不要复制或修改 Pattern 内部的标题 DOM、字段归一化、字节格式化或转义逻辑。
- 不要给标题条再套卡片、边框、页头装饰或 private header band。
- shape、format、memory、state、tiling 和 provenance 事实由业务页面传入，Pattern 不做推导。
- 不要通过 iframe 使用，应直接加载 `pattern.css` 和 `pattern.js`。
- 业务选择、播放、Load3D、Conv、Tiling 和格式规则应在业务页面中转换成字段数据。
- Pattern 只负责标题条，不包含工具栏、Inspector、卡片或播放控件。
