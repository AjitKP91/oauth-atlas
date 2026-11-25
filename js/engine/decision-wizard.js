// ==========================================================================
// OAUTH ATLAS — Interactive 30-Second Decision Wizard + Live Glowing SVG Map
// ==========================================================================

import { DECISION_NODES } from '../data/reference.js?v=4.3';
import { escapeHtml } from './jwt-xray.js?v=4.3';
import { sound } from './sound.js?v=4.3';

const MAP_NODES = [
  { id: 'start', x: 340, y: 34, label: 'Human User?' },
  { id: 'q_m2m', x: 148, y: 116, label: 'M2M Auth?' },
  { id: 'q_refresh', x: 468, y: 116, label: 'Has RT?' },
  { id: 'client-credentials', x: 74, y: 202, label: 'F2: Client Creds', leaf: true },
  { id: 'refresh-token', x: 360, y: 202, label: 'F3: Refresh', leaf: true },
  { id: 'q_backend', x: 522, y: 202, label: 'Backend Hop?' },
  { id: 'q_proof', x: 326, y: 288, label: 'User Proof?' },
  { id: 'q_browser', x: 566, y: 288, label: 'Has Browser?' },
  { id: 'jwt-bearer', x: 164, y: 376, label: 'F4: JWT Bearer', leaf: true },
  { id: 'token-exchange', x: 282, y: 376, label: 'F6: Token Exch.', leaf: true },
  { id: 'saml2-bearer', x: 400, y: 376, label: 'F5: SAML Bearer', leaf: true },
  { id: 'auth-code-pkce', x: 514, y: 376, label: 'F1: Auth Code', leaf: true },
  { id: 'q_push_pull', x: 624, y: 376, label: 'Push / Pull?' },
  { id: 'device-code', x: 500, y: 454, label: 'F7: Device Auth', leaf: true },
  { id: 'ciba', x: 622, y: 454, label: 'F8: CIBA', leaf: true }
];

const MAP_EDGES = [
  ['start', 'q_m2m'], ['start', 'q_refresh'],
  ['q_m2m', 'client-credentials'], ['q_m2m', 'jwt-bearer'],
  ['q_refresh', 'refresh-token'], ['q_refresh', 'q_backend'],
  ['q_backend', 'q_proof'], ['q_backend', 'q_browser'],
  ['q_proof', 'token-exchange'], ['q_proof', 'saml2-bearer'], ['q_proof', 'jwt-bearer'],
  ['q_browser', 'auth-code-pkce'], ['q_browser', 'q_push_pull'],
  ['q_push_pull', 'device-code'], ['q_push_pull', 'ciba']
];

export function mountDecisionWizard({ wizardEl, mapEl, onJumpToFlow }) {
  let path = ['start'];
  let finalResult = null;

  function render() {
    const currentId = path[path.length - 1];
    const node = DECISION_NODES[currentId];

    // Breadcrumbs
    const crumbs = path
      .map((id, i) => `<span class="crumb">${i + 1}. ${escapeHtml(MAP_NODES.find(m => m.id === id)?.label || id)}</span>`)
      .join('');

    if (finalResult) {
      wizardEl.innerHTML = `
        <div>
          <div class="wizard-breadcrumb">${crumbs}</div>
          <div class="wizard-result-box" style="margin-top:16px">
            <span class="badge core" style="margin-bottom:10px">RECOMMENDED GRANT FLOW</span>
            <h3 class="wizard-question" style="margin-bottom:8px">${escapeHtml(finalResult.title)}</h3>
            <div class="urn-pill" style="margin-bottom:12px">${escapeHtml(finalResult.badge)}</div>
            <p style="font-size:0.92rem;color:var(--text-secondary);line-height:1.65">${escapeHtml(finalResult.why)}</p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px">
              <button type="button" class="btn-primary" id="wiz-open-flow">Open Animated Protocol Theatre →</button>
              <button type="button" class="btn-secondary" id="wiz-restart">↺ Start Over</button>
            </div>
          </div>
        </div>
      `;
      wizardEl.querySelector('#wiz-open-flow').addEventListener('click', () => {
        onJumpToFlow(finalResult.flowId);
      });
      wizardEl.querySelector('#wiz-restart').addEventListener('click', reset);
    } else if (node) {
      wizardEl.innerHTML = `
        <div>
          <div class="wizard-breadcrumb">${crumbs}</div>
          <h3 class="wizard-question" style="margin-top:16px;margin-bottom:8px">${escapeHtml(node.question)}</h3>
          <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:20px">${escapeHtml(node.subtitle)}</p>
          <div class="wizard-options">
            ${node.options
              .map(
                (opt, i) => `
              <button type="button" class="wizard-opt-btn" data-opt="${i}">
                <div>
                  <strong>${escapeHtml(opt.label)}</strong>
                  <span>${escapeHtml(opt.hint)}</span>
                </div>
                <span style="font-size:1.15rem;color:var(--accent-primary)">→</span>
              </button>`
              )
              .join('')}
          </div>
        </div>
        <div style="display:flex;gap:10px;padding-top:12px;border-top:1px solid var(--border-subtle)">
          ${path.length > 1 ? '<button type="button" class="stage-btn" id="wiz-back">← Back</button>' : ''}
          <button type="button" class="stage-btn" id="wiz-restart">↺ Reset Wizard</button>
        </div>
      `;

      wizardEl.querySelectorAll('[data-opt]').forEach(btn => {
        btn.addEventListener('click', () => {
          const opt = node.options[Number(btn.dataset.opt)];
          sound.playTone(opt.result ? 'success' : 'back');
          if (opt.result) {
            finalResult = opt.result;
            path.push(opt.result.flowId);
          } else if (opt.next) {
            path.push(opt.next);
          }
          render();
        });
      });

      const backBtn = wizardEl.querySelector('#wiz-back');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          path.pop();
          finalResult = null;
          render();
        });
      }
      wizardEl.querySelector('#wiz-restart').addEventListener('click', reset);
    }

    renderSvgMap();
  }

  function renderSvgMap() {
    const pos = Object.fromEntries(MAP_NODES.map(n => [n.id, n]));
    const activeSet = new Set(path);
    const activeEdges = new Set();
    for (let i = 0; i < path.length - 1; i++) {
      activeEdges.add(`${path[i]}->${path[i + 1]}`);
    }
    const currentId = path[path.length - 1];

    const edgesSvg = MAP_EDGES.map(([a, b]) => {
      const p1 = pos[a];
      const p2 = pos[b];
      const isLit = activeEdges.has(`${a}->${b}`);
      const sy = p1.y + 16;
      const ey = p2.y - 16;
      const midY = (sy + ey) / 2;
      const d = `M ${p1.x} ${sy} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${ey}`;
      return `<path d="${d}" fill="none" stroke="${isLit ? 'var(--accent-primary)' : 'var(--wiz-edge)'}" stroke-width="${isLit ? 2.8 : 1.3}" />`;
    }).join('');

    const nodesSvg = MAP_NODES.map(n => {
      const isCurrent = n.id === currentId;
      const isVisited = activeSet.has(n.id);
      const fill = isCurrent
        ? n.leaf
          ? '#059669'
          : '#0284c7'
        : isVisited
        ? 'var(--wiz-node-visited)'
        : 'var(--wiz-node-bg)';
      const stroke = isCurrent ? 'var(--text-primary)' : isVisited ? 'var(--accent-primary)' : n.leaf ? 'var(--ch-back)' : 'var(--wiz-node-stroke)';
      const labelFill = isCurrent ? '#ffffff' : 'var(--text-primary)';
      const rw = n.leaf ? 108 : 94;
      return `
        <g transform="translate(${n.x},${n.y})" style="${n.leaf ? 'cursor:pointer' : ''}" ${n.leaf ? `data-leaf="${n.id}"` : ''}>
          <rect x="${-rw / 2}" y="-16" width="${rw}" height="32" rx="${n.leaf ? 16 : 9}" fill="${fill}" stroke="${stroke}" stroke-width="${isCurrent ? 2.4 : 1.3}" />
          <text text-anchor="middle" y="4" fill="${labelFill}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">${escapeHtml(n.label)}</text>
        </g>
      `;
    }).join('');

    mapEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-family:var(--font-mono);font-size:0.75rem;color:var(--code-muted)">
        <span>LIVE DECISION PATH MAP</span>
        <span style="color:var(--ch-back)">Click any green leaf to jump</span>
      </div>
      <div class="wizard-svg-scroll">
        <svg class="wizard-svg" viewBox="0 0 684 486">
          ${edgesSvg}
          ${nodesSvg}
        </svg>
      </div>
    `;

    mapEl.querySelectorAll('[data-leaf]').forEach(g => {
      g.addEventListener('click', () => onJumpToFlow(g.dataset.leaf));
    });
  }

  function reset() {
    path = ['start'];
    finalResult = null;
    render();
  }

  render();
}
