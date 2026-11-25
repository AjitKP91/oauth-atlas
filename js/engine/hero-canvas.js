// ==========================================================================
// OAUTH ATLAS — Interactive "8 Flows -> 1 POST /token Hub" Live Convergence Map
// ==========================================================================

import { FLOWS } from '../data/flows.js?v=4.3';
import { escapeHtml } from './jwt-xray.js?v=4.3';
import { sound } from './sound.js?v=4.3';

const HUB = { x: 260, y: 172 };

// Symmetrical radial layout with generous top/bottom padding inside viewBox 520x340
const STATION_COORDS = [
  { x: 66, y: 74, align: 'start', lx: -12, ly: -22 },   // 1 Auth Code
  { x: 174, y: 50, align: 'middle', lx: 0, ly: -22 },   // 2 Client Creds
  { x: 52, y: 172, align: 'start', lx: -6, ly: -24 },   // 3 Refresh
  { x: 346, y: 50, align: 'middle', lx: 0, ly: -22 },   // 4 JWT Bearer
  { x: 454, y: 74, align: 'end', lx: 12, ly: -22 },     // 5 SAML 2.0
  { x: 468, y: 172, align: 'end', lx: 6, ly: -24 },     // 6 Token Exchange
  { x: 88, y: 274, align: 'start', lx: -8, ly: 30 },    // 7 Device Flow
  { x: 432, y: 274, align: 'end', lx: 8, ly: 30 }       // 8 CIBA
];

export function mountHeroConvergence({ mapWrap, previewWrap, onSelectFlow }) {
  if (!mapWrap || !previewWrap) return;

  let activeIdx = 0;
  let rafId = null;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pulseOffsets = FLOWS.map((_, i) => (i * 0.137) % 1);

  function buildCurveD(st) {
    const mx = (st.x + HUB.x) / 2;
    const my = (st.y + HUB.y) / 2 + (st.y < HUB.y ? 14 : st.y > HUB.y ? -14 : 0);
    return `M ${st.x} ${st.y} Q ${mx} ${my} ${HUB.x} ${HUB.y}`;
  }

  function renderMap() {
    const tracksHtml = FLOWS.map((f, i) => {
      const st = STATION_COORDS[i];
      const d = buildCurveD(st);
      const isActive = i === activeIdx;
      return `
        <g class="hub-track-group" data-hub-idx="${i}" style="cursor:pointer">
          <!-- Wide invisible hit target so clicking anywhere on a track works reliably -->
          <path d="${d}" fill="none" stroke="transparent" stroke-width="20" />
          <path id="hub-path-${i}" d="${d}" fill="none" stroke="${f.accent}"
            stroke-width="${isActive ? 3.4 : 1.7}"
            stroke-opacity="${isActive ? 0.95 : 0.42}"
            stroke-linecap="round"
            ${isActive ? 'filter="url(#hub-glow)"' : ''} />
        </g>
      `;
    }).join('');

    const pulsesHtml = FLOWS.map(
      (f, i) => `
      <circle id="hub-pulse-${i}" r="${i === activeIdx ? 4.4 : 3}" fill="#ffffff" stroke="${f.accent}" stroke-width="2" filter="url(#hub-glow)" pointer-events="none"/>
    `
    ).join('');

    const stationsHtml = FLOWS.map((f, i) => {
      const st = STATION_COORDS[i];
      const isActive = i === activeIdx;
      const hitX = st.align === 'start' ? -22 : st.align === 'end' ? -86 : -54;
      const hitY = st.ly < 0 ? -38 : -20;
      return `
        <g class="hub-station" data-hub-idx="${i}" transform="translate(${st.x}, ${st.y})" style="cursor:pointer">
          <rect x="${hitX}" y="${hitY}" width="108" height="62" rx="12" fill="transparent" />
          ${isActive ? `<circle r="19" fill="none" stroke="${f.accent}" stroke-width="1.5" opacity="0.55" pointer-events="none" />` : ''}
          <circle r="${isActive ? 14 : 12}" fill="${isActive ? f.accent : 'var(--stage-hub-node)'}" stroke="${f.accent}" stroke-width="2" pointer-events="none" />
          <text text-anchor="middle" y="4" fill="${isActive ? '#060913' : 'var(--stage-node-title)'}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="800" pointer-events="none">${f.num}</text>
          <text x="${st.lx}" y="${st.ly}" text-anchor="${st.align}" fill="${isActive ? 'var(--stage-hub-text-active)' : 'var(--stage-hub-text)'}" font-family="Plus Jakarta Sans, sans-serif" font-size="10.5" font-weight="${isActive ? 800 : 600}" pointer-events="none">${escapeHtml(f.shortName)}</text>
        </g>
      `;
    }).join('');

    mapWrap.innerHTML = `
      <svg viewBox="0 0 520 340" style="position:relative;z-index:1;width:100%;height:auto;display:block" role="img" aria-label="8 OAuth grant flows converging on POST /token">
        <defs>
          <filter id="hub-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        ${tracksHtml}
        ${pulsesHtml}
        ${stationsHtml}
        <!-- Central POST /token Vault Hub -->
        <g transform="translate(${HUB.x}, ${HUB.y})">
          <circle r="38" fill="var(--stage-hub-bg)" stroke="${FLOWS[activeIdx].accent}" stroke-width="2.4" filter="url(#hub-glow)" />
          <circle r="44" fill="none" stroke="${FLOWS[activeIdx].accent}" stroke-width="1" stroke-dasharray="4 4" opacity="0.55" />
          <text text-anchor="middle" y="-4" fill="var(--stage-node-title)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="800">POST</text>
          <text text-anchor="middle" y="12" fill="var(--stage-ch-local)" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="800">/token</text>
        </g>
      </svg>
    `;

    mapWrap.querySelectorAll('[data-hub-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const next = Number(el.dataset.hubIdx);
        if (next !== activeIdx) {
          activeIdx = next;
          sound.playTone('local');
          renderMap();
          renderPreview();
        }
      });
    });

    startPulseLoop();
  }

  function renderPreview() {
    const f = FLOWS[activeIdx];
    previewWrap.innerHTML = `
      <div class="hub-preview-card" style="border-color:${f.accent}55;--hub-c:${f.accent}">
        <div class="hub-preview-top">
          <div class="hub-preview-num" style="background:${f.accent};color:#060913">${f.num}</div>
          <div class="hub-preview-title">${escapeHtml(f.name)}</div>
          <button type="button" class="stage-btn primary" id="hub-launch-btn" style="background:${f.accent};color:#060913;font-weight:800;flex-shrink:0">Launch →</button>
        </div>
        <div class="hub-preview-meta">
          <div class="hub-preview-grant">${escapeHtml(f.grantType)}</div>
          <div class="hub-preview-use">${escapeHtml(f.primaryUse)}</div>
        </div>
      </div>
    `;
    previewWrap.querySelector('#hub-launch-btn').addEventListener('click', () => {
      if (onSelectFlow) onSelectFlow(f.id);
    });
    document.querySelectorAll('.hero-line-dot[data-hero-flow]').forEach(dot => {
      dot.classList.toggle('is-active', dot.dataset.heroFlow === f.id);
    });
  }

  function startPulseLoop() {
    cancelAnimationFrame(rafId);
    const paths = FLOWS.map((_, i) => mapWrap.querySelector(`#hub-path-${i}`));
    const dots = FLOWS.map((_, i) => mapWrap.querySelector(`#hub-pulse-${i}`));

    const stepFrame = () => {
      FLOWS.forEach((_, i) => {
        const p = paths[i];
        const d = dots[i];
        if (!p || !d) return;
        const len = p.getTotalLength();
        if (!prefersReduced) {
          pulseOffsets[i] = (pulseOffsets[i] + (i === activeIdx ? 0.008 : 0.0045)) % 1;
        }
        const pt = p.getPointAtLength(len * pulseOffsets[i]);
        d.setAttribute('cx', pt.x);
        d.setAttribute('cy', pt.y);
      });
      if (!prefersReduced) rafId = requestAnimationFrame(stepFrame);
    };

    stepFrame();
  }

  renderMap();
  renderPreview();

  return {
    highlight(flowId) {
      const idx = FLOWS.findIndex(f => f.id === flowId);
      if (idx >= 0 && idx !== activeIdx) {
        activeIdx = idx;
        renderMap();
        renderPreview();
      }
    },
    destroy() {
      cancelAnimationFrame(rafId);
    }
  };
}
