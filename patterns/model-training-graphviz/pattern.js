(function registerPtoModelTrainingGraphvizPattern(global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_ZOOM = 0.18;
  const MAX_ZOOM = 2.6;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value == null) return;
      node.setAttribute(key, value);
    });
    return node;
  }

  function cloneGraph(graph, evidenceMap) {
    const source = graph || {};
    const evidence = evidenceMap || source.trainingEvidence || {};
    return {
      ...source,
      clusters: (source.clusters || []).map((cluster) => ({ ...cluster })),
      nodes: (source.nodes || []).map((node) => ({ ...node })),
      edges: (source.edges || []).map((edge) => ({ ...edge })),
      trainingEvidence: evidence,
    };
  }

  function nodeMap(graph) {
    return new Map((graph.nodes || []).map((node) => [node.id, node]));
  }

  function clusterMap(graph) {
    return new Map((graph.clusters || []).map((cluster) => [cluster.id, cluster]));
  }

  function normalizeIdList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
  }

  function buildHierarchy(graph) {
    const nodes = nodeMap(graph);
    const clusters = clusterMap(graph);
    const nodeParent = new Map();
    const clusterParent = new Map();
    const clusterChildren = new Map();
    const nodesByCluster = new Map();

    clusters.forEach((cluster, clusterId) => {
      nodesByCluster.set(clusterId, new Set(normalizeIdList(cluster.nodes)));
      clusterChildren.set(clusterId, new Set(normalizeIdList(cluster.children)));
      if (cluster.parent && clusters.has(cluster.parent)) {
        clusterParent.set(clusterId, cluster.parent);
      }
    });

    clusters.forEach((cluster, clusterId) => {
      normalizeIdList(cluster.children).forEach((childId) => {
        if (clusters.has(childId)) clusterParent.set(childId, clusterId);
      });
    });

    if (graph.clusterChildren && typeof graph.clusterChildren === 'object') {
      Object.entries(graph.clusterChildren).forEach(([clusterId, childIds]) => {
        if (!clusterChildren.has(clusterId)) clusterChildren.set(clusterId, new Set());
        normalizeIdList(childIds).forEach((childId) => {
          if (!clusters.has(childId)) return;
          clusterChildren.get(clusterId).add(childId);
          clusterParent.set(childId, clusterId);
        });
      });
    }

    (graph.nodes || []).forEach((node) => {
      if (!node.parent || !clusters.has(node.parent)) return;
      nodeParent.set(node.id, node.parent);
      if (!nodesByCluster.has(node.parent)) nodesByCluster.set(node.parent, new Set());
      nodesByCluster.get(node.parent).add(node.id);
    });

    const ancestorClustersForCluster = (clusterId) => {
      const out = [];
      const seen = new Set();
      let current = clusterId;
      while (clusterParent.has(current)) {
        current = clusterParent.get(current);
        if (!current || seen.has(current)) break;
        seen.add(current);
        out.push(current);
      }
      return out;
    };

    const ancestorClustersForNode = (nodeId) => {
      const parent = nodeParent.get(nodeId);
      if (!parent) return [];
      return [parent, ...ancestorClustersForCluster(parent)];
    };

    const descendantClustersOfCluster = (clusterId) => {
      const out = new Set();
      const visit = (id) => {
        (clusterChildren.get(id) || new Set()).forEach((childId) => {
          if (out.has(childId)) return;
          out.add(childId);
          visit(childId);
        });
      };
      visit(clusterId);
      return out;
    };

    const descendantNodesOfCluster = (clusterId) => {
      const out = new Set(nodesByCluster.get(clusterId) || []);
      descendantClustersOfCluster(clusterId).forEach((childId) => {
        (nodesByCluster.get(childId) || new Set()).forEach((nodeId) => out.add(nodeId));
      });
      return out;
    };

    return {
      nodes,
      clusters,
      nodeParent,
      clusterParent,
      clusterChildren,
      nodesByCluster,
      ancestorClustersForNode,
      ancestorClustersForCluster,
      descendantClustersOfCluster,
      descendantNodesOfCluster,
    };
  }

  function dedupeVisibleEdges(graph) {
    const nodes = nodeMap(graph);
    const seen = new Set();
    const out = [];
    (graph.edges || []).forEach((edge) => {
      if (!nodes.has(edge.source) || !nodes.has(edge.target)) return;
      const key = `${edge.source}->${edge.target}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(edge);
    });
    return out;
  }

  function normalizeEdgeType(edge) {
    return String((edge && (edge.edgeType || edge.type || edge.tag)) || 'activation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'activation';
  }

  function edgeTagText(edge) {
    return String(edge?.tag || edge?.edgeTypeLabel || edge?.edgeType || '').trim();
  }

  function edgeTagWidth(label) {
    return Math.max(38, Math.min(94, String(label || '').length * 5.7 + 18));
  }

  function relationForNode(graph, evidenceMap, nodeId, explicitRelated, hierarchy) {
    const nodeIds = new Set();
    const clusterIds = new Set();

    const addCluster = (clusterId) => {
      if (!clusterId || !hierarchy?.clusters?.has(clusterId)) return;
      clusterIds.add(clusterId);
      hierarchy.ancestorClustersForCluster(clusterId).forEach((id) => clusterIds.add(id));
    };

    const addItem = (id, includeDescendants) => {
      if (!id) return;
      if (hierarchy?.clusters?.has(id)) {
        addCluster(id);
        if (includeDescendants) {
          hierarchy.descendantClustersOfCluster(id).forEach((clusterId) => clusterIds.add(clusterId));
          hierarchy.descendantNodesOfCluster(id).forEach((node) => nodeIds.add(node));
        }
        return;
      }
      if (!hierarchy?.nodes?.has(id)) return;
      nodeIds.add(id);
      hierarchy.ancestorClustersForNode(id).forEach((clusterId) => clusterIds.add(clusterId));
    };

    addItem(nodeId, true);
    (explicitRelated || []).forEach((id) => addItem(id, true));
    const info = evidenceMap[nodeId] || {};
    (info.relatedNodeIds || []).forEach((id) => addItem(id, true));

    const seedNodes = new Set(nodeIds);
    (graph.edges || []).forEach((edge) => {
      if (seedNodes.has(edge.source)) addItem(edge.target, false);
      if (seedNodes.has(edge.target)) addItem(edge.source, false);
    });

    return { nodeIds, clusterIds };
  }

  function evidenceHtml(node, info) {
    const chips = [
      node.typeLabel,
      info.dimension,
      info.metric,
    ].filter(Boolean).map((item) => `<span>${esc(item)}</span>`).join('');
    const lines = (info.evidence || []).slice(0, 4)
      .map((line) => `<li>${esc(line)}</li>`)
      .join('');
    const source = (info.sources || []).slice(0, 2)
      .map((item) => `<span>${esc(item)}</span>`)
      .join('');
    return [
      '<div class="pto-model-training-hover-title">',
        '<div>',
          `<small>${esc(node.id)}</small>`,
          `<strong>${esc(node.label || node.id)}</strong>`,
        '</div>',
      '</div>',
      chips ? `<div class="pto-model-training-hover-chips">${chips}</div>` : '',
      info.what ? `<p>${esc(info.what)}</p>` : '',
      lines ? `<ul>${lines}</ul>` : '',
      info.action ? `<p><b>操作含义</b> ${esc(info.action)}</p>` : '',
      source ? `<div class="pto-model-training-hover-source">${source}</div>` : '',
    ].filter(Boolean).join('');
  }

  function applyTextContrast(entries) {
    entries.forEach(({ el, node }) => {
      const visualKind = node.kind || '';
      const label = el.querySelector('.pto-model-graphviz-node-label');
      const type = el.querySelector('.pto-model-graphviz-node-type');
      if (label) {
        label.setAttribute('dominant-baseline', visualKind === 'tensor' ? 'middle' : 'auto');
        label.style.paintOrder = 'stroke';
      }
      if (type) type.style.opacity = '0.92';
    });
  }

  function drawEdgeTags(svg, edges, edgeEntries) {
    const old = svg.querySelector('.pto-model-training-edge-tags');
    if (old) old.remove();
    const layer = svgEl('g', { class: 'pto-model-training-edge-tags' });
    edgeEntries.forEach((entry, index) => {
      const edge = edges[index] || entry.edge || {};
      const label = edgeTagText(edge);
      if (!label || !entry.el || typeof entry.el.getTotalLength !== 'function') return;
      let point;
      try {
        const length = entry.el.getTotalLength();
        if (!length) return;
        point = entry.el.getPointAtLength(length * 0.52);
      } catch (_) {
        return;
      }
      const width = edgeTagWidth(label);
      const height = 18;
      const group = svgEl('g', {
        class: 'pto-model-training-edge-tag',
        transform: `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`,
        'data-edge-type': normalizeEdgeType(edge),
        'aria-label': label,
      });
      group.appendChild(svgEl('rect', {
        x: -width / 2,
        y: -height / 2,
        width,
        height,
        rx: height / 2,
        ry: height / 2,
      }));
      const text = svgEl('text', {
        x: 0,
        y: 0.4,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      text.textContent = label;
      group.appendChild(text);
      layer.appendChild(group);
      entry.tagEl = group;
    });
    svg.appendChild(layer);
  }

  function createHover(stage) {
    const panel = document.createElement('div');
    panel.className = 'pto-model-training-hover';
    panel.setAttribute('aria-hidden', 'true');
    stage.appendChild(panel);
    return panel;
  }

  function placeHover(stage, panel, event) {
    const rect = stage.getBoundingClientRect();
    let x = event.clientX - rect.left + 16;
    let y = event.clientY - rect.top + 16;
    const width = panel.offsetWidth || 320;
    const height = panel.offsetHeight || 180;
    x = Math.max(10, Math.min(rect.width - width - 10, x));
    y = Math.max(10, Math.min(rect.height - height - 10, y));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  }

  function render(container, graph, options) {
    const stage = typeof container === 'string' ? document.querySelector(container) : container;
    if (!stage || !global.PtoModelGraphvizPattern) return null;
    const opts = options || {};
    const evidenceMap = opts.evidenceMap || graph?.trainingEvidence || {};
    const data = cloneGraph(graph, evidenceMap);
    const hierarchy = buildHierarchy(data);
    const width = opts.width || data.width || 760;
    const height = opts.height || data.height || 980;

    stage.classList.add('pto-model-training-graphviz');
    stage.dataset.trainingGraphviz = '1';
    stage.innerHTML = '';

    const svg = global.PtoModelGraphvizPattern.render(stage, data, {
      ariaLabel: opts.ariaLabel || 'Training model architecture graph',
      width,
      height,
      colormap: opts.colormap,
    });
    if (!svg) return null;
    svg.classList.add('pto-model-training-graphviz-svg');

    const nodeEls = Array.from(stage.querySelectorAll('.pto-model-graphviz-node'));
    const nodeEntries = nodeEls.map((el, index) => {
      const node = data.nodes[index];
      if (!node) return null;
      el.dataset.nodeId = node.id;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', node.label || node.id);
      if (evidenceMap[node.id]) el.classList.add('has-training-evidence');
      const semanticType = String(node.typeLabel || '').trim().toLowerCase();
      if (semanticType === 'parameter') el.classList.add('is-parameter-object');
      if (semanticType === 'state') el.classList.add('is-state-object');
      return { el, node };
    }).filter(Boolean);

    applyTextContrast(nodeEntries);

    const visibleEdges = dedupeVisibleEdges(data);
    const edgeEls = Array.from(stage.querySelectorAll('.pto-model-graphviz-edge'));
    const edgeEntries = edgeEls.map((el, index) => {
      const edge = visibleEdges[index] || {};
      return { el, edge, source: edge.source, target: edge.target, tagEl: null };
    });
    drawEdgeTags(svg, visibleEdges, edgeEntries);

    const clusterEls = Array.from(stage.querySelectorAll('.pto-model-graphviz-cluster'));
    const clusterEntries = clusterEls.map((el, index) => {
      const cluster = data.clusters?.[index];
      if (!cluster) return null;
      el.dataset.clusterId = cluster.id;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', cluster.label || cluster.id);
      return { el, cluster };
    }).filter(Boolean);

    const hover = createHover(stage);
    let selectedItemId = null;
    let selectedRelated = { nodeIds: new Set(), clusterIds: new Set() };
    let transform = { tx: 0, ty: 0, zoom: 1 };
    let pan = null;
    let suppressClick = false;
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

    function listen(target, type, handler, options) {
      const optsWithSignal = abortController
        ? { ...(options || {}), signal: abortController.signal }
        : options;
      target.addEventListener(type, handler, optsWithSignal);
    }

    function applyTransform() {
      svg.style.width = `${width}px`;
      svg.style.height = `${height}px`;
      svg.style.transform = `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.zoom})`;
    }

    function fit() {
      const rect = stage.getBoundingClientRect();
      const pad = Number.isFinite(Number(opts.viewportPadding)) ? Number(opts.viewportPadding) : 28;
      const widthFit = Math.max(120, rect.width - pad * 2) / width;
      const heightFit = Math.max(120, rect.height - pad * 2) / height;
      const readableFloor = Number.isFinite(Number(opts.minReadableZoom)) ? Number(opts.minReadableZoom) : 0.62;
      const fitZoom = opts.fitMode === 'full'
        ? Math.min(1.08, Math.max(MIN_ZOOM, Math.min(widthFit, heightFit)))
        : Math.min(1.08, Math.max(MIN_ZOOM, Math.min(widthFit, Math.max(heightFit, readableFloor))));
      transform.zoom = fitZoom;
      transform.tx = Math.max(pad / 2, (rect.width - width * fitZoom) / 2);
      transform.ty = height * fitZoom > rect.height
        ? pad / 2
        : Math.max(pad / 2, (rect.height - height * fitZoom) / 2);
      applyTransform();
    }

    function clearSelection() {
      selectedItemId = null;
      selectedRelated = { nodeIds: new Set(), clusterIds: new Set() };
      nodeEntries.forEach(({ el }) => {
        el.classList.remove('is-training-selected', 'is-training-related');
      });
      clusterEntries.forEach(({ el }) => {
        el.classList.remove('is-training-selected', 'is-training-related');
      });
      edgeEntries.forEach((entry) => {
        entry.el.classList.remove('is-training-related');
        if (entry.tagEl) {
          entry.tagEl.classList.remove('is-training-related');
        }
      });
    }

    function selectNode(nodeId, selectOptions) {
      const id = nodeId || null;
      if (!id) {
        clearSelection();
        return;
      }
      selectedItemId = id;
      selectedRelated = relationForNode(data, evidenceMap, id, selectOptions?.relatedNodeIds, hierarchy);
      nodeEntries.forEach(({ el, node }) => {
        const isSelected = node.id === id;
        const isRelated = selectedRelated.nodeIds.has(node.id);
        el.classList.toggle('is-training-selected', isSelected);
        el.classList.toggle('is-training-related', !isSelected && isRelated);
      });
      clusterEntries.forEach(({ el, cluster }) => {
        const isSelected = cluster.id === id;
        const isRelated = selectedRelated.clusterIds.has(cluster.id);
        el.classList.toggle('is-training-selected', isSelected);
        el.classList.toggle('is-training-related', !isSelected && isRelated);
      });
      edgeEntries.forEach((entry) => {
        const related = selectedRelated.nodeIds.has(entry.source) && selectedRelated.nodeIds.has(entry.target);
        entry.el.classList.toggle('is-training-related', related);
        if (entry.tagEl) {
          entry.tagEl.classList.toggle('is-training-related', related);
        }
      });
      opts.onSelect?.({
        nodeId: id,
        relatedNodeIds: Array.from(selectedRelated.nodeIds),
        relatedClusterIds: Array.from(selectedRelated.clusterIds),
        source: selectOptions?.source || 'graph',
      });
    }

    function showHover(node, event) {
      const info = evidenceMap[node.id] || {};
      hover.innerHTML = evidenceHtml(node, info);
      hover.classList.add('is-visible');
      hover.setAttribute('aria-hidden', 'false');
      placeHover(stage, hover, event);
    }

    function hideHover() {
      hover.classList.remove('is-visible');
      hover.setAttribute('aria-hidden', 'true');
    }

    nodeEntries.forEach(({ el, node }) => {
      listen(el, 'pointerenter', (event) => showHover(node, event));
      listen(el, 'pointermove', (event) => {
        if (hover.classList.contains('is-visible')) placeHover(stage, hover, event);
      });
      listen(el, 'pointerleave', hideHover);
      listen(el, 'click', () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        hideHover();
        selectNode(node.id, { source: 'graph' });
      });
      listen(el, 'keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectNode(node.id, { source: 'keyboard' });
      });
    });

    clusterEntries.forEach(({ el, cluster }) => {
      listen(el, 'click', () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        hideHover();
        selectNode(cluster.id, { source: 'cluster' });
      });
      listen(el, 'keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectNode(cluster.id, { source: 'keyboard' });
      });
    });

    listen(stage, 'wheel', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const z0 = transform.zoom;
      const z1 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z0 * factor));
      transform.tx = px - (px - transform.tx) * (z1 / z0);
      transform.ty = py - (py - transform.ty) * (z1 / z0);
      transform.zoom = z1;
      applyTransform();
    }, { passive: false });

    listen(stage, 'pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('.pto-model-graphviz-node, .pto-model-graphviz-toggle')) return;
      suppressClick = false;
      pan = { id: event.pointerId, x: event.clientX, y: event.clientY, tx: transform.tx, ty: transform.ty, moved: false };
    });

    listen(stage, 'pointermove', (event) => {
      if (!pan || pan.id !== event.pointerId) return;
      const dx = event.clientX - pan.x;
      const dy = event.clientY - pan.y;
      if (!pan.moved) {
        if (Math.hypot(dx, dy) < 4) return;
        pan.moved = true;
        stage.classList.add('is-panning');
        try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      }
      transform.tx = pan.tx + dx;
      transform.ty = pan.ty + dy;
      applyTransform();
      event.preventDefault();
    });

    function endPan(event) {
      if (!pan || pan.id !== event.pointerId) return;
      if (pan.moved) suppressClick = true;
      pan = null;
      stage.classList.remove('is-panning');
      if (stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
    }

    listen(stage, 'pointerup', endPan);
    listen(stage, 'pointercancel', endPan);
    listen(stage, 'lostpointercapture', endPan);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        if (!selectedItemId) fit();
      })
      : null;
    if (resizeObserver) resizeObserver.observe(stage);

    requestAnimationFrame(() => {
      fit();
      if (opts.activeNodeId) {
        selectNode(opts.activeNodeId, {
          relatedNodeIds: opts.activeRelatedNodeIds,
          source: 'init',
        });
      }
    });

    return {
      svg,
      graph: data,
      selectNode,
      setPhase(phase) {
        if (!phase) return;
        const nodeId = typeof phase === 'string' ? phase : phase.nodeId;
        selectNode(nodeId, {
          relatedNodeIds: typeof phase === 'string' ? null : phase.relatedNodeIds,
          source: 'phase',
        });
      },
      clearSelection,
      fit,
      destroy() {
        abortController?.abort();
        resizeObserver?.disconnect();
        stage.innerHTML = '';
      },
    };
  }

  global.PtoModelTrainingGraphvizPattern = {
    render,
  };
})(window);
