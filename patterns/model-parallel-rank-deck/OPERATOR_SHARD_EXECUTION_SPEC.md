# Rank Operator-Shard Execution Graph 改造 Spec

Status: Proposed  
Target pattern: `patterns/model-parallel-rank-deck`  
Canonical model source: `../model-architecture-3d-deck/pattern.js`  
Existing renderer contract: `./THREEJS_RANK_PACKING_SPEC.md`  
Default topology source level: `demo`

## 1. 决策摘要

当前页面以 `Layer placement` 作为 Rank 内模型载荷的最小单位。改造后：

- `Layer` 只承担模型结构分组和 PP stage 范围语义；
- `OperatorShard` 是 Rank 静态计算载荷的最小单位；
- `OperatorInvocation` 是 microbatch、forward/backward 时间线中的最小执行单位；
- `CommunicationEvent` 是跨 Rank 依赖的一等事件，不再用无方向的 Rank 中心连线代替；
- 原始 Layer 的 Node、Cluster、Edge、标签、样式和几何仍是唯一视觉源，不允许创建缩略图、替代算子或另一套简化模型。

旧约束“每个 Rank 内必须渲染完整 Layer payload”在本 Spec 中被重新解释为：

> 每个被 PP 分配的 Layer 必须完整保留在 `ModelSceneSpec` 和结构上下文中，但只有经 ownership planner 判定为该 Rank 实际执行或持有的 `OperatorShard` 才能计入 Rank 的计算载荷并以实色显示。

`RankManifest.layerSegments` 保留，但只表示 PP stage ownership，不再表示 Rank 独立执行完整 Layer。

## 2. 产品目标

用户进入任意 Rank 后，必须能够回答以下问题：

1. 这个 Rank 属于哪个 PP、TP、EP、CP、EDP 坐标？
2. 它负责哪些逻辑 Layer？
3. 每个 Layer 中哪些原始算子由它实际执行？
4. 对于分片算子，它持有的是哪一片 Tensor、Head、Channel 或 Expert？
5. 哪些算子只是结构上下文，并不代表本 Rank 的本地完整计算？
6. 执行到哪个算子时需要与哪些 Rank 通信？
7. 一次 microbatch 如何从 PP0 前向流到 PP3，并在 backward 中反向返回？
8. 当前显示的是拓扑推导、产品 demo，还是来自真实运行 trace？

改造后的主叙事应从“模型 Layer 被塞进 Rank”变为：

> Rank 是一个执行容器，内部展示由原始模型算子编译得到的本地 OperatorShard Graph。

## 3. 非目标

首期不承诺：

- 在没有 trace 的情况下还原真实 CUDA kernel、kernel fusion 或 kernel launch 时间；
- 在没有硬件拓扑和 NCCL 运行元数据时推断真实 Ring、Tree、NVLS、InfiniBand 或 NVLink 路径；
- 用估算数据冒充真实 Tensor shape、通信 count、字节数或耗时；
- 将 128 Rank demo mapping 描述为 openPangu 官方训练部署拓扑；
- 通过删除原始节点、合并算子、生成代表性 Layer 或截图纹理来换取性能；
- 首期实现动态 MoE token 数的真实性；没有 trace 时只能显示路由语义和配置上限。

## 4. 术语

### 4.1 SourceOperator

由 `PtoModelArchitecture3dDeck.renderLayerScene` 生成的原始 Node。其 ID、label、op kind、几何、样式和源顺序不可变。

### 4.2 LogicalLayer

模型定义中的 L0–L45。它是结构分组和 PP partition 的单位，不是 Rank 计算载荷的最小单位。

### 4.3 LayerScaffold

某个 Rank 中用于保留原始 Layer 上下文的完整结构记录。它可在视觉上淡化，但不得从 `SceneIndex` 删除，也不得被计入本 Rank 的实算 Operator 数量。

### 4.4 OperatorShard

一个 SourceOperator 在具体 Rank 上的本地所有权实例。它必须明确说明：

- logical node；
- Rank 和 Layer；
- ownership kind；
- parallel axis 与 shard index；
- 已知或符号化的 input、weight、output slice；
- source level；
- 本地前驱、后继与跨 Rank 依赖。

### 4.5 OperatorInvocation

一个 OperatorShard 在指定 iteration、microbatch、pass 和 schedule slot 中的一次执行。静态架构模式不要求生成 Invocation；执行回放模式必须生成。

### 4.6 RankProgram

一个 Rank 的全部 OperatorShard、本地依赖、通信端点和 PP 输入/输出边界构成的静态执行程序。

### 4.7 CommunicationEvent

位于两个或多个 OperatorShard 之间的通信语义事件，包括 collective 和 P2P。它不是普通模型 Edge，也不是装饰性连线。

## 5. 证据等级

每条 ownership、slice、schedule 和 communication 数据必须带 `sourceLevel`：

| sourceLevel | 含义 | UI 标记 |
| --- | --- | --- |
| `official` | 来自锁定模型源码或官方配置 | 模型源信息 |
| `configured` | 消费方明确传入的训练配置 | 训练配置 |
| `derived` | 可由确定配置唯一推导 | 并行推导 |
| `demo` | 为当前 128 Rank 产品演示定义 | Demo |
| `trace` | 来自真实 NCCL/Nsight/框架 trace | Runtime Trace |
| `unresolved` | 当前证据不足，禁止猜测 | 未解析 |

重要规则：

- 未命中 ownership rule 的算子不得再默认标为 `replicated`；必须标记为 `unresolved`。
- `unresolved` 算子保留原始结构上下文，但不得以实色声称它由本 Rank 完整执行。
- 精确切片范围只有在 shape 和 partition dimension 均已知时才可显示数字；否则使用 `TP0/2 · output-dim shard` 等符号描述。

## 6. 默认拓扑与可验证结果

默认 demo：

```text
World Size = TP2 × PP4 × CP1 × EP8 × EDP2 = 128
PP0 = L0–L11
PP1 = L12–L22
PP2 = L23–L34
PP3 = L35–L45
Routed Experts = 256
Experts per EP shard = 32
```

固定一个 PP 坐标后有 `TP2 × EP8 × EDP2 = 32` 个 Rank。它们共享同一个 LogicalLayer 范围，但不得再被描述为 32 个完整 Layer 副本。

默认通信组计数：

| Axis | 每组 Rank 数 | 组数 | 分组条件 |
| --- | ---: | ---: | --- |
| PP | 4 | 32 | TP、CP、EP、EDP 固定 |
| TP | 2 | 64 | PP、CP、EP、EDP 固定 |
| EP | 8 | 16 | PP、TP、CP、EDP 固定 |
| EDP | 2 | 64 | PP、TP、CP、EP 固定 |
| CP | 1 | 128 | 当前无跨 Rank CP 通信 |

## 7. 目标运行时架构

```text
Canonical Layer Renderer
        ↓
ModelSceneSpec
        ↓
ParallelTopologySpec + OwnershipRuleRegistry
        ↓
OperatorShardPlanner
        ↓
RankProgram[] + OwnershipDiagnostics
        ↓
CommunicationPlanner
        ↓
CommunicationEvent[]
        ↓
ExecutionSchedule / Optional TraceAdapter
        ↓
OperatorInvocation[]
        ↓
ThreeSceneCompiler + SceneIndex + Inspector
```

规划器必须是纯数据逻辑，不依赖 DOM 或 Three.js；渲染器只消费规划结果，不得在材质更新或交互回调中临时猜测 ownership。

## 8. 数据合同

### 8.1 ParallelTopologySpec

```js
{
  worldSize: 128,
  dimensions: { tp: 2, pp: 4, cp: 1, ep: 8, edp: 2 },
  rankOrder: ['tp', 'pp', 'cp', 'ep', 'edp'],
  stageRanges: [[0, 11], [12, 22], [23, 34], [35, 45]],
  sourceLevel: 'demo'
}
```

### 8.2 OwnershipRule

```js
{
  id: 'attention-output-projection-tp',
  match: { nodeIds: ['o_proj'] },
  layers: 'all',
  ownership: {
    kind: 'tensor-shard',
    axis: 'tp',
    partition: 'symbolic-output-or-input-dim'
  },
  sourceLevel: 'derived'
}
```

规则必须支持：

- `nodeIds` 精确匹配；
- Layer range 或 Layer variant 条件；
- Dense/MoE、DSA/SWA、block-post 条件；
- 多轴 ownership；
- communication endpoint；
- consumer override；
- `unresolved` fallback。

### 8.3 OperatorShard

```js
{
  id: 'rank:88/layer:2/op:q_a_proj/shard:tp0',
  rank: 88,
  layer: 2,
  logicalNodeId: 'q_a_proj',
  sourceNodeId: 'q_a_proj',
  sourceIndex: 2,
  sourceGeometryRef: 'layer:2/node:q_a_proj',
  ownership: {
    kind: 'tensor-shard',
    axis: 'tp',
    index: 0,
    count: 2
  },
  slices: {
    input: { kind: 'symbolic', value: 'local activation' },
    weight: { kind: 'symbolic', value: 'TP0/2 shard' },
    output: { kind: 'symbolic', value: 'TP0/2 output shard' }
  },
  localPredecessors: [],
  localSuccessors: [],
  communicationBefore: [],
  communicationAfter: [],
  sourceLevel: 'derived'
}
```

### 8.4 RankProgram

```js
{
  rank: 88,
  coordinate: { pp: 0, tp: 0, cp: 0, ep: 3, edp: 1 },
  layerRange: { start: 0, end: 11 },
  operatorShards: [],
  contextOperators: [],
  unresolvedOperators: [],
  localEdges: [],
  communicationEndpoints: [],
  ppInput: { kind: 'model-input' },
  ppOutput: { peerRank: 90, direction: 'forward' },
  diagnostics: {
    sourceOperators: 0,
    ownedOperators: 0,
    contextOperators: 0,
    unresolvedOperators: 0
  }
}
```

### 8.5 CommunicationEvent

```js
{
  id: 'mb0/fwd/layer:2/a2a-dispatch/pp0-tp0-edp1',
  op: 'alltoall',
  semanticPhase: 'dispatch',
  axis: 'ep',
  communicatorId: 'ep:tp0-pp0-cp0-edp1',
  participants: [64, 72, 80, 88, 96, 104, 112, 120],
  sourceOperatorIds: ['rank:88/layer:2/op:gate/...'],
  targetOperatorIds: ['rank:88/layer:2/op:expert_pool/...'],
  rootRank: null,
  count: null,
  datatype: null,
  bytes: null,
  algorithm: null,
  protocol: null,
  timing: null,
  sourceLevel: 'derived'
}
```

未知字段必须为 `null`，禁止以演示数字填充后不标注。

### 8.6 OperatorInvocation

```js
{
  id: 'iter0/mb0/fwd/rank88/layer2/q_a_proj',
  operatorShardId: 'rank:88/layer:2/op:q_a_proj/shard:tp0',
  iteration: 0,
  microbatch: 0,
  pass: 'forward',
  scheduleSlot: 2,
  startTime: null,
  endTime: null,
  state: 'planned',
  sourceLevel: 'demo'
}
```

## 9. Ownership 编译规则

### 9.1 PP

- PP 只决定 Layer range 和 stage boundary。
- 同一个 PP stage 内的 32 个 Rank 均引用相同 LogicalLayer 范围。
- PP 不得将一个 SourceOperator 自动声明为 32 份完整计算。
- PP stage 内的具体本地载荷必须继续经过 TP、EP、CP、EDP ownership 编译。

### 9.2 TP

首期必须覆盖当前模型源码中已知 TP 节点：

- `embedding`
- `q_a_proj`, `kv_a_proj`
- `q_b_proj`, `kv_b_proj`
- `query_tensor`, `key_tensor`
- `attention_core`
- `o_proj`
- `dense_gate_up`, `dense_down`
- `lm_head`
- `mtp_eh_proj`, `mtp_decoder_layer`, `mtp_shared_head`

这些节点生成 `tensor-shard` ownership；原始节点形状和颜色不变，仅增加 shard overlay 与 Inspector 元数据。

以下节点必须编译为 `CommunicationEvent` endpoint，而不是普通 tensor-shard compute：

- `attn_all_gather`
- `attn_reduce_scatter`
- `moe_all_gather`
- `moe_reduce_scatter`
- `logits_allgather`

没有 shape 配置时只能显示 `TP0/2`、`TP1/2` 和符号切分方向，不得发明 head 或 channel 数值范围。

### 9.3 EP

MoE Layer 中：

- `gate` 在本地 token 上执行；除非外部配置另有说明，不把它标为 Expert shard；
- `a2a_dispatch` 编译为 EP AllToAll dispatch；
- `expert_pool` 编译为 `expert-shard`；
- `a2a_combine` 编译为 EP AllToAll combine；
- EP index `i` 持有 `[i × 32, i × 32 + 31]` 的 Expert range；
- `shared_expert` 的 ownership 必须由模型/训练配置声明；缺失时为 `unresolved`，不得默认复制。

Dense Layer L0–L1 中不存在 routed Expert shard。EP 坐标上的相同 Dense 算子可以是不同数据/token lane 上的本地执行，但 UI 必须将这种关系标为 `replicated/local-data-lane`，不能标成 EP Expert shard。

### 9.4 EDP

- EDP0/EDP1 表示相同 PP × TP × EP shard 的 Expert Data Parallel 副本。
- 两个副本可处理不同 microbatch/data slice。
- 是否使用 AllReduce、ReduceScatter 或其他梯度同步策略必须由 `trainingPolicy` 或 trace 提供。
- 缺失策略时只展示 replica relationship，不生成虚构的梯度 collective。

### 9.5 CP

- 当前 CP1 不产生跨 Rank OperatorShard 或 CommunicationEvent。
- 控件继续显示为禁用状态。
- 将来 CP>1 时必须通过独立规则声明 sequence slice 和通信模式，不能复用 TP 规则。

### 9.6 Replicated、Local 与 Unresolved

- `replicated`：已知每个相关 Rank 持有相同参数并执行同一逻辑算子；
- `local-data-lane`：算子结构相同，但输入 token/batch 不同；
- `local-stateless`：无参数本地算子，例如部分 residual/add；
- `unresolved`：证据不足；
- 规划器不得把 `unresolved` 自动降级为 `replicated`。

## 10. RankProgram 编译算法

对每个 Rank：

1. 根据 `coordinate.pp` 取得 Layer range。
2. 遍历范围内每个 Layer 的全部 SourceOperator，保持 source order。
3. 依次应用 PP、TP、EP、CP、EDP ownership rule。
4. 为本地执行或持有的节点生成 OperatorShard。
5. 为非本地但用于保持完整结构语境的节点生成 context record。
6. 为无法判断的节点生成 unresolved record。
7. 遍历原始 Layer Edge：
   - 两端均为本地 OperatorShard：生成 local dependency；
   - 跨 Rank 或连接 communication endpoint：交给 CommunicationPlanner；
   - 任一端 unresolved：生成 unresolved dependency，不得伪装成本地边。
8. 在 stage 首尾生成 PP input/output boundary。
9. 运行完整性和 ownership coverage 校验。

任何一个 SourceOperator 在一个 Rank/Layer 中只能处于以下一种主状态：

```text
owned | context | unresolved | communication-endpoint
```

不得同时被统计为完整本地 compute 和 context。

## 11. 默认 Rank 88 验证样例

```text
Rank 88 = PP0 · TP0 · CP0 · EP3 · EDP1
Layers = L0–L11
Expert range = E96–E127
TP partner = R89
PP next = R90
EDP replica peer = R24
EP group = R64, R72, R80, R88, R96, R104, R112, R120
```

在 L2 MoE Layer 中至少应得到：

```text
local/context Norm
TP0 attention projection shards
TP communication endpoints with R89
local Router
EP AllToAll dispatch across 8 EP ranks
Expert E96–E127 compute on R88
EP AllToAll combine across 8 EP ranks
local residual/merge nodes where ownership is resolved
```

Rank 88 前向 stage output 只发给 Rank 90，不广播给 PP1 的 32 个 Rank。

## 12. PP 执行与 microbatch 顺序

### 12.1 PP lane

固定 TP、CP、EP、EDP 后，PP 坐标形成一条 lane：

```text
TP0 · EP0 · EDP0: R0  → R2  → R4  → R6
TP1 · EP0 · EDP0: R1  → R3  → R5  → R7
TP0 · EP1 · EDP0: R8  → R10 → R12 → R14
TP0 · EP0 · EDP1: R64 → R66 → R68 → R70
```

默认拓扑共 32 条 PP lane。每个 stage boundary 有 32 条对应坐标的 forward P2P dependency；backward 方向相反。

### 12.2 Forward

```text
PP0 local RankProgram L0–L11
→ Send activation shard
→ PP1 corresponding RankProgram L12–L22
→ PP2 L23–L34
→ PP3 L35–L45 + output/loss
```

### 12.3 Backward

```text
PP3 backward
→ Send activation gradient
→ PP2 backward
→ PP1 backward
→ PP0 backward
```

### 12.4 Schedule

- 静态 OperatorShard 模式不强制选择 pipeline schedule。
- 执行回放必须显式指定 `schedule.type`，如 `fill-drain`、`1f1b` 或 trace-driven。
- 默认演示可使用 `1f1b-demo`，但 UI 必须标为 demo。
- 未提供 schedule 时禁止显示具体时间槽或并发关系。

## 13. CommunicationPlanner

### 13.1 语义模式与物理模式分离

默认只生成 semantic communication：

- participants；
- source/target OperatorShard；
- operation；
- direction/phase；
- root（如适用）；
- buffer state transition。

除非 trace 明确提供，否则以下字段保持未知：

- Ring/Tree/NVLS/PAT algorithm；
- channel；
- protocol；
- NVLink/PCIe/InfiniBand physical path；
- duration、bandwidth、count、bytes。

### 13.2 Parallel axis 到通信的默认映射

| Axis / 场景 | 默认事件 | 约束 |
| --- | --- | --- |
| PP forward | Send / Recv activation | 只连接相邻 stage 对应坐标 Rank |
| PP backward | Send / Recv activation gradient | 方向与 forward 相反 |
| TP attention | AllGather / ReduceScatter | 由源通信节点定义 |
| TP dense FFN | AllGather / ReduceScatter | 仅 Dense Layer |
| EP MoE | AllToAll dispatch / combine | 只在 MoE Layer |
| EDP | 未配置时不生成 | 需要 trainingPolicy 或 trace |
| CP1 | 无 | 不生成空动画 |

### 13.3 八种 collective 的动画语义

通信模拟器必须支持：

- AllReduce：本地完整输入 → reduction → 每 Rank 完整结果；
- Broadcast：root 完整输入 → 所有 Rank 完整结果；
- Reduce：所有 Rank 输入 → root 完整结果；
- AllGather：每 Rank shard → 每 Rank 拼接完整结果；
- ReduceScatter：全量输入/分块 → reduction → 每 Rank 一个结果 shard；
- AllToAll：每 Rank 的目标分块 → 按目标 Rank 交换；
- Gather：每 Rank shard → root 按 Rank 顺序拼接；
- Scatter：root 的 P 个分块 → 每 Rank 一个 shard；
- Send/Recv：单一 source/target 的有向数据传递。

动画默认表达语义结果，不得暗示实际 NCCL algorithm。

## 14. 渲染合同

### 14.1 原始视觉不可变

OperatorShard 必须直接复用 SourceOperator 的：

- 原始矩形尺寸与位置；
- 原始 op color；
- 原始 label；
- 原始 Layer variant；
- 原始 Cluster 布局；
- 原始 Edge path；
- 原始 node ID 和 source order。

禁止：

- 用统一小方块替代不同算子；
- 改写算子名称；
- 为了 packing 改变 Layer 内节点相对布局；
- 删除难以解析 ownership 的节点；
- 只保留代表性算子；
- 把 Layer 或 OperatorShard 转成截图/Canvas 贴图。

### 14.2 LayerScaffold

- Layer 继续保持原始平面和顺序，作为 OperatorShard 的坐标系。
- 大面积 Layer card/Cluster fill 在 overview 中继续不绘制，避免透明叠加发黑。
- Layer label 可在 Rank focus 中显示，overview 中隐藏。
- LayerScaffold 不计入本地 compute 统计。

### 14.3 Operator 状态

| 状态 | 视觉 |
| --- | --- |
| owned local compute | 原始实色、原始几何 |
| TP shard | 原始实色 + 窄边 shard 标记；不得用新颜色覆盖原色 |
| Expert shard | 原始 Expert Pool 样式 + E 范围标记 |
| communication endpoint | 保留原始 comm 节点样式 + 有向通信动画 |
| context | 浅蓝低透明，仅提供结构位置 |
| unresolved | 虚线/点线轮廓 + `?` Inspector 状态，不得实色 |
| currently executing | 外描边或亮度脉冲，不改变节点尺寸与布局 |

### 14.4 Overview

- 默认载荷模式改为 `Execution`。
- 每个 Rank 只把 owned OperatorShard 和已解析通信端点作为实色载荷。
- context/unresolved 保留 GPU instance，但在 overview 中弱化或隐藏 fill。
- 不显示全局算子文字。
- 不同时播放 128 Rank 的全部通信；只有选中 communicator 可进入动画状态。

### 14.5 Rank focus

- 展示该 Rank 的完整 LayerScaffold 和 RankProgram。
- owned OperatorShard 恢复原始颜色和黑色标签。
- context 节点保持 8%–12% 浅蓝透明度；不得与 owned 节点等权。
- unresolved 节点必须可在 Inspector 中定位和解释。
- 标签贴在对应节点正面，固定平面，不 billboard，不使用白字描边。

### 14.6 Communication animation

- 路径端点优先锚定 communication Operator 或产生/消费数据的 OperatorShard，不锚定 Rank 中心。
- 数据块颜色表达来源或目标 shard，而不是只用发光线。
- AllToAll 在 EP8 中最多显示 56 条非 self 有向逻辑路径；必须 GPU batch。
- PP 只显示选中 lane 或选中 microbatch 的邻接路径。
- 播放时才启动 `requestAnimationFrame`；暂停和结束后恢复 idle rendering。

## 15. 交互改造

### 15.1 顶部设置

现有 PP/TP/EP/EDP 累积分组逻辑保持不变。新增载荷与通信控制：

```text
载荷：执行 | 结构
通信：自动 | AllReduce | AllGather | ReduceScatter | AllToAll | Send/Recv
Pass：Forward | Backward
Microbatch：0 … N-1
播放 / 暂停 / 单步 / 速度
```

- `执行` 为默认：突出 owned OperatorShard。
- `结构`：完整原始 Layer 结构等权展示，用于核对源码，不表示本地完整计算。
- `自动` 根据选中算子、parallel axis 和 Layer variant 推荐通信事件。
- 没有 schedule 时隐藏 microbatch 播放控件。

### 15.2 Rank 选择

- 单击 Rank：选中并显示 RankProgram 摘要与通信组。
- 双击 Rank：进入 Rank focus。
- 单击空白：取消 Rank 和 communicator 选择。
- Escape：Operator → communication event → Rank focus → Rank selection → global。

### 15.3 Operator 选择

Inspector 必须显示：

- 原始 label、node ID、Layer；
- ownership kind；
- parallel axis、index/count；
- input/weight/output slice；
- local predecessor/successor；
- communication before/after；
- source level；
- unresolved reason；
- trace timing（存在时）。

### 15.4 Rank Inspector

Rank 默认面板改成：

```text
Rank 88 · PP0 TP0 EP3 EDP1
Stage: L0–L11
Owned Operator Shards: n
Communication Endpoints: n
Context Operators: n
Unresolved Operators: n
TP peer: R89
PP prev/next: Input / R90
EP group: R64 … R120
EDP replica peer: R24
```

Layer 列表继续保留，但每项显示 `owned / context / unresolved / comm` 数量，不再只显示“这个 Rank 有 Lx”。

## 16. SceneIndex 改造

新增索引：

```js
sceneIndex.sourceOperators
sceneIndex.operatorShards
sceneIndex.operatorInvocations
sceneIndex.rankPrograms
sceneIndex.communicationEvents
sceneIndex.communicationByRank
sceneIndex.communicationByOperator
sceneIndex.unresolvedOwnership
```

兼容保留：

```js
sceneIndex.nodes
sceneIndex.edges
sceneIndex.layers
sceneIndex.ranks
```

语义 ID：

```text
Source operator:
layer:{layer}/node:{nodeId}

Operator shard:
rank:{rank}/layer:{layer}/op:{nodeId}/shard:{axis}{index}

Invocation:
iter:{iteration}/mb:{microbatch}/{pass}/rank:{rank}/layer:{layer}/op:{nodeId}

Communication:
comm:{communicatorId}/{pass}/layer:{layer}/{op}/{phase}
```

## 17. 公共 API

新增纯规划 API：

```js
buildOwnershipRuleRegistry(model, topology, trainingPolicy)
buildOperatorShardPlan(modelSceneSpec, rankPlan, ownershipRules)
buildRankPrograms(operatorShardPlan)
buildCommunicationPlan(rankPrograms, trainingPolicy)
buildExecutionSchedule(rankPrograms, communicationPlan, scheduleConfig)
validateOwnershipCoverage(modelSceneSpec, rankPrograms)
```

新增 controller API：

```js
controller.setPayloadMode('execution' | 'structure')
controller.setCommunicationOperation(op | 'auto')
controller.selectCommunicationEvent(eventId)
controller.setExecutionPass('forward' | 'backward')
controller.setMicrobatch(index)
controller.playExecution()
controller.pauseExecution()
controller.stepExecution(direction)
controller.setExecutionSpeed(multiplier)
controller.loadCommunicationTrace(trace)
controller.getRankProgram(rank)
controller.getOwnershipDiagnostics()
```

兼容要求：

- `getRankManifest(rank)` 继续返回 PP Layer range 和坐标；
- 原 `selectRank`、`enterRank`、`selectNode` 不删除；
- `selectNode` 内部应映射到 SourceOperator，并在当前 Rank 中解析对应 OperatorShard；
- URL state 新增 `payload=execution|structure`、`comm=`、`pass=`、`mb=`，旧链接继续工作。

## 18. 文件改造范围

建议拆分纯规划逻辑，避免继续扩大单文件：

```text
patterns/model-parallel-rank-deck/
├─ pattern.js                         # Three.js renderer / interaction
├─ operator-shard-planner.js          # pure ownership + RankProgram
├─ communication-planner.js           # pure semantic communication plan
├─ execution-schedule.js              # pure microbatch schedule
├─ pattern.css
├─ pattern.html
├─ pattern.json
├─ planner.test.mjs
├─ operator-shard-planner.test.mjs
├─ communication-planner.test.mjs
└─ OPERATOR_SHARD_EXECUTION_SPEC.md
```

如最终仍保持单文件，以上模块边界也必须以独立纯函数存在，并可在 Node 测试中执行。

## 19. 迁移阶段

### Phase 0：锁定回归基线

- 冻结 canonical model source hashes；
- 快照 SourceOperator、Cluster、Edge 数量；
- 快照 128 Rank 坐标、PP ranges、group membership；
- 快照当前原始节点几何和颜色。

### Phase 1：OperatorShardPlanner

- 引入 ownership rule registry；
- 将未知默认值从 `replicated` 改为 `unresolved`；
- 生成 128 个 RankProgram；
- Inspector 先展示数据，不改变 Three.js 视觉。

### Phase 2：Execution payload rendering

- LayerScaffold 与 owned OperatorShard 分层；
- 默认 `Execution` 模式；
- 结构模式用于完整源码核对；
- 完成 Rank focus、Operator picking 和 ownership Inspector。

### Phase 3：Semantic communication

- PP Send/Recv；
- TP AllGather/ReduceScatter；
- EP AllToAll dispatch/combine；
- 数据块状态动画；
- selected communicator isolation。

### Phase 4：Execution schedule

- demo 1F1B schedule；
- forward/backward/microbatch 选择；
- 单步和播放。

### Phase 5：Trace adapter

- 导入 Nsight Systems/NCCL Inspector 或标准化 JSON；
- 将 communicator、op、count、datatype、timestamp 映射到 CommunicationEvent；
- trace 与 demo/derived 数据并列标记，不覆盖模型源事实。

## 20. 性能约束

默认 128 Rank 场景：

- 禁止 one Mesh per OperatorShard；
- OperatorShard 继续按 geometry/material family 使用 `InstancedMesh`；
- context 与 owned 状态通过 instance color/attribute 控制，不复制 geometry；
- Communication path 使用单个或固定少量 BufferGeometry/InstancedMesh batch；
- steady-state draw calls 继续保持 `<= 80`；
- 通信播放时 draw calls `<= 90`；
- idle 时无连续 render loop；
- 1440 × 900 overview 目标 55–60 FPS，orbit 最低 45 FPS；
- Rank 选择到 Inspector 更新 `<= 50 ms`；
- communication event 切换 `<= 80 ms`；
- 不创建全局 per-operator DOM；
- 文本仍只在 Rank focus 中按需创建并缓存；
- 规划器在相同输入上必须是确定性的，可序列化结果不得依赖 Three.js 对象。

## 21. 验收标准

### 21.1 Source integrity

- AC-S01：canonical model source 文件 hash 不变。
- AC-S02：每个原始 Node、Cluster、Edge 均存在唯一 ModelSceneSpec record。
- AC-S03：OperatorShard 直接引用 source geometry；不得创建替代 operator visual。
- AC-S04：原始 node ID、label、op kind、source order 不变。
- AC-S05：Structure 模式能够核对完整原始 Layer，不缺节点和边。

### 21.2 Ownership

- AC-O01：每个 Rank 的 Layer range 仍只由 PP coordinate 决定。
- AC-O02：PP0 的 32 个 Rank 均引用 L0–L11，但 UI 不再将它们称为 32 个完整 Layer 副本。
- AC-O03：每个 SourceOperator/Rank/Layer 恰好归入 owned、context、unresolved、communication-endpoint 之一。
- AC-O04：未命中规则的算子为 unresolved，不得默认为 replicated。
- AC-O05：TP 节点在 TP0/TP1 中生成不同 OperatorShard identity。
- AC-O06：EP3 Expert Pool 显示 E96–E127，不显示全部 256 Experts ownership。
- AC-O07：Dense L0–L1 不产生 routed Expert ownership。
- AC-O08：EDP peer 只表达 replica，未配置策略时不生成梯度 collective。

### 21.3 Rank 88 fixture

- AC-R01：Rank 88 坐标为 PP0/TP0/CP0/EP3/EDP1。
- AC-R02：Rank 88 Layer range 为 L0–L11。
- AC-R03：TP peer 为 R89。
- AC-R04：PP next 为 R90。
- AC-R05：EDP peer 为 R24。
- AC-R06：EP group 精确等于 `[64,72,80,88,96,104,112,120]`。

### 21.4 PP execution

- AC-P01：默认拓扑产生 32 条 PP lane，每条 4 Rank。
- AC-P02：lane `[0,2,4,6]` 和 `[1,3,5,7]` 精确成立。
- AC-P03：forward 只连接相邻 PP stage 且保持 TP/CP/EP/EDP 坐标。
- AC-P04：backward 路径严格反向。
- AC-P05：Rank 88 的 activation 只发送到 R90，不连接 PP1 全组。
- AC-P06：未提供 schedule 时不显示伪造时间顺序。

### 21.5 Communication

- AC-C01：EP8 AllToAll 不得渲染成 8 Rank 单链。
- AC-C02：PP Send/Recv 有方向、pass 和 payload kind。
- AC-C03：AllGather、ReduceScatter、AllToAll 的 buffer 状态变化符合 NCCL 语义。
- AC-C04：默认通信路径标为 semantic，不标为 physical。
- AC-C05：没有 trace 时 algorithm、protocol、bytes、duration 均为空。
- AC-C06：通信路径锚定 OperatorShard/communication endpoint，而不是 Rank 中心。

### 21.6 Visual and interaction

- AC-V01：默认 Execution 模式下 owned OperatorShard 与 context 有明确层级。
- AC-V02：切换 Structure 模式不会改变 Rank 坐标或原始 Layer 内部布局。
- AC-V03：OperatorShard shard overlay 不覆盖原始 op color。
- AC-V04：Rank focus 标签为固定黑色、固定字号、贴在节点正面且不 billboard。
- AC-V05：单击空白可清除选择；双击 Rank 进入 focus。
- AC-V06：选择 Operator 可查看 ownership、slice、通信和 sourceLevel。
- AC-V07：播放停止后不保留 continuous animation frame。

### 21.7 Performance

- AC-F01：source Node/Edge 数量不因 execution mode 减少。
- AC-F02：steady-state 和 playback draw-call budget 达标。
- AC-F03：1440 × 900 canonical viewport 完成最终 browser smoke。
- AC-F04：旋转、缩放、选择和通信播放不产生长期 memory 增长。

## 22. 必测用例

纯规划测试：

1. 128 Rank enumeration 与 group count；
2. 四个 PP ranges 完整覆盖 L0–L45；
3. 每 Rank SourceOperator 状态互斥且覆盖完整；
4. unresolved fallback；
5. Rank 88 fixture；
6. TP partner、EP group、EDP peer、PP prev/next；
7. Dense/MoE ownership 差异；
8. PP forward/backward edge direction；
9. AllToAll participant matrix；
10. 相同输入两次生成完全一致的 serialized plan。

渲染测试：

1. frozen source-integrity；
2. Execution/Structure 切换；
3. Rank focus 原始 operator geometry 对比；
4. Operator picking identity；
5. context/unresolved opacity；
6. PP lane forward/backward animation；
7. EP AllToAll animation；
8. idle RAF 停止；
9. canonical 1440 × 900 screenshot；
10. draw calls、triangles、GPU resource dispose diagnostics。

## 23. 完成定义

仅当以下条件同时满足，才能称为完成 OperatorShard 改造：

1. Rank 默认显示本地 OperatorShard Graph，而不是等权完整 Layer 副本；
2. 原始 Layer 结构、样式、节点、边和标签未被删除、替代或篡改；
3. 每个实色算子都能解释其 Rank ownership；
4. 不确定 ownership 被明确暴露，而不是伪装成 replicated；
5. PP stage 顺序能以 32 条坐标对应 lane 表达；
6. TP、EP 通信锚定到实际通信算子；
7. semantic、demo、derived、trace 和 physical evidence 不混淆；
8. 规划器单测、source-integrity、性能检查和最终浏览器 smoke 全部通过。

## 24. 规范性参考

- NCCL Collective Operations: <https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html>
- NCCL Collective APIs and in-place rules: <https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/api/colls.html>
- NCCL Point-to-point communication: <https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/p2p.html>
- Megatron Core tensor-parallel mappings: <https://docs.nvidia.com/megatron-core/developer-guide/latest/apidocs/core/core.tensor_parallel.mappings.html>
- Megatron Core pipeline P2P communication: <https://docs.nvidia.com/megatron-core/developer-guide/latest/apidocs/core/core.pipeline_parallel.p2p_communication.html>
- Megatron Core MoE token dispatch: <https://docs.nvidia.com/megatron-core/developer-guide/nightly/apidocs/core/core.transformer.moe.token_dispatcher.html>
- Nsight Systems NCCL Trace: <https://docs.nvidia.com/nsight-systems/UserGuide/#nvidia-nccl-trace>

