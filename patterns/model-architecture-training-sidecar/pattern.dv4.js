(function attachPtoDv4ArchitecturePattern(global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SCENE_WIDTH = 1840;
  const SCENE_HEIGHT = 2420;
  const STREAM_X = 920;
  const BUNDLE_OFFSETS = [-7.5, -2.5, 2.5, 7.5];

  function queryRoot(input) {
    return typeof input === 'string' ? document.querySelector(input) : input;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function graphNode(id, label, x, y, options = {}) {
    const kind = options.kind || 'op';
    return {
      id,
      label,
      kind,
      typeLabel: options.typeLabel ?? (
        kind === 'module' ? 'Module' : kind === 'state' ? 'State' : 'Op'
      ),
      colorKey: options.colorKey || 'sem:linear',
      x,
      y,
      width: options.width || 260,
      height: options.height || 56,
      parent: options.parent || '',
      selectable: false,
      origin: 'source',
      dataState: 'source_only',
      role: options.role || '',
      variant: options.variant || '',
      attrs: options.attrs || {}
    };
  }

  function graphCluster(id, label, x, y, width, height, options = {}) {
    return {
      id,
      label,
      kind: 'module',
      typeLabel: 'Module',
      colorKey: options.colorKey || 'module:decoder',
      x,
      y,
      width,
      height,
      parent: options.parent || '',
      nodes: [],
      children: [],
      structuralRoot: false,
      variant: options.variant || ''
    };
  }

  function graphEdge(id, source, target, tensorName, options = {}) {
    return {
      id,
      source,
      target,
      semanticEdgeType: options.semanticEdgeType || 'activation',
      sourceAnchor: options.sourceAnchor || 'bottom',
      targetAnchor: options.targetAnchor || 'top',
      curve: options.curve || 'vertical',
      waypoints: options.waypoints,
      cornerRadius: options.cornerRadius || 18,
      color: options.color,
      tensor: {
        name: tensorName || 'hidden_states',
        shape: options.shape || '[B,T,d]',
        dtype: options.dtype || 'bf16'
      },
      provenance: [{ source: 'DeepSeek V4 source/config architecture' }],
      variant: options.variant || '',
      bundlePath: options.bundlePath || null,
      bundleDiagonal: options.bundleDiagonal === true
    };
  }

  function buildFrontGraph(selectedLayer) {
    const data = global.DeepSeekV4ArchitectureData;
    const config = data.config;
    const descriptor = data.describeLayer(selectedLayer);
    const layer = descriptor.layer;
    const rootId = `dv4/layer/${layer}`;
    const attnId = `${rootId}/mhc_attn`;
    const hybridId = `${attnId}/hybrid_attention`;
    const csaId = `${hybridId}/csa`;
    const hcaId = `${hybridId}/hca`;
    const ffnId = `${rootId}/mhc_ffn`;
    const moeId = `${ffnId}/deepseek_moe`;
    const routedId = `${moeId}/routed_experts`;

    const ids = {
      input: `${rootId}/input_streams`,
      attnMix: `${attnId}/residual_mix_b`,
      attnPre: `${attnId}/hc_pre`,
      norm1: `${attnId}/rmsnorm`,
      attentionType: `${hybridId}/attention_type`,
      attnPost: `${attnId}/hc_post`,
      attnMerge: `${attnId}/merge`,
      middle: `${rootId}/attention_output_streams`,
      ffnMix: `${ffnId}/residual_mix_b`,
      ffnPre: `${ffnId}/hc_pre`,
      norm2: `${ffnId}/rmsnorm`,
      tokenId: `${moeId}/token_id`,
      router: `${moeId}/router`,
      selection: `${routedId}/selection`,
      combine: `${moeId}/combine`,
      ffnPost: `${ffnId}/hc_post`,
      ffnMerge: `${ffnId}/merge`,
      output: `${rootId}/output_streams`
    };

    const clusters = [
      graphCluster(rootId, `DeepSeek V4 Decoder Layer · L${layer}`, 60, 70, 1720, 2310, {
        colorKey: 'module:decoder'
      }),
      graphCluster(attnId, 'mHC-Attention · 4 × d → d → 4 × d', 105, 240, 1630, 1090, {
        parent: rootId,
        colorKey: 'module:mhc'
      }),
      graphCluster(hybridId, 'Hybrid Attention · CSA / HCA', 375, 535, 1280, 555, {
        parent: attnId,
        colorKey: 'module:mhc'
      }),
      graphCluster(csaId, 'CSA · Compressed Sparse Attention', 405, 595, 585, 455, {
        parent: hybridId,
        colorKey: 'opv:attention',
        variant: 'csa'
      }),
      graphCluster(hcaId, 'HCA · Heavily Compressed Attention', 1035, 595, 585, 455, {
        parent: hybridId,
        colorKey: 'opv:rope',
        variant: 'hca'
      }),
      graphCluster(ffnId, 'mHC-FFN · 4 × d → d → 4 × d', 105, 1435, 1630, 835, {
        parent: rootId,
        colorKey: 'module:ffn'
      }),
      graphCluster(moeId, 'DeepSeekMoE · all decoder layers', 375, 1640, 1280, 455, {
        parent: ffnId,
        colorKey: 'opv:moe'
      }),
      graphCluster(routedId, `Routed Experts · ${config.routedExperts} total`, 500, 1765, 790, 240, {
        parent: moeId,
        colorKey: 'opv:moe'
      })
    ];

    const nodes = [
      graphNode(ids.input, `X${layer} · 4 × d residual streams`, STREAM_X, 160, {
        kind: 'state', typeLabel: 'mHC State', colorKey: 'io:state', width: 390, height: 64, role: 'stream-state'
      }),
      graphNode(ids.attnMix, 'Mix B · 4→4', 230, 710, {
        typeLabel: 'mHC Mapping', colorKey: 'sem:linear', width: 170, height: 42, role: 'residual-mix'
      }),
      graphNode(ids.attnPre, 'HC Pre · 4→1', STREAM_X, 325, {
        typeLabel: 'mHC Projection', colorKey: 'sem:attention', width: 300, height: 64, role: 'mhc-projection'
      }),
      graphNode(ids.norm1, 'RMSNorm 1', STREAM_X, 420, {
        colorKey: 'sem:norm', width: 260
      }),
      graphNode(ids.attentionType, descriptor.attentionLabel, STREAM_X, 510, {
        typeLabel: `L${layer} architecture schedule`, colorKey: descriptor.attentionType === 'csa' ? 'sem:attention' : 'sem:rope', width: 410, height: 64
      }),

      graphNode(`${csaId}/query_projection`, 'Query Projection', 697, 655, {
        parent: csaId, colorKey: 'sem:linear', width: 270, variant: 'csa'
      }),
      graphNode(`${csaId}/kv_compressor`, 'KV Compressor ×4', 697, 735, {
        parent: csaId, colorKey: 'sem:attention', width: 270, variant: 'csa'
      }),
      graphNode(`${csaId}/compressed_kv`, 'Compressed KV', 500, 835, {
        parent: csaId, kind: 'state', typeLabel: 'KV State', colorKey: 'io:state', width: 170, variant: 'csa'
      }),
      graphNode(`${csaId}/lightning_indexer`, 'Lightning Indexer', 697, 835, {
        parent: csaId, colorKey: 'sem:attention', width: 190, variant: 'csa'
      }),
      graphNode(`${csaId}/swa_kv`, `SWA KV · ${config.slidingWindow}`, 895, 835, {
        parent: csaId, kind: 'state', typeLabel: 'Local KV State', colorKey: 'io:state', width: 170, variant: 'csa'
      }),
      graphNode(`${csaId}/shared_kv_mqa`, 'Shared-KV MQA', 697, 930, {
        parent: csaId, colorKey: 'sem:attention', width: 280, variant: 'csa'
      }),
      graphNode(`${csaId}/grouped_o_projection`, 'Grouped Output Projection', 697, 1015, {
        parent: csaId, colorKey: 'sem:linear', width: 300, variant: 'csa'
      }),

      graphNode(`${hcaId}/query_projection`, 'Query Projection', 1328, 655, {
        parent: hcaId, colorKey: 'sem:linear', width: 270, variant: 'hca'
      }),
      graphNode(`${hcaId}/kv_compressor`, 'KV Compressor ×128', 1328, 735, {
        parent: hcaId, colorKey: 'sem:rope', width: 270, variant: 'hca'
      }),
      graphNode(`${hcaId}/compressed_kv`, 'Compressed KV', 1198, 835, {
        parent: hcaId, kind: 'state', typeLabel: 'KV State', colorKey: 'io:state', width: 190, variant: 'hca'
      }),
      graphNode(`${hcaId}/swa_kv`, `SWA KV · ${config.slidingWindow}`, 1458, 835, {
        parent: hcaId, kind: 'state', typeLabel: 'Local KV State', colorKey: 'io:state', width: 190, variant: 'hca'
      }),
      graphNode(`${hcaId}/dense_mqa`, 'Dense Shared-KV MQA', 1328, 930, {
        parent: hcaId, colorKey: 'sem:attention', width: 290, variant: 'hca'
      }),
      graphNode(`${hcaId}/grouped_o_projection`, 'Grouped Output Projection', 1328, 1015, {
        parent: hcaId, colorKey: 'sem:linear', width: 300, variant: 'hca'
      }),

      graphNode(ids.attnPost, 'HC Post · 1→4', STREAM_X, 1160, {
        typeLabel: 'mHC Projection', colorKey: 'sem:attention', width: 300, height: 64, role: 'mhc-projection'
      }),
      graphNode(ids.attnMerge, '', STREAM_X, 1260, {
        typeLabel: '', colorKey: 'sem:linear', width: 82, height: 72, role: 'mhc-merge'
      }),
      graphNode(ids.middle, `X${layer}′ · 4 × d residual streams`, STREAM_X, 1370, {
        kind: 'state', typeLabel: 'mHC State', colorKey: 'io:state', width: 390, height: 64, role: 'stream-state'
      }),

      graphNode(ids.ffnMix, 'Mix B · 4→4', 230, 1810, {
        typeLabel: 'mHC Mapping', colorKey: 'sem:linear', width: 170, height: 42, role: 'residual-mix'
      }),
      graphNode(ids.ffnPre, 'HC Pre · 4→1', STREAM_X, 1510, {
        typeLabel: 'mHC Projection', colorKey: 'sem:mlp', width: 300, height: 64, role: 'mhc-projection'
      }),
      graphNode(ids.norm2, 'RMSNorm 2', STREAM_X, 1590, {
        colorKey: 'sem:norm', width: 260
      }),
      graphNode(ids.tokenId, 'Token ID', 500, 1685, {
        kind: 'state', typeLabel: 'Hash Input', colorKey: 'io:input', width: 180, role: 'token-id-input'
      }),
      graphNode(ids.router, descriptor.routerLabel, STREAM_X, 1705, {
        typeLabel: descriptor.routerType === 'hash_moe' ? 'Hash-MoE' : 'MoE Router',
        colorKey: 'sem:gate', width: 390, height: 64
      }),
      graphNode(ids.selection, descriptor.routeSelectionLabel, 895, 1845, {
        parent: routedId, typeLabel: 'Routing Selection', colorKey: 'sem:gate', width: 270
      }),
      graphNode(`${routedId}/expert_001`, 'Expert 001', 600, 1935, {
        parent: routedId, colorKey: 'sem:moe', width: 180
      }),
      graphNode(`${routedId}/expert_002`, 'Expert 002', 800, 1935, {
        parent: routedId, colorKey: 'sem:moe', width: 180
      }),
      graphNode(`${routedId}/expert_ellipsis`, '…', 995, 1935, {
        parent: routedId, colorKey: 'sem:moe', width: 90
      }),
      graphNode(`${routedId}/expert_384`, 'Expert 384', 1160, 1935, {
        parent: routedId, colorKey: 'sem:moe', width: 190
      }),
      graphNode(`${moeId}/shared_expert`, 'Shared Expert', 1430, 1935, {
        parent: moeId, typeLabel: 'Always active', colorKey: 'sem:gate', width: 220
      }),
      graphNode(ids.combine, 'Combine', STREAM_X, 2040, {
        parent: moeId, colorKey: 'sem:gate', width: 270
      }),
      graphNode(ids.ffnPost, 'HC Post · 1→4', STREAM_X, 2120, {
        typeLabel: 'mHC Projection', colorKey: 'sem:mlp', width: 300, height: 64, role: 'mhc-projection'
      }),
      graphNode(ids.ffnMerge, '', STREAM_X, 2210, {
        typeLabel: '', colorKey: 'sem:linear', width: 82, height: 72, role: 'mhc-merge'
      }),
      graphNode(ids.output, `X${layer + 1} · 4 × d residual streams`, STREAM_X, 2320, {
        kind: 'state', typeLabel: 'mHC State', colorKey: 'io:state', width: 390, height: 64, role: 'stream-state'
      })
    ];

    const edges = [
      graphEdge('edge/input-attn-pre', ids.input, ids.attnPre, 'hc_streams', {
        shape: '[B,T,4,d]',
        bundlePath: [{ x: STREAM_X, y: 192 }, { x: STREAM_X, y: 293 }]
      }),
      graphEdge('edge/input-attn-mix', ids.input, ids.attnMix, 'hc_streams', {
        semanticEdgeType: 'residual', sourceAnchor: 'left', targetAnchor: 'right', shape: '[B,T,4,d]',
        bundleDiagonal: true,
        bundlePath: [
          { x: 725, y: 160 }, { x: 300, y: 160 },
          { x: 300, y: 710 }, { x: 315, y: 710 }
        ]
      }),
      graphEdge('edge/attn-pre-norm', ids.attnPre, ids.norm1, 'collapsed_hidden', { shape: '[B,T,d]' }),
      graphEdge('edge/norm-attention-type', ids.norm1, ids.attentionType, 'normalized_hidden', { shape: '[B,T,d]' }),

      graphEdge('edge/type-csa-query', ids.attentionType, `${csaId}/query_projection`, 'attention_input', { variant: 'csa' }),
      graphEdge('edge/csa-query-compressor', `${csaId}/query_projection`, `${csaId}/kv_compressor`, 'query_and_kv_input', { variant: 'csa' }),
      graphEdge('edge/csa-compressor-kv', `${csaId}/kv_compressor`, `${csaId}/compressed_kv`, 'compressed_kv', { variant: 'csa' }),
      graphEdge('edge/csa-compressor-indexer', `${csaId}/kv_compressor`, `${csaId}/lightning_indexer`, 'compressed_index_kv', { variant: 'csa' }),
      graphEdge('edge/csa-compressor-swa', `${csaId}/kv_compressor`, `${csaId}/swa_kv`, 'local_kv', { variant: 'csa' }),
      graphEdge('edge/csa-kv-mqa', `${csaId}/compressed_kv`, `${csaId}/shared_kv_mqa`, 'selected_compressed_kv', { variant: 'csa' }),
      graphEdge('edge/csa-indexer-mqa', `${csaId}/lightning_indexer`, `${csaId}/shared_kv_mqa`, 'topk_indices', { variant: 'csa' }),
      graphEdge('edge/csa-swa-mqa', `${csaId}/swa_kv`, `${csaId}/shared_kv_mqa`, 'swa_kv', { variant: 'csa' }),
      graphEdge('edge/csa-mqa-output', `${csaId}/shared_kv_mqa`, `${csaId}/grouped_o_projection`, 'mqa_output', { variant: 'csa' }),

      graphEdge('edge/type-hca-query', ids.attentionType, `${hcaId}/query_projection`, 'attention_input', { variant: 'hca' }),
      graphEdge('edge/hca-query-compressor', `${hcaId}/query_projection`, `${hcaId}/kv_compressor`, 'query_and_kv_input', { variant: 'hca' }),
      graphEdge('edge/hca-compressor-kv', `${hcaId}/kv_compressor`, `${hcaId}/compressed_kv`, 'compressed_kv', { variant: 'hca' }),
      graphEdge('edge/hca-compressor-swa', `${hcaId}/kv_compressor`, `${hcaId}/swa_kv`, 'local_kv', { variant: 'hca' }),
      graphEdge('edge/hca-kv-mqa', `${hcaId}/compressed_kv`, `${hcaId}/dense_mqa`, 'dense_compressed_kv', { variant: 'hca' }),
      graphEdge('edge/hca-swa-mqa', `${hcaId}/swa_kv`, `${hcaId}/dense_mqa`, 'swa_kv', { variant: 'hca' }),
      graphEdge('edge/hca-mqa-output', `${hcaId}/dense_mqa`, `${hcaId}/grouped_o_projection`, 'mqa_output', { variant: 'hca' }),

      graphEdge('edge/csa-output-post', `${csaId}/grouped_o_projection`, ids.attnPost, 'attention_output', { variant: 'csa' }),
      graphEdge('edge/hca-output-post', `${hcaId}/grouped_o_projection`, ids.attnPost, 'attention_output', { variant: 'hca' }),
      graphEdge('edge/attn-post-merge', ids.attnPost, ids.attnMerge, 'hc_contribution', {
        shape: '[B,T,4,d]', bundlePath: [{ x: STREAM_X, y: 1192 }, { x: STREAM_X, y: 1224 }]
      }),
      graphEdge('edge/attn-mix-merge', ids.attnMix, ids.attnMerge, 'mixed_residual_streams', {
        semanticEdgeType: 'residual', sourceAnchor: 'right', targetAnchor: 'left', shape: '[B,T,4,d]',
        bundleDiagonal: true,
        bundlePath: [
          { x: 315, y: 710 }, { x: 300, y: 710 },
          { x: 300, y: 1260 }, { x: 884, y: 1260 }
        ]
      }),
      graphEdge('edge/attn-merge-middle', ids.attnMerge, ids.middle, 'attention_mhc_output', {
        shape: '[B,T,4,d]', bundlePath: [{ x: STREAM_X, y: 1296 }, { x: STREAM_X, y: 1338 }]
      }),

      graphEdge('edge/middle-ffn-pre', ids.middle, ids.ffnPre, 'hc_streams', {
        shape: '[B,T,4,d]', bundlePath: [{ x: STREAM_X, y: 1402 }, { x: STREAM_X, y: 1478 }]
      }),
      graphEdge('edge/middle-ffn-mix', ids.middle, ids.ffnMix, 'hc_streams', {
        semanticEdgeType: 'residual', sourceAnchor: 'left', targetAnchor: 'right', shape: '[B,T,4,d]',
        bundleDiagonal: true,
        bundlePath: [
          { x: 725, y: 1370 }, { x: 300, y: 1370 },
          { x: 300, y: 1810 }, { x: 315, y: 1810 }
        ]
      }),
      graphEdge('edge/ffn-pre-norm', ids.ffnPre, ids.norm2, 'collapsed_hidden', { shape: '[B,T,d]' }),
      graphEdge('edge/norm-router', ids.norm2, ids.router, 'normalized_hidden', { shape: '[B,T,d]' }),
      graphEdge('edge/token-router', ids.tokenId, ids.router, 'input_ids', {
        sourceAnchor: 'right', targetAnchor: 'left', curve: 'horizontal', shape: '[B,T]'
      }),
      graphEdge('edge/router-selection', ids.router, ids.selection, 'expert_indices'),
      graphEdge('edge/selection-expert-1', ids.selection, `${routedId}/expert_001`, 'routed_tokens'),
      graphEdge('edge/selection-expert-2', ids.selection, `${routedId}/expert_002`, 'routed_tokens'),
      graphEdge('edge/selection-expert-ellipsis', ids.selection, `${routedId}/expert_ellipsis`, 'routed_tokens'),
      graphEdge('edge/selection-expert-384', ids.selection, `${routedId}/expert_384`, 'routed_tokens'),
      graphEdge('edge/norm-shared', ids.norm2, `${moeId}/shared_expert`, 'all_tokens', {
        sourceAnchor: 'right', targetAnchor: 'top', curve: 'orthogonal',
        waypoints: [{ x: 1430, y: 1590 }]
      }),
      graphEdge('edge/expert-1-combine', `${routedId}/expert_001`, ids.combine, 'expert_output'),
      graphEdge('edge/expert-2-combine', `${routedId}/expert_002`, ids.combine, 'expert_output'),
      graphEdge('edge/expert-ellipsis-combine', `${routedId}/expert_ellipsis`, ids.combine, 'expert_output'),
      graphEdge('edge/expert-384-combine', `${routedId}/expert_384`, ids.combine, 'expert_output'),
      graphEdge('edge/shared-combine', `${moeId}/shared_expert`, ids.combine, 'shared_expert_output', {
        sourceAnchor: 'bottom', targetAnchor: 'right', curve: 'orthogonal',
        waypoints: [{ x: 1430, y: 1985 }]
      }),
      graphEdge('edge/combine-post', ids.combine, ids.ffnPost, 'moe_output'),
      graphEdge('edge/ffn-post-merge', ids.ffnPost, ids.ffnMerge, 'hc_contribution', {
        shape: '[B,T,4,d]', bundlePath: [{ x: STREAM_X, y: 2152 }, { x: STREAM_X, y: 2174 }]
      }),
      graphEdge('edge/ffn-mix-merge', ids.ffnMix, ids.ffnMerge, 'mixed_residual_streams', {
        semanticEdgeType: 'residual', sourceAnchor: 'right', targetAnchor: 'left', shape: '[B,T,4,d]',
        bundleDiagonal: true,
        bundlePath: [
          { x: 315, y: 1810 }, { x: 300, y: 1810 },
          { x: 300, y: 2210 }, { x: 884, y: 2210 }
        ]
      }),
      graphEdge('edge/ffn-merge-output', ids.ffnMerge, ids.output, 'layer_output_streams', {
        shape: '[B,T,4,d]', bundlePath: [{ x: STREAM_X, y: 2246 }, { x: STREAM_X, y: 2288 }]
      })
    ];

    return {
      schemaVersion: 'model_architecture_graph.v1',
      id: `deepseek-v4-pro-layer-${layer}`,
      title: `DeepSeek V4 Pro Decoder Layer ${layer}`,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      nodes,
      edges,
      clusters,
      metadata: {
        modelId: config.modelId,
        selectedLayer: layer,
        attentionType: descriptor.attentionType,
        routerType: descriptor.routerType,
        hcMult: config.hcMult,
        mergeNodeIds: [ids.attnMerge, ids.ffnMerge]
      }
    };
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function decorateRoleClasses(host, graph) {
    (graph.nodes || []).forEach(node => {
      const rendered = host.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
      if (!rendered) return;
      if (node.role) rendered.classList.add(`is-${node.role}`);
    });
  }

  function bundlePathData(points, offset) {
    return points.map((point, index) => {
      const previous = points[index - 1];
      const next = points[index + 1];
      const adjacent = [previous, next].filter(Boolean);
      const touchesVertical = adjacent.some(entry => entry.x === point.x);
      const touchesHorizontal = adjacent.some(entry => entry.y === point.y);
      // Parallel orthogonal lanes need a horizontal offset on vertical runs
      // and a vertical offset on horizontal runs. At a bend both offsets are
      // applied, preserving four distinct 90-degree corners.
      const x = point.x + (touchesVertical ? offset : 0);
      const y = point.y + (touchesHorizontal ? offset : 0);
      return `${index ? 'L' : 'M'} ${x} ${y}`;
    }).join(' ');
  }

  function decorateMhcBundles(host, graph) {
    const svg = host.querySelector('.pto-model-graphviz-svg');
    if (!svg) return;
    const group = svgElement('g', { class: 'pto-dv4-mhc-bundles', 'aria-hidden': 'true' });
    (graph.edges || []).filter(edge => edge.bundlePath?.length > 1).forEach(edge => {
      const rendered = [...host.querySelectorAll('.pto-model-graphviz-edge')].find(item => (
        item.dataset.source === edge.source && item.dataset.target === edge.target
      ));
      if (rendered) rendered.style.display = 'none';
      BUNDLE_OFFSETS.forEach(offset => {
        group.appendChild(svgElement('path', {
          class: 'pto-dv4-mhc-bundle-line',
          d: bundlePathData(edge.bundlePath, offset)
        }));
      });
    });
    const firstNode = svg.querySelector('.pto-model-graphviz-node');
    svg.insertBefore(group, firstNode || null);
  }

  function decorateMhcMerge(host, graph, nodeId) {
    const svg = host.querySelector('.pto-model-graphviz-svg');
    const node = graph.nodes.find(entry => entry.id === nodeId);
    if (!svg || !node) return;
    const group = svgElement('g', {
      class: 'pto-dv4-mhc-merge',
      role: 'img',
      'aria-label': 'mHC Merge: four residual streams'
    });
    const title = svgElement('title');
    title.textContent = 'mHC Merge ×4 · B(X) + HC Post(F(HC Pre(X))) · [B,T,4,d]';
    group.appendChild(title);
    group.appendChild(svgElement('circle', {
      class: 'pto-dv4-mhc-merge__face', cx: node.x, cy: node.y, r: 24
    }));
    const plus = svgElement('path', {
      class: 'pto-dv4-mhc-merge__plus',
      d: `M ${node.x - 12} ${node.y} H ${node.x + 12} M ${node.x} ${node.y - 12} V ${node.y + 12}`
    });
    group.appendChild(plus);
    group.appendChild(svgElement('rect', {
      class: 'pto-dv4-mhc-merge__badge',
      x: node.x + 15,
      y: node.y + 13,
      width: 44,
      height: 22,
      rx: 11
    }));
    const badge = svgElement('text', {
      class: 'pto-dv4-mhc-merge__badge-text', x: node.x + 37, y: node.y + 24
    });
    badge.textContent = '×4';
    group.appendChild(badge);
    const label = svgElement('text', {
      class: 'pto-dv4-mhc-merge__label', x: node.x + 70, y: node.y
    });
    label.textContent = 'mHC Merge';
    group.appendChild(label);
    svg.appendChild(group);
  }

  function decorateHashInput(host, graph) {
    const hashMode = graph.metadata.routerType === 'hash_moe';
    const tokenNode = (graph.nodes || []).find(node => node.role === 'token-id-input');
    if (!tokenNode) return;
    const renderedNode = host.querySelector(`[data-node-id="${CSS.escape(tokenNode.id)}"]`);
    if (renderedNode && !hashMode) renderedNode.classList.add('is-router-input-inactive');
    const tokenEdges = [...host.querySelectorAll('.pto-model-graphviz-edge')].filter(edge => edge.dataset.source === tokenNode.id);
    tokenEdges.forEach(edge => edge.classList.toggle('is-router-input-inactive', !hashMode));
  }

  function shell(config) {
    const options = Array.from({ length: config.numHiddenLayers }, (_, layer) => (
      `<option value="${layer}">Layer ${layer}</option>`
    )).join('');
    return `<header class="pto-dv4-architecture__toolbar">
      <div class="pto-dv4-architecture__identity">
        <span class="pto-dv4-architecture__eyebrow">Model Architecture</span>
        <h1 class="pto-dv4-architecture__title">DeepSeek V4 Pro · mHC ×4 Architecture</h1>
        <span class="pto-dv4-architecture__count">${config.numHiddenLayers} layers</span>
      </div>
      <div class="pto-dv4-architecture__actions">
        <div class="pto-dv4-architecture__control" role="group" aria-label="视图切换">
          <button class="pto-dv4-architecture__button is-active" type="button" aria-pressed="true">正视</button>
        </div>
        <div class="pto-dv4-architecture__control">
          <button class="pto-dv4-architecture__button is-icon" type="button" data-dv4-theme aria-label="切换主题">◐</button>
          <button class="pto-dv4-architecture__button" type="button" data-dv4-fit>适配</button>
          <span class="pto-dv4-architecture__readout" data-dv4-readout>100%</span>
        </div>
      </div>
    </header>
    <div class="pto-dv4-architecture__layer-picker">
      <div class="pto-dv4-architecture__layer-controls">
        <label for="dv4LayerSelect">Decoder Layer</label>
        <button class="pto-dv4-architecture__button is-icon" type="button" data-dv4-layer-step="-1" aria-label="上一层">‹</button>
        <select class="pto-dv4-architecture__layer-select" id="dv4LayerSelect" data-dv4-layer>${options}</select>
        <button class="pto-dv4-architecture__button is-icon" type="button" data-dv4-layer-step="1" aria-label="下一层">›</button>
      </div>
      <div class="pto-dv4-architecture__layer-summary" data-dv4-layer-summary></div>
    </div>
    <div class="pto-dv4-architecture__legend" aria-label="mHC 图例">
      <div class="pto-dv4-architecture__legend-item"><i class="pto-dv4-architecture__legend-mark is-streams"></i><strong>4 × Residual Streams</strong><small>Layer 边界持续保存四路宽度为 d 的状态。</small></div>
      <div class="pto-dv4-architecture__legend-item"><i class="pto-dv4-architecture__legend-mark is-pre"></i><strong>HC Pre / Post</strong><small>4→1 折叠后执行子层，再由 1→4 展开。</small></div>
      <div class="pto-dv4-architecture__legend-item"><i class="pto-dv4-architecture__legend-mark is-mix"></i><strong>Residual Mix B</strong><small>4→4 doubly-stochastic residual mapping。</small></div>
      <div class="pto-dv4-architecture__legend-item"><i class="pto-dv4-architecture__legend-mark is-merge"></i><strong>mHC Merge ×4</strong><small>保留标志性 +，双环叠层表示四路合流。</small></div>
    </div>
    <div class="pto-dv4-architecture__workspace">
      <div class="pto-dv4-architecture__viewport" tabindex="0" aria-label="可缩放拖动的 DeepSeek V4 正视图">
        <div class="pto-dv4-architecture__canvas"></div>
      </div>
    </div>`;
  }

  function render(rootInput, options = {}) {
    const root = queryRoot(rootInput);
    const data = global.DeepSeekV4ArchitectureData;
    if (!root || !data) return null;
    root.classList.add('pto-dv4-architecture', 'pto-model-graphviz-pattern-page');
    root.dataset.sharedPattern = 'model-architecture-training-sidecar-dv4-working-copy';
    root.innerHTML = shell(data.config);

    const viewport = root.querySelector('.pto-dv4-architecture__viewport');
    const canvas = root.querySelector('.pto-dv4-architecture__canvas');
    const readout = root.querySelector('[data-dv4-readout]');
    const layerSelect = root.querySelector('[data-dv4-layer]');
    const layerSummary = root.querySelector('[data-dv4-layer-summary]');
    const state = {
      selectedLayer: data.clampLayer(options.initialLayer ?? 3),
      theme: options.initialTheme === 'light' ? 'light' : 'dark',
      zoom: 1,
      panX: 0,
      panY: 0,
      sceneWidth: SCENE_WIDTH,
      sceneHeight: SCENE_HEIGHT,
      drag: null,
      graph: null,
      destroyed: false
    };

    function applyTransform() {
      canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
      readout.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function fit() {
      const rect = viewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return api;
      const reserve = 28;
      state.zoom = Math.min(1.1, Math.max(.16, Math.min(
        (rect.width - reserve * 2) / state.sceneWidth,
        (rect.height - reserve * 2) / state.sceneHeight
      )));
      state.panX = (rect.width - state.sceneWidth * state.zoom) / 2;
      state.panY = (rect.height - state.sceneHeight * state.zoom) / 2;
      applyTransform();
      return api;
    }

    function syncLayerControls() {
      const descriptor = data.describeLayer(state.selectedLayer);
      layerSelect.value = String(state.selectedLayer);
      layerSummary.innerHTML = `
        <span class="pto-dv4-architecture__status-chip">L${descriptor.layer}</span>
        <span class="pto-dv4-architecture__status-chip is-attention">${descriptor.attentionType.toUpperCase()} · ×${descriptor.compression}</span>
        <span class="pto-dv4-architecture__status-chip is-router">${descriptor.routerType === 'hash_moe' ? 'Hash-MoE' : 'Learned MoE'}</span>
        <span class="pto-dv4-architecture__status-chip">${data.config.routedExperts} experts · Top-${data.config.expertsPerToken}</span>`;
    }

    function renderScene(shouldFit = true) {
      const graph = buildFrontGraph(state.selectedLayer);
      state.graph = graph;
      state.sceneWidth = graph.width;
      state.sceneHeight = graph.height;
      canvas.style.width = `${graph.width}px`;
      canvas.style.height = `${graph.height}px`;
      canvas.innerHTML = '<div class="pto-dv4-architecture__graph"></div>';
      const host = canvas.querySelector('.pto-dv4-architecture__graph');
      if (!global.PtoModelGraphvizPattern) {
        host.innerHTML = '<div class="pto-dv4-architecture__empty">model-graphviz renderer unavailable</div>';
        return api;
      }
      global.PtoModelGraphvizPattern.render(host, graph, {
        width: graph.width,
        height: graph.height,
        ariaLabel: `DeepSeek V4 Pro Decoder Layer ${state.selectedLayer} front view`,
        metricOverlays: false,
        reportOverlays: false,
        performanceHeatmap: { enabled: false },
        colormap: global.PtoModelGraphvizPattern.modelArchitectureColormap(graph, { theme: state.theme }),
        interaction: { panZoom: false, selectable: false },
        autoFit: false,
        initialTransform: { tx: 0, ty: 0, zoom: 1 }
      });
      decorateRoleClasses(host, graph);
      decorateHashInput(host, graph);
      decorateMhcBundles(host, graph);
      graph.metadata.mergeNodeIds.forEach(nodeId => decorateMhcMerge(host, graph, nodeId));
      syncLayerControls();
      if (shouldFit) requestAnimationFrame(fit);
      else applyTransform();
      return api;
    }

    function selectLayer(value) {
      const next = data.clampLayer(value);
      if (next === state.selectedLayer) return api;
      state.selectedLayer = next;
      renderScene(false);
      return api;
    }

    function setTheme(theme) {
      const next = theme === 'light' ? 'light' : 'dark';
      if (next === state.theme) return api;
      state.theme = next;
      document.documentElement.dataset.theme = next;
      renderScene(false);
      return api;
    }

    function onWheel(event) {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldX = (screenX - state.panX) / state.zoom;
      const worldY = (screenY - state.panY) / state.zoom;
      const factor = Math.exp(-event.deltaY * .0012);
      state.zoom = Math.max(.14, Math.min(2.4, state.zoom * factor));
      state.panX = screenX - worldX * state.zoom;
      state.panY = screenY - worldY * state.zoom;
      applyTransform();
    }

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      state.drag = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
    });
    viewport.addEventListener('pointermove', event => {
      if (!state.drag) return;
      state.panX = state.drag.panX + event.clientX - state.drag.x;
      state.panY = state.drag.panY + event.clientY - state.drag.y;
      applyTransform();
    });
    const endDrag = event => {
      if (!state.drag) return;
      state.drag = null;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    layerSelect.addEventListener('change', event => selectLayer(event.target.value));
    root.querySelectorAll('[data-dv4-layer-step]').forEach(button => {
      button.addEventListener('click', () => selectLayer(
        state.selectedLayer + Number(button.dataset.dv4LayerStep)
      ));
    });
    root.querySelector('[data-dv4-fit]').addEventListener('click', fit);
    root.querySelector('[data-dv4-theme]').addEventListener('click', () => (
      setTheme(state.theme === 'light' ? 'dark' : 'light')
    ));

    const resizeObserver = new ResizeObserver(() => fit());
    resizeObserver.observe(viewport);
    document.documentElement.dataset.theme = state.theme;

    const api = {
      root,
      fit,
      selectLayer,
      setTheme,
      getState() {
        return {
          selectedLayer: state.selectedLayer,
          theme: state.theme,
          zoom: state.zoom
        };
      },
      destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        resizeObserver.disconnect();
        viewport.removeEventListener('wheel', onWheel);
        root.innerHTML = '';
      }
    };

    renderScene(true);
    return api;
  }

  global.PtoDv4ArchitecturePattern = Object.freeze({
    render,
    buildFrontGraph
  });
})(window);
