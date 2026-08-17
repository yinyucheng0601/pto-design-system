/* ============================================================
   Pattern: tensor-title  →  window.PtoTensorTitle
   Shared DOM header for tensor, matrix, and volume visualizations.

   PtoTensorTitle.render(host, scene, options) → controller
     scene = {
       label: string,
       role?: 'input' | 'output' | 'weight' | 'bias' | 'scratch' | 'temp' | 'reduction' | 'fusion' | 'broadcast' | 'aggregate',
       logicalShape?: string | { label, dims },
       physicalShape?: string | { label, dims },
       tileShape?: string | { label, dims },
       dtype?: string,
       format?: string,
       axes?: string[],
       memory?: { tier?, sizeBytes?, offset?, range?, stride?, alignment? },
       owner?: string,
       queueDepth?: number,
       partition?: { blockCount?, blockLength?, tileLength?, blockIndex?, tileIndex?, tileRange? },
       state?: string,
       direction?: string,
       provenance?: { symbol?, file?, line?, evidence? },
       step?: { phase?, operationChips?, stepIndex?, totalSteps? },
       constraints?: string[],
       status?: string,
     }
     options = { ariaLabel?, density?: 'full'|'compact', showRole?, showShapes?, showChips?, showStatus? }
     controller = { update(nextScene, nextOptions), destroy() }
   ============================================================ */
(function attachPtoTensorTitle(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    ariaLabel: '',
    density: 'full',
    showRole: true,
    showShapes: true,
    showChips: true,
    showStatus: true,
  });

  const ROLE_VALUES = new Set([
    'input',
    'output',
    'weight',
    'bias',
    'scratch',
    'temp',
    'reduction',
    'fusion',
    'broadcast',
    'aggregate',
  ]);

  function resolveHost(host) {
    const root = typeof host === 'string' ? global.document.querySelector(host) : host;
    if (!root) throw new TypeError('PtoTensorTitle.render expects a host element or selector.');
    return root;
  }

  function normalizeScene(scene) {
    if (!scene || typeof scene !== 'object') throw new TypeError('PtoTensorTitle.render expects a scene object.');
    const label = typeof scene.label === 'string' ? scene.label.trim() : '';
    if (!label) throw new TypeError('PtoTensorTitle.render expects scene.label to be a non-empty string.');
    const role = ROLE_VALUES.has(scene.role) ? scene.role : null;
    return {
      label,
      role,
      logicalShape: normalizeShape(scene.logicalShape),
      physicalShape: normalizeShape(scene.physicalShape),
      tileShape: normalizeShape(scene.tileShape),
      dtype: toTrimmed(scene.dtype),
      format: toTrimmed(scene.format),
      axes: Array.isArray(scene.axes) ? scene.axes.map(toTrimmed).filter(Boolean) : [],
      memory: scene.memory && typeof scene.memory === 'object' ? scene.memory : null,
      owner: toTrimmed(scene.owner),
      queueDepth: Number.isFinite(scene.queueDepth) ? scene.queueDepth : null,
      partition: scene.partition && typeof scene.partition === 'object' ? scene.partition : null,
      state: toTrimmed(scene.state),
      direction: toTrimmed(scene.direction),
      provenance: scene.provenance && typeof scene.provenance === 'object' ? scene.provenance : null,
      step: scene.step && typeof scene.step === 'object' ? scene.step : null,
      constraints: Array.isArray(scene.constraints) ? scene.constraints.map(toTrimmed).filter(Boolean) : [],
      status: toTrimmed(scene.status),
    };
  }

  function normalizeShape(value) {
    if (!value) return null;
    if (typeof value === 'string') return { label: value.trim(), dims: null };
    if (Array.isArray(value)) return { label: null, dims: value };
    if (typeof value === 'object') {
      return {
        label: toTrimmed(value.label),
        dims: Array.isArray(value.dims) ? value.dims : null,
      };
    }
    return null;
  }

  function toTrimmed(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function appendElement(parent, className, tagName) {
    const el = global.document.createElement(tagName || 'span');
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  }

  function appendText(parent, value) {
    if (value === null || value === undefined || value === '') return;
    parent.appendChild(global.document.createTextNode(String(value)));
  }

  function appendMeta(parent, className, value) {
    const el = appendElement(parent, className);
    appendText(el, value);
    return el;
  }

  function appendShape(parent, shape) {
    const el = appendElement(parent, 'pto-tensor-title__shape');
    if (shape.label) {
      const b = appendElement(el, '', 'b');
      appendText(b, shape.label);
    }
    if (shape.dims && shape.dims.length) appendText(el, ` [${shape.dims.join(', ')}]`);
    else if (!shape.label) appendText(el, 'shape');
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KiB', 'MiB', 'GiB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${units[unit]}`;
  }

  function renderPrimary(root, data, options) {
    const primary = appendElement(root, 'pto-tensor-title__primary', 'div');
    appendMeta(primary, 'pto-tensor-title__label', data.label);
    if (options.showRole && data.role) appendMeta(primary, 'pto-tensor-title__role', data.role);
    if (data.direction) appendMeta(primary, 'pto-tensor-title__direction', data.direction);
  }

  function renderMeta(root, data, options) {
    const meta = appendElement(root, 'pto-tensor-title__meta', 'div');
    if (options.showShapes) {
      [data.logicalShape, data.physicalShape, data.tileShape].forEach((shape) => {
        if (shape) appendShape(meta, shape);
      });
    }
    if (data.dtype) appendMeta(meta, 'pto-tensor-title__dtype', data.dtype);
    if (data.format) appendMeta(meta, 'pto-tensor-title__format', data.format);
    if (data.axes.length) appendMeta(meta, 'pto-tensor-title__axis', data.axes.join(' / '));
  }

  function renderChips(root, data, options) {
    if (!options.showChips) return;
    const chips = appendElement(root, 'pto-tensor-title__chips', 'div');
    if (data.memory) {
      const memoryLabel = [data.memory.tier, formatBytes(data.memory.sizeBytes)]
        .map(toTrimmed)
        .filter(Boolean)
        .join(' · ');
      if (memoryLabel) appendMeta(chips, 'pto-tensor-title__chip', memoryLabel);
      if (data.memory.offset !== null && data.memory.offset !== undefined) {
        appendMeta(chips, 'pto-tensor-title__chip', `offset ${data.memory.offset}`);
      }
      if (data.memory.range) appendMeta(chips, 'pto-tensor-title__chip', `range ${data.memory.range}`);
      if (data.memory.stride) appendMeta(chips, 'pto-tensor-title__chip', `stride ${data.memory.stride}`);
      if (data.memory.alignment !== null && data.memory.alignment !== undefined) {
        appendMeta(chips, 'pto-tensor-title__chip', `${data.memory.alignment}B aligned`);
      }
    }
    if (data.owner) {
      appendMeta(chips, 'pto-tensor-title__chip', data.queueDepth !== null ? `${data.owner} · depth ${data.queueDepth}` : data.owner);
    }
    if (data.partition) {
      const parts = [];
      if (data.partition.blockCount !== null && data.partition.blockCount !== undefined && data.partition.blockLength !== null && data.partition.blockLength !== undefined) {
        parts.push(`${data.partition.blockCount} blocks × ${data.partition.blockLength}`);
      }
      if (data.partition.tileLength !== null && data.partition.tileLength !== undefined) {
        parts.push(`tile ${data.partition.tileLength}`);
      }
      if (data.partition.blockIndex !== null && data.partition.blockIndex !== undefined) {
        parts.push(`block ${data.partition.blockIndex}`);
      }
      if (data.partition.tileIndex !== null && data.partition.tileIndex !== undefined) {
        parts.push(`tile ${data.partition.tileIndex}`);
      }
      if (parts.length) appendMeta(chips, 'pto-tensor-title__chip', parts.join(' · '));
      if (data.partition.tileRange) appendMeta(chips, 'pto-tensor-title__chip', `range ${data.partition.tileRange}`);
    }
    if (data.state) appendMeta(chips, 'pto-tensor-title__state', data.state);
    if (data.step && Array.isArray(data.step.operationChips)) {
      data.step.operationChips.map(toTrimmed).filter(Boolean).forEach((operation) => {
        appendMeta(chips, 'pto-tensor-title__chip', operation);
      });
    }
  }

  function renderFooter(root, data) {
    const footer = appendElement(root, 'pto-tensor-title__footer', 'div');
    data.constraints.forEach((constraint) => {
      appendMeta(footer, 'pto-tensor-title__constraint', constraint);
    });
    if (data.provenance) {
      const parts = [];
      if (data.provenance.file) {
        parts.push(data.provenance.line !== null && data.provenance.line !== undefined
          ? `${data.provenance.file}:${data.provenance.line}`
          : data.provenance.file);
      }
      if (data.provenance.symbol) parts.push(data.provenance.symbol);
      if (data.provenance.evidence) parts.push(data.provenance.evidence);
      if (parts.length) appendMeta(footer, 'pto-tensor-title__source', parts.join(' · '));
    }
  }

  function renderStatus(root, data, options) {
    if (!options.showStatus) return;
    let status = data.status;
    if (!status && data.step && data.step.totalSteps !== null && data.step.totalSteps !== undefined) {
      const stepIndex = data.step.stepIndex !== null && data.step.stepIndex !== undefined ? data.step.stepIndex : 1;
      status = `${data.step.phase || 'step'} ${stepIndex}/${data.step.totalSteps}`;
    }
    if (status) appendMeta(root, 'pto-tensor-title__status', status);
  }

  function render(host, scene, options) {
    const root = resolveHost(host);
    const mergedOptions = { ...DEFAULTS, ...(options || {}) };
    root.classList.add('pto-tensor-title');
    root.setAttribute('role', 'group');

    function paint(nextScene, nextOptions) {
      const data = normalizeScene(nextScene);
      const opt = { ...mergedOptions, ...(nextOptions || {}) };
      root.setAttribute('aria-label', opt.ariaLabel || data.label);
      root.setAttribute('data-density', opt.density === 'compact' ? 'compact' : 'full');
      root.innerHTML = '';

      const body = appendElement(root, 'pto-tensor-title__body', 'div');
      renderPrimary(body, data, opt);
      renderMeta(body, data, opt);
      renderChips(body, data, opt);
      renderFooter(body, data);
      renderStatus(root, data, opt);
      return opt;
    }

    paint(scene, null);

    return {
      update(nextScene, nextOptions) {
        paint(nextScene, nextOptions);
        return this;
      },
      destroy() {
        root.innerHTML = '';
        root.removeAttribute('role');
        root.removeAttribute('aria-label');
        root.removeAttribute('data-density');
        root.classList.remove('pto-tensor-title');
      },
    };
  }

  global.PtoTensorTitle = Object.freeze({ render });
})(window);
