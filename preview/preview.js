// PyPTO Design System - Preview interactivity
// Extracted from design-system-preview.html inline <script>.
// Preview-only behavior (theme/accent/filter switching, pattern iframe lazy-load).

    (() => {
      const root = document.documentElement;
      const themeButtons = Array.from(document.querySelectorAll('[data-theme-mode]'));
      const categoryLinks = Array.from(document.querySelectorAll('[data-filter]'));
      const blockCards = Array.from(document.querySelectorAll('.preview-section[data-categories]'));
      const scopeButtons = Array.from(document.querySelectorAll('[data-accent-scope]'));
      const accentInput = document.getElementById('accentInput');
      const accentPicker = document.getElementById('accentPicker');
      const paletteNeutralCard = document.getElementById('paletteNeutralCard');
      const paletteHighlightGrid = document.getElementById('paletteHighlightGrid');
      const patternPreviewFrames = Array.from(document.querySelectorAll('[data-pattern-preview]'));
      const modelArchitectureTabs = Array.from(document.querySelectorAll('[data-model-architecture-tab]'));
      const modelArchitecturePanels = Array.from(document.querySelectorAll('[data-model-architecture-panel]'));
      const fixedPatternPreviewIds = new Set([
        'swimlane-task',
        'tensor-volume-canvas',
        'memory-reuse-viewer',
        'memory-architecture',
        'hardware-architecture-viewport',
        'model-architecture-3d-deck',
        'model-parallel-rank-deck',
        'moe-routing',
        'model-architecture-training-sidecar',
        'aic-core-object',
        'aiv-core-object',
        'pass-ir-graph-node',
        'training-metrics-chart',
        'workbench-shell',
        'ide-frame',
        'floating-playback-control',
        'model-architecture-qwen7b',
        'model-architecture-openpangu-2-0-flash',
        'model-architecture-openpangu-r-72b',
      ]);
      let accentScope = 'accent';

      const STORAGE_KEYS = {
        theme: 'pto-preview-theme',
        accentScope: 'pto-preview-accent-scope',
        accent: 'pto-preview-accent',
        filter: 'pto-preview-filter',
      };

      const THEME_MODES = new Set(['dark', 'light', 'glass']);
      const PALETTE_STEPS = ['0', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];
      const NEUTRAL_RAMP = {
        title: 'Neutral 0-1000',
        subtitle: '纯中性灰，不带蓝紫偏色。用于白/灰/黑基线、文档化 token 对照，以及后续 light theme 扩展。',
        sourceLabel: 'white-gray-black',
        sourceColor: '#999999',
        tone: 'neutral',
        values: {
          0: '#FFFFFF',
          100: '#F2F2F2',
          200: '#E6E6E6',
          300: '#CCCCCC',
          400: '#B3B3B3',
          500: '#999999',
          600: '#808080',
          700: '#666666',
          800: '#4D4D4D',
          900: '#333333',
          1000: '#000000',
        },
      };
      const HIGHLIGHT_RAMPS = [
        {
          title: 'copy-blue',
          subtitle: 'mem-viewer `L1 / copy-in` 图例',
          sourceLabel: '#3577F6',
          sourceColor: '#3577F6',
          values: { 0: '#F5F8FF', 100: '#DDE8FD', 200: '#B1CAFC', 300: '#76A3F9', 400: '#3C7CF6', 500: '#0B5BF4', 600: '#094CCD', 700: '#073CA1', 800: '#052C75', 900: '#031D4E', 1000: '#020F27' },
        },
        {
          title: 'l0a-violet',
          subtitle: 'mem-viewer `L0A` 块',
          sourceLabel: '#A855F7',
          sourceColor: '#A855F7',
          values: { 0: '#FAF5FF', 100: '#EEDDFD', 200: '#D7B1FB', 300: '#B977F9', 400: '#9B3CF6', 500: '#820BF4', 600: '#6E0ACD', 700: '#5608A1', 800: '#3F0675', 900: '#2A044E', 1000: '#150227' },
        },
        {
          title: 'l0b-deep-violet',
          subtitle: 'mem-viewer `L0B` 块',
          sourceLabel: '#4F46E5',
          sourceColor: '#4F46E5',
          values: { 0: '#F6F7FF', 100: '#E0E2FF', 200: '#BFC3FF', 300: '#959BFF', 400: '#6A71FF', 500: '#4F46E5', 600: '#4338CA', 700: '#3730A3', 800: '#2A257A', 900: '#1C1953', 1000: '#0E0C2C' },
        },
        {
          title: 'accum-orange',
          subtitle: 'mem-viewer `L0C / accum` 图例',
          sourceLabel: '#F97316',
          sourceColor: '#F97316',
          values: { 0: '#FFF9F5', 100: '#FEEADC', 200: '#FDCFAF', 300: '#FBAB74', 400: '#FA8838', 500: '#F96A06', 600: '#D15905', 700: '#A44604', 800: '#773303', 900: '#502202', 1000: '#281101' },
        },
        {
          title: 'ub-green',
          subtitle: 'mem-viewer `UB / vector tile` 图例',
          sourceLabel: '#87C80F',
          sourceColor: '#87C80F',
          values: { 0: '#FBFEF6', 100: '#F2FDDE', 200: '#E1F9B3', 300: '#CAF57A', 400: '#B3F141', 500: '#A0ED12', 600: '#86C70F', 700: '#6A9D0C', 800: '#4D7209', 900: '#334C06', 1000: '#1A2603' },
        },
        {
          title: 'mte-amber',
          subtitle: 'mem-viewer `MTE2 / MTE3` 图例',
          sourceLabel: '#EAB308',
          sourceColor: '#EAB308',
          values: { 0: '#FFFDF3', 100: '#FEF6D8', 200: '#FDEB9D', 300: '#FBDC59', 400: '#F4CB22', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12', 1000: '#422006' },
        },
      ];

      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

      const hexToRgb = (hex) => {
        const normalized = hex.replace('#', '').trim();
        if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
        return {
          r: parseInt(normalized.slice(0, 2), 16),
          g: parseInt(normalized.slice(2, 4), 16),
          b: parseInt(normalized.slice(4, 6), 16),
        };
      };

      const rgbToHex = ({ r, g, b }) =>
        `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

      const mixRgb = (rgb, target, ratio) => ({
        r: rgb.r * (1 - ratio) + target.r * ratio,
        g: rgb.g * (1 - ratio) + target.g * ratio,
        b: rgb.b * (1 - ratio) + target.b * ratio,
      });

      const toRgba = (rgb, alpha) => `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;

      const relativeLuminance = ({ r, g, b }) => {
        const convert = (value) => {
          const channel = value / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
      };

      const renderRampStops = (values, tone = '') => PALETTE_STEPS.map((step) => `
        <div class="palette-stop ${tone === 'neutral' ? 'palette-stop-tone-neutral' : ''}">
          <div class="palette-chip" style="--palette-color:${values[step]}"></div>
          <div class="palette-step">${step}</div>
          <div class="palette-hex">${values[step]}</div>
        </div>
      `).join('');

      const renderRampCard = ({ title, subtitle, sourceLabel, sourceColor, values, tone = '' }) => `
        <div class="palette-ramp-head">
          <div>
            <div class="palette-ramp-title">${title}</div>
            <div class="palette-ramp-sub">${subtitle}</div>
          </div>
          <div class="palette-source" style="--palette-source-color:${sourceColor}">
            <span class="palette-source-dot"></span>
            ${sourceLabel}
          </div>
        </div>
        <div class="palette-ramp">
          ${renderRampStops(values, tone)}
        </div>
      `;

      const renderPaletteSection = () => {
        if (paletteNeutralCard) {
          paletteNeutralCard.innerHTML = renderRampCard(NEUTRAL_RAMP);
        }
        if (paletteHighlightGrid) {
          paletteHighlightGrid.innerHTML = HIGHLIGHT_RAMPS.map((ramp) => `
            <div class="palette-ramp-card">${renderRampCard(ramp)}</div>
          `).join('');
        }
      };

      // Height auto-resize only applies to frames NOT in fixedPatternPreviewIds.
      // Every currently visible embed uses an explicit CSS height (see preview.css
      // `#pattern-previews .preview-embed-frame[data-pattern-preview=...]`); this
      // message path is reserved for future auto-sized pattern embeds.
      const applyPatternPreviewHeight = (pathname, height) => {
        if (!pathname || !Number.isFinite(height)) return;
        patternPreviewFrames.forEach((iframe) => {
          try {
            const iframePath = new URL(iframe.src, window.location.href).pathname;
            if (iframePath === pathname) {
              if (fixedPatternPreviewIds.has(iframe.dataset.patternPreview)) {
                iframe.style.height = '';
                return;
              }
              const currentHeight = iframe.getBoundingClientRect().height || iframe.clientHeight || 0;
              const nextHeight = Math.max(40, Math.ceil(height));
              const delta = nextHeight - currentHeight;
              if (Math.abs(delta) <= 1 || (delta > 0 && delta <= 8)) return;
              iframe.style.height = `${nextHeight}px`;
            }
          } catch (_error) {
            // Ignore malformed local preview URLs.
          }
        });
      };

      const syncPatternPreviewTheme = (iframe) => {
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage({
          type: 'pto-preview-theme',
          theme: root.dataset.theme || 'dark',
        }, '*');
      };

      const resolvePatternPreviewSource = (iframe, source) => {
        if (iframe?.dataset.syncThemeParam !== 'true') return source;
        try {
          const url = new URL(source, window.location.href);
          url.searchParams.set('theme', root.dataset.theme || 'dark');
          return url.href;
        } catch (_error) {
          return source;
        }
      };

      const refreshPatternPreviewThemeParam = (iframe) => {
        if (!iframe || iframe.dataset.loaded !== 'true' || iframe.dataset.syncThemeParam !== 'true') return;
        const source = iframe.dataset.src;
        if (!source) return;
        const nextSource = resolvePatternPreviewSource(iframe, source);
        if (iframe.src !== nextSource) {
          iframe.src = nextSource;
        }
      };

      const loadPatternPreviewFrame = (iframe) => {
        if (!iframe || iframe.dataset.loaded === 'true') return;
        const source = iframe.dataset.src;
        if (!source) return;
        iframe.dataset.loaded = 'true';
        iframe.src = resolvePatternPreviewSource(iframe, source);
      };

      const selectModelArchitecture = (id) => {
        modelArchitectureTabs.forEach((tab) => {
          const active = tab.dataset.modelArchitectureTab === id;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
        });
        modelArchitecturePanels.forEach((panel) => {
          const active = panel.dataset.modelArchitecturePanel === id;
          panel.hidden = !active;
          panel.classList.toggle('is-active', active);
          if (!active) return;
          panel.querySelectorAll('[data-pattern-preview]').forEach(loadPatternPreviewFrame);
        });
      };

      const focusModelArchitectureTab = (index) => {
        if (!modelArchitectureTabs.length) return;
        const nextIndex = (index + modelArchitectureTabs.length) % modelArchitectureTabs.length;
        const tab = modelArchitectureTabs[nextIndex];
        tab.focus();
        selectModelArchitecture(tab.dataset.modelArchitectureTab);
      };

      patternPreviewFrames.forEach((iframe) => {
        iframe.addEventListener('load', () => {
          if (fixedPatternPreviewIds.has(iframe.dataset.patternPreview)) {
            iframe.style.height = '';
          }
          syncPatternPreviewTheme(iframe);
        });
      });

      modelArchitectureTabs.forEach((tab, index) => {
        tab.tabIndex = tab.classList.contains('is-active') ? 0 : -1;
        tab.addEventListener('click', () => {
          selectModelArchitecture(tab.dataset.modelArchitectureTab);
        });
        tab.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            focusModelArchitectureTab(index + 1);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            focusModelArchitectureTab(index - 1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            focusModelArchitectureTab(0);
          } else if (event.key === 'End') {
            event.preventDefault();
            focusModelArchitectureTab(modelArchitectureTabs.length - 1);
          }
        });
      });

      if ('IntersectionObserver' in window) {
        const patternFrameObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            loadPatternPreviewFrame(entry.target);
            observer.unobserve(entry.target);
          });
        }, { rootMargin: '600px 0px' });
        patternPreviewFrames.forEach((iframe) => patternFrameObserver.observe(iframe));
      } else {
        patternPreviewFrames.forEach(loadPatternPreviewFrame);
      }

      window.addEventListener('message', (event) => {
        const data = event.data;
        if (data?.type === 'pto-pattern-preview-wheel') {
          window.scrollBy({
            top: data.deltaY || 0,
            left: data.deltaX || 0,
            behavior: 'auto',
          });
          return;
        }
        if (!data || data.type !== 'pto-pattern-preview-height') return;
        applyPatternPreviewHeight(data.pathname, data.height);
      });

      const setCategoryFilter = (filter) => {
        const activeFilter = filter || 'featured';
        try {
          localStorage.setItem(STORAGE_KEYS.filter, activeFilter);
        } catch (_error) { /* storage may be unavailable */ }
        categoryLinks.forEach((link) => {
          const active = link.dataset.filter === activeFilter;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
        blockCards.forEach((card) => {
          const categories = (card.dataset.categories || '').split(/\s+/);
          const visible = activeFilter === 'all' || categories.includes(activeFilter);
          card.hidden = !visible;
        });
      };

      const applyTheme = (mode) => {
        root.dataset.theme = mode;
        try {
          localStorage.setItem(STORAGE_KEYS.theme, mode);
          const url = new URL(window.location.href);
          url.searchParams.set('theme', mode);
          history.replaceState(null, '', url.href);
        } catch (_error) { /* storage / history may be unavailable on file:// */ }
        themeButtons.forEach((button) => {
          const isActive = button.dataset.themeMode === mode;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
        patternPreviewFrames.forEach(syncPatternPreviewTheme);
        patternPreviewFrames.forEach(refreshPatternPreviewThemeParam);
      };

      const getInitialTheme = () => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.theme);
          if (saved && THEME_MODES.has(saved)) return saved;
        } catch (_error) { /* ignore */ }
        const requestedTheme = new URLSearchParams(window.location.search).get('theme');
        return THEME_MODES.has(requestedTheme) ? requestedTheme : 'dark';
      };

      const clearAccentOverrides = () => {
        [
          '--primary',
          '--primary-hover',
          '--primary-foreground',
          '--accent',
          '--focus-ring',
          '--state-selected',
          '--state-focus',
          '--button-primary-bg',
          '--button-primary-bg-hover',
          '--button-primary-bg-press',
          '--button-primary-fg',
          '--button-solid-bg',
          '--button-solid-bg-hover',
          '--button-solid-bg-press',
          '--button-solid-fg',
          '--ide-frame-selected-bg',
          '--ide-frame-selected-border',
        ].forEach((token) => root.style.removeProperty(token));
      };

      const applyAccent = (hex) => {
        const rgb = hexToRgb(hex);
        if (!rgb) return false;
        try {
          localStorage.setItem(STORAGE_KEYS.accent, rgbToHex(rgb));
        } catch (_error) { /* ignore */ }

        const hover = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.12);
        const press = mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.12);
        const primaryForeground = relativeLuminance(rgb) > 0.42 ? '#101418' : '#F8FBFF';

        clearAccentOverrides();
        root.dataset.accentScope = accentScope;

        if (accentScope === 'accent') {
          root.style.setProperty('--primary', rgbToHex(rgb));
          root.style.setProperty('--primary-hover', rgbToHex(hover));
          root.style.setProperty('--primary-foreground', primaryForeground);
          root.style.setProperty('--accent', rgbToHex(rgb));
          root.style.setProperty('--focus-ring', toRgba(rgb, 0.42));
          root.style.setProperty('--state-selected', toRgba(rgb, 0.16));
          root.style.setProperty('--state-focus', toRgba(rgb, 0.22));
          root.style.setProperty('--button-primary-bg', rgbToHex(rgb));
          root.style.setProperty('--button-primary-bg-hover', rgbToHex(hover));
          root.style.setProperty('--button-primary-bg-press', rgbToHex(press));
          root.style.setProperty('--button-primary-fg', primaryForeground);
          root.style.setProperty('--button-solid-bg', rgbToHex(rgb));
          root.style.setProperty('--button-solid-bg-hover', rgbToHex(hover));
          root.style.setProperty('--button-solid-bg-press', rgbToHex(press));
          root.style.setProperty('--button-solid-fg', primaryForeground);
          root.style.setProperty('--ide-frame-selected-bg', toRgba(rgb, 0.16));
          root.style.setProperty('--ide-frame-selected-border', toRgba(rgb, 0.36));
          return true;
        }

        root.style.setProperty('--button-primary-bg', 'var(--foreground)');
        root.style.setProperty('--button-primary-bg-hover', 'color-mix(in srgb, var(--foreground) 95%, black)');
        root.style.setProperty('--button-primary-bg-press', 'color-mix(in srgb, var(--foreground) 90%, black)');
        root.style.setProperty('--button-primary-fg', 'var(--background)');
        root.style.setProperty('--button-solid-bg', 'var(--foreground)');
        root.style.setProperty('--button-solid-bg-hover', 'color-mix(in srgb, var(--foreground) 88%, transparent)');
        root.style.setProperty('--button-solid-bg-press', 'color-mix(in srgb, var(--foreground) 80%, transparent)');
        root.style.setProperty('--button-solid-fg', 'var(--background)');
        return true;
      };

      themeButtons.forEach((button) => {
        button.addEventListener('click', () => applyTheme(button.dataset.themeMode));
      });

      categoryLinks.forEach((link) => {
        link.addEventListener('click', () => {
          setCategoryFilter(link.dataset.filter);
        });
      });

      // "显示/隐藏被覆盖模式" toggle: reveals the pattern cards that are
      // collapsed with data-preview-hidden="covered-by-*".
      const revealCoveredButton = document.querySelector('.preview-reveal-covered');
      const coveredCards = Array.from(document.querySelectorAll('[data-preview-hidden]'));
      revealCoveredButton?.addEventListener('click', () => {
        const expand = revealCoveredButton.getAttribute('aria-expanded') !== 'true';
        coveredCards.forEach((card) => {
          card.hidden = !expand;
        });
        revealCoveredButton.setAttribute('aria-expanded', String(expand));
        revealCoveredButton.textContent = expand ? '隐藏被覆盖模式' : '显示被覆盖模式';
      });

      scopeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          accentScope = button.dataset.accentScope;
          try {
            localStorage.setItem(STORAGE_KEYS.accentScope, accentScope);
          } catch (_error) { /* ignore */ }
          scopeButtons.forEach((item) => {
            item.classList.toggle('is-active', item === button);
          });
          applyAccent(accentPicker.value);
        });
      });

      accentPicker.addEventListener('input', () => {
        accentInput.value = accentPicker.value.toUpperCase();
        applyAccent(accentPicker.value);
      });

      accentInput.addEventListener('change', () => {
        const value = accentInput.value.trim().startsWith('#') ? accentInput.value.trim() : `#${accentInput.value.trim()}`;
        if (applyAccent(value)) {
          const normalized = value.toUpperCase();
          accentInput.value = normalized;
          accentPicker.value = normalized;
        }
      });

      try {
        accentScope = localStorage.getItem(STORAGE_KEYS.accentScope) === 'default' ? 'default' : 'accent';
      } catch (_error) { /* ignore */ }
      try {
        const savedAccent = localStorage.getItem(STORAGE_KEYS.accent);
        if (savedAccent && hexToRgb(savedAccent)) {
          accentInput.value = savedAccent;
          accentPicker.value = savedAccent;
        }
      } catch (_error) { /* ignore */ }
      let initialFilter = 'featured';
      try {
        initialFilter = localStorage.getItem(STORAGE_KEYS.filter) || 'featured';
      } catch (_error) { /* ignore */ }
      applyTheme(getInitialTheme());
      renderPaletteSection();
      scopeButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.accentScope === accentScope);
      });
      applyAccent(accentPicker.value);
      setCategoryFilter(initialFilter);
    })();