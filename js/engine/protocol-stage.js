// ==========================================================================
// OAUTH ATLAS — 4-Perspective Interactive Protocol Theatre v4.0
// Switchable from the Site Header Dropdown (#stage-view-select):
//   1. "zones"    : 🛡️ Trust Zones (Public Glass Surface vs. Sealed TLS Vault + Circuit Trail)
//   2. "ledger"   : 🗝️ Crypto Ledger (Live Actor Keyring / Memory Slots & Lock Verification)
//   3. "pov"      : 🖥️ User + Wire POV (Simulated Browser/Device Screen + Live Backend Graph)
//   4. "sequence" : 📊 Sequence Ladder (Compact Above-the-Fold Chronological Waterfall)
// ==========================================================================

import { escapeHtml, highlightWire } from './jwt-xray.js?v=4.3';
import { sound } from './sound.js?v=4.3';

const CHANNEL_LABEL = {
  front: '👁 Front-Channel (Observable Browser)',
  back: '🔒 Back-Channel (Direct TLS)',
  oob: '📱 Out-of-Band (Mobile / Push / QR)',
  attack: '☠ Attack / Defense Event',
  local: '⚙ Local Crypto / Internal State'
};

const ACTOR_ICONS = {
  user: `<circle cx="0" cy="-7" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-11 11 C-11 3, 11 3, 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  client: `<rect x="-12" y="-9" width="24" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-6 11 L6 11 M0 7 L0 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  as: `<path d="M0 -13 L11 -8 L11 2 C11 9, 5 13, 0 15 C-5 13, -11 9, -11 2 L-11 -8 Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="0" cy="0" r="3" fill="currentColor"/>`,
  rs: `<ellipse cx="0" cy="-8" rx="11" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-11 -8 L-11 8 C-11 10.5, 11 10.5, 11 8 L11 -8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-11 0 C-11 2.5, 11 2.5, 11 0" fill="none" stroke="currentColor" stroke-width="1.6"/>`,
  vault: `<rect x="-10" y="-4" width="20" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-6 -4 L-6 -9 C-6 -13, 6 -13, 6 -9 L6 -4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="0" cy="3" r="2.2" fill="currentColor"/>`,
  tv: `<rect x="-13" y="-9" width="26" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-5 11 L5 11 M0 7 L0 11" stroke="currentColor" stroke-width="2"/>`,
  phone: `<rect x="-7" y="-12" width="14" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="0" cy="8" r="1.4" fill="currentColor"/>`,
  attacker: `<path d="M0 -13 L12 10 L-12 10 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><line x1="0" y1="-5" x2="0" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="6" r="1.4" fill="currentColor"/>`
};

// Highlight key OAuth lines inside the wire packet panel
function highlightWireWithFocus(rawWire) {
  const html = highlightWire(rawWire);
  const focusRe = /(code_verifier|code_challenge|access_token|refresh_token|id_token|subject_token|actor_token|assertion|device_code|user_code|auth_req_id|Authorization:|grant_type=|invalid_grant|error_description)/i;
  return html
    .split('\n')
    .map(line => (focusRe.test(line) ? `<span class="wire-line is-focus">${line}</span>` : `<span class="wire-line">${line}</span>`))
    .join('\n');
}

// Compute live per-actor cryptographic keyring / memory ledger up to stepIndex
function computeLedgerState(actors, steps, upToIdx) {
  const ledger = {};
  actors.forEach(a => {
    ledger[a.id] = [];
  });

  const pushSlot = (actorId, key, label, status, stepIdx) => {
    if (!ledger[actorId]) return;
    const existing = ledger[actorId].find(x => x.key === key);
    if (existing) {
      existing.label = label;
      existing.status = status;
      existing.isFresh = stepIdx === upToIdx;
    } else {
      ledger[actorId].push({ key, label, status, isFresh: stepIdx === upToIdx });
    }
  };

  const markConsumed = (actorId, key, newLabel) => {
    if (!ledger[actorId]) return;
    const item = ledger[actorId].find(x => x.key === key);
    if (item) {
      item.status = 'consumed';
      if (newLabel) item.label = newLabel;
      item.isFresh = false;
    }
  };

  for (let i = 0; i <= upToIdx && i < steps.length; i++) {
    const st = steps[i];
    const src = `${st.packet || ''} ${st.short || ''} ${st.title || ''}`;
    const target = st.to || st.from;
    const sender = st.from;

    if (/400|401|403|REJECT|REVOKED|DENIED|BLOCKED|invalid_grant/i.test(src)) {
      pushSlot(target, 'err', '🛡️ 400 Rejected!', 'alert', i);
      if (sender && sender !== target) pushSlot(sender, 'blocked', '❌ Access Denied', 'alert', i);
      continue;
    }
    if (/STOLEN|INTERCEPT|HIJACK|LEAK/i.test(src)) {
      pushSlot(target, 'stolen', '☠️ Stolen Artifact', 'alert', i);
      continue;
    }
    if (/verifier.*challenge|SHA256\(verifier\)|Forge PKCE/i.test(src)) {
      pushSlot(target, 'verifier', '🗝️ verifier (secret)', 'secret', i);
      pushSlot(target, 'challenge', '🔒 challenge (S256)', 'normal', i);
      continue;
    }
    if (/code_challenge/i.test(src) && !/verifier/i.test(src)) {
      pushSlot(target, 'challenge', '🔒 challenge (S256)', 'normal', i);
      continue;
    }
    if (/Passkey|MFA|Consent|Login/i.test(src) && st.channel === 'front') {
      pushSlot(sender, 'auth_ok', '✓ Identity Proven', 'verified', i);
      pushSlot(target, 'challenge', '🔒 challenge bound', 'verified', i);
      continue;
    }
    if (/302|\?code=|\bcode\s*\+/i.test(src)) {
      pushSlot(target, 'code', '🎫 auth code', 'normal', i);
      continue;
    }
    if (/code_verifier/i.test(src) && st.to) {
      markConsumed(sender, 'code', '🎫 code (used)');
      pushSlot(target, 'pkce_ok', '✓ PKCE Hash Match', 'verified', i);
      continue;
    }
    if (/device_code|user_code/i.test(src)) {
      pushSlot(target, 'dev_code', '📺 device + code', 'normal', i);
      continue;
    }
    if (/auth_req_id/i.test(src)) {
      pushSlot(target, 'req_id', '📨 auth_req_id', 'normal', i);
      continue;
    }
    if (/Approve|FaceID|Biometric|User Enters Code/i.test(src)) {
      pushSlot(sender, 'oob_ok', '✓ Device Approved', 'verified', i);
      if (target !== sender) pushSlot(target, 'oob_ok', '✓ User Approved', 'verified', i);
      continue;
    }
    if (/New AT \+ New RT|Rotated|RT_2/i.test(src)) {
      markConsumed(target, 'rt', '🔄 RT_1 (used)');
      pushSlot(target, 'at', '🪪 Fresh AT', 'verified', i);
      pushSlot(target, 'rt2', '🔄 Rotated RT_2', 'secret', i);
      continue;
    }
    if (/access_token.*\bRT\b|access_token.*refresh|\+ RT/i.test(src)) {
      markConsumed(target, 'code', '🎫 code (used)');
      pushSlot(target, 'at', '🪪 Access Token', 'verified', i);
      pushSlot(target, 'rt', '🔄 Refresh Token', 'secret', i);
      continue;
    }
    if (/access_token|200 OK.*Token|Downscoped AT|OBO AT|Issued AT/i.test(src)) {
      pushSlot(target, 'at', '🪪 Access Token', 'verified', i);
      continue;
    }
    if (/SAML/i.test(src)) {
      pushSlot(target, 'saml', '📜 SAML Assertion', 'normal', i);
      continue;
    }
    if (/JWT|Assertion|client_assertion|subject_token|act:/i.test(src)) {
      pushSlot(target, 'jwt', '📜 Signed JWT Proof', 'normal', i);
      continue;
    }
    if (/mTLS|Client Secret|Basic/i.test(src)) {
      pushSlot(sender, 'cred', '🗝️ Client Credential', 'secret', i);
      pushSlot(target, 'cred_ok', '✓ Client Verified', 'verified', i);
      continue;
    }
    if (/Bearer|API Call|GET \/|POST \//i.test(src)) {
      pushSlot(target, 'rs_ok', '✅ Bearer AT Verified', 'verified', i);
      continue;
    }

    const fallback = (st.packet || st.short || '').trim();
    if (fallback) {
      const shortLbl = fallback.length > 21 ? `${fallback.slice(0, 19)}…` : fallback;
      pushSlot(target, `s_${i}`, shortLbl, 'normal', i);
    }
  }

  // Keep most relevant 3 items per actor card so slots never overflow
  Object.keys(ledger).forEach(k => {
    if (ledger[k].length > 3) {
      ledger[k] = ledger[k].slice(ledger[k].length - 3);
    }
  });

  return ledger;
}

let theatreUidSeq = 0;

export function createProtocolTheatre({ container, config, getLens, getAnimStyle, onStepChange, onCopy }) {
  const uid = `th${++theatreUidSeq}`;
  let activeMode = config.modes ? config.modes[0].id : 'default';
  let animStyle = getAnimStyle ? getAnimStyle() : 'zones';
  let stepIndex = 0;
  let stepDirection = 'forward';
  let playing = false;
  let speed = 1;
  let autoTimer = null;
  let rafId = null;

  function getSteps() {
    if (config.scenarios) return config.scenarios[activeMode] || [];
    return config.steps || [];
  }

  function getActors() {
    const base = [...config.actors];
    if (activeMode === 'attack' && config.attackActor) {
      base.push(config.attackActor);
    }
    return base;
  }

  function isAttackActive() {
    return activeMode === 'attack' || (config.modes && config.modes.find(m => m.id === activeMode)?.type === 'attack');
  }

  function getFocalColor(current) {
    if (current.channel === 'attack' || isAttackActive()) return 'var(--stage-ch-attack)';
    return config.accent || '#38bdf8';
  }

  function stopPlayback() {
    playing = false;
    clearTimeout(autoTimer);
    autoTimer = null;
    updatePlayButton();
  }

  function updatePlayButton() {
    const btn = container.querySelector('[data-action="play"]');
    if (!btn) return;
    btn.innerHTML = playing ? '⏸ Pause' : '▶ Play Flow';
  }

  function updateNavButtons(steps) {
    const prevBtn = container.querySelector('[data-action="prev"]');
    const nextBtn = container.querySelector('[data-action="next"]');
    if (prevBtn) {
      prevBtn.disabled = stepIndex <= 0;
      prevBtn.style.opacity = stepIndex <= 0 ? '0.45' : '1';
    }
    if (nextBtn) {
      const nextStep = steps[stepIndex + 1];
      if (nextStep) {
        const shortLbl = nextStep.short.length > 22 ? `${nextStep.short.slice(0, 20)}…` : nextStep.short;
        nextBtn.innerHTML = `Next: <span class="next-step-preview">${escapeHtml(shortLbl)}</span> →`;
      } else {
        nextBtn.innerHTML = `↺ Replay Flow`;
      }
    }
  }

  function goToStep(nextIdx, animate = true) {
    const steps = getSteps();
    if (!steps.length) return;
    const bounded = Math.max(0, Math.min(steps.length - 1, nextIdx));
    stepDirection = bounded >= stepIndex ? 'forward' : 'backward';
    stepIndex = bounded;
    renderStageState(animate);
  }

  function scheduleNext() {
    clearTimeout(autoTimer);
    if (!playing) return;
    const steps = getSteps();
    const delay = Math.round(2500 / speed);
    autoTimer = setTimeout(() => {
      if (!playing) return;
      if (stepIndex < steps.length - 1) {
        goToStep(stepIndex + 1, true);
        scheduleNext();
      } else {
        stopPlayback();
      }
    }, delay);
  }

  function renderShell() {
    const modeButtons = config.modes
      ? `<div class="mode-pills">
          ${config.modes
            .map(
              m =>
                `<button type="button" class="stage-btn ${m.type === 'attack' ? 'attack-toggle' : ''} ${
                  m.id === activeMode ? 'mode-active' : ''
                }" data-mode="${m.id}">${escapeHtml(m.label)}</button>`
            )
            .join('')}
        </div>`
      : '';

    const accent = config.accent || '#38bdf8';

    container.innerHTML = `
      <div class="theatre-shell" data-slot="shell" tabindex="0" style="--theatre-accent:${accent}" aria-label="Interactive OAuth protocol playground (use Left/Right arrow keys to step)">
        <div class="theatre-toolbar">
          <div class="theatre-controls">
            <button type="button" class="stage-btn primary" data-action="play">▶ Play Flow</button>
            <button type="button" class="stage-btn" data-action="prev" aria-label="Previous step">← Prev</button>
            <button type="button" class="stage-btn next-step-btn" data-action="next" aria-label="Next step">Next →</button>
            <button type="button" class="stage-btn" data-action="reset" aria-label="Restart" title="Reset to Step 1">↺</button>
            <select class="speed-select" data-action="speed" aria-label="Animation speed">
              <option value="0.6">0.6× Slow</option>
              <option value="1" selected>1× Normal</option>
              <option value="1.7">1.7× Fast</option>
            </select>
          </div>
          ${modeButtons}
        </div>
        <div class="theatre-stage-wrap" data-slot="svg-wrap"></div>
        <div class="step-timeline" data-slot="timeline"></div>
        <div class="theatre-split-readout" data-slot="readout"></div>
      </div>
    `;

    container.querySelector('[data-action="play"]').addEventListener('click', () => {
      if (playing) {
        stopPlayback();
      } else {
        const steps = getSteps();
        if (stepIndex >= steps.length - 1) stepIndex = 0;
        playing = true;
        updatePlayButton();
        renderStageState(true);
        scheduleNext();
      }
    });

    container.querySelector('[data-action="prev"]').addEventListener('click', () => {
      stopPlayback();
      if (stepIndex > 0) goToStep(stepIndex - 1, true);
    });

    container.querySelector('[data-action="next"]').addEventListener('click', () => {
      stopPlayback();
      const steps = getSteps();
      if (stepIndex < steps.length - 1) {
        goToStep(stepIndex + 1, true);
      } else {
        goToStep(0, true);
      }
    });

    container.querySelector('[data-action="reset"]').addEventListener('click', () => {
      stopPlayback();
      goToStep(0, true);
    });

    container.querySelector('[data-action="speed"]').addEventListener('change', e => {
      speed = parseFloat(e.target.value) || 1;
    });

    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.mode, false);
      });
    });

    const shell = container.querySelector('[data-slot="shell"]');
    shell.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stopPlayback();
        const steps = getSteps();
        if (stepIndex < steps.length - 1) goToStep(stepIndex + 1, true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stopPlayback();
        if (stepIndex > 0) goToStep(stepIndex - 1, true);
      }
    });

    renderStageState(false);
  }

  function setMode(modeId, autoPlay = false) {
    stopPlayback();
    activeMode = modeId;
    stepIndex = 0;
    stepDirection = 'forward';
    container.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('mode-active', b.dataset.mode === modeId));
    if (autoPlay) {
      playing = true;
      updatePlayButton();
      renderStageState(true);
      scheduleNext();
    } else {
      renderStageState(true);
    }
  }

  // Helper: Measure dynamic SVG text pill width and clamp inside [minX, maxX]
  function fitSvgPill(svgWrap, bgSel, txtSel, fallbackText, minW = 126, pad = 26) {
    const bg = svgWrap.querySelector(bgSel);
    const txt = svgWrap.querySelector(txtSel);
    let halfW = minW / 2;
    if (bg && txt) {
      let measured = 0;
      try {
        measured = txt.getComputedTextLength();
      } catch {}
      const w = Math.max(minW, Math.ceil((measured || fallbackText.length * 7.4) + pad));
      halfW = w / 2;
      bg.setAttribute('width', w);
      bg.setAttribute('x', -halfW);
    }
    return halfW;
  }

  // ==========================================================================
  // VIEW 1 ("zones"): 🛡️ TRUST-BOUNDARY SPLIT-ZONE
  // Divides the stage across the OAuth Trust Boundary:
  //   - Upper Zone : Public / Observable Surface (Browser, TV, Phone, Attacker)
  //   - Lower Zone : Sealed Back-Channel Server TLS Zone (Client, AS, RS, Vault)
  // Includes persistent numbered step trail (1..k) + gliding carrier capsule!
  // ==========================================================================
  function renderTrustZonesView({ svgWrap, steps, actors, current, focalColor, animatePacket }) {
    const W = 880;
    const H = 342;
    const boundaryY = 148;
    const upperActors = actors.filter(a => ['user', 'tv', 'phone', 'attacker'].includes(a.icon));
    const lowerActors = actors.filter(a => !['user', 'tv', 'phone', 'attacker'].includes(a.icon));
    const positions = {};

    if (upperActors.length > 0 && lowerActors.length > 0) {
      upperActors.forEach((a, i) => {
        const n = upperActors.length;
        const x = n === 1 ? 330 : 220 + ((W - 440) / (n - 1)) * i;
        positions[a.id] = { x, y: 74, tier: 'upper', actor: a };
      });
      lowerActors.forEach((a, i) => {
        const n = lowerActors.length;
        const x = n === 1 ? W / 2 : 164 + ((W - 328) / (n - 1)) * i;
        positions[a.id] = { x, y: 244, tier: 'lower', actor: a };
      });
    } else if (upperActors.length === 0) {
      lowerActors.forEach((a, i) => {
        const n = lowerActors.length;
        const x = n === 1 ? W / 2 : 148 + ((W - 296) / (n - 1)) * i;
        positions[a.id] = { x, y: 238, tier: 'lower', actor: a };
      });
    } else {
      upperActors.forEach((a, i) => {
        const n = upperActors.length;
        const x = n === 1 ? W / 2 : 148 + ((W - 296) / (n - 1)) * i;
        positions[a.id] = { x, y: 78, tier: 'upper', actor: a };
      });
    }

    function buildZoneEdge(p1, p2, idx) {
      if (p1 === p2) {
        const lift = p1.tier === 'upper' ? 46 : -54;
        return `M ${p1.x - 16} ${p1.y + (lift < 0 ? -22 : 22)} C ${p1.x - 42} ${p1.y + lift * 1.6}, ${p1.x + 42} ${p1.y + lift * 1.6}, ${p1.x + 16} ${p1.y + (lift < 0 ? -22 : 22)}`;
      }
      const dx = p2.x - p1.x;
      const dirX = dx >= 0 ? 1 : -1;
      if (p1.tier !== p2.tier) {
        const sy = p1.tier === 'upper' ? p1.y + 26 : p1.y - 26;
        const ey = p2.tier === 'upper' ? p2.y + 26 : p2.y - 26;
        const sx = p1.x + dirX * 14;
        const ex = p2.x - dirX * 14;
        const bow = (idx % 2 === 0 ? 1 : -1) * 24;
        return `M ${sx} ${sy} Q ${(sx + ex) / 2 + bow} ${(sy + ey) / 2} ${ex} ${ey}`;
      }
      // Same tier
      const absDx = Math.abs(dx);
      const sx = p1.x + dirX * 28;
      const ex = p2.x - dirX * 28;
      if (absDx > 360) {
        // Non-adjacent skip (e.g. Client -> Resource Server skipping Auth Server): route cleanly under/over intermediate node!
        const arcY = p1.tier === 'lower' ? 328 : 16;
        return `M ${p1.x + dirX * 18} ${p1.y + (p1.tier === 'lower' ? 22 : -22)} Q ${(p1.x + p2.x) / 2} ${arcY} ${p2.x - dirX * 18} ${p2.y + (p2.tier === 'lower' ? 22 : -22)}`;
      }
      const arcOffset = (dirX > 0 ? -26 : 22) + (idx % 2) * 8;
      return `M ${sx} ${p1.y - 4} Q ${(sx + ex) / 2} ${p1.y + arcOffset} ${ex} ${p2.y - 4}`;
    }

    // Completed step trail with numbered breadcrumbs
    const pastTrails = [];
    for (let i = 0; i < stepIndex; i++) {
      const st = steps[i];
      const sp1 = positions[st.from];
      const sp2 = positions[st.to];
      if (!sp1 || !sp2) continue;
      const d = buildZoneEdge(sp1, sp2, i);
      pastTrails.push({ idx: i, d });
    }

    const p1 = positions[current.from] || positions[actors[0].id];
    const p2 = positions[current.to] || p1;
    const isSelf = p1 === p2;
    const activeD = buildZoneEdge(p1, p2, stepIndex);
    const pillLabel = current.packet || current.short;
    const isUpperActive = current.channel === 'front' || current.channel === 'oob' || (p1.tier === 'upper' && p2.tier === 'upper');

    const emptyUpperNote =
      upperActors.length === 0
        ? `
        <g transform="translate(${W / 2}, 82)">
          <rect x="-226" y="-15" width="452" height="30" rx="15" fill="var(--stage-pill-bg)" stroke="var(--stage-border)" stroke-dasharray="4 4"/>
          <text y="4" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="600">✓ Zero Browser / Front-Channel Surface — 100% Backend TLS Flow</text>
        </g>`
        : '';

    const actorsHtml = actors
      .map(a => {
        const pos = positions[a.id];
        const isActive = current.from === a.id || current.to === a.id;
        const strokeC = isActive ? focalColor : 'var(--stage-border)';
        const iconC = isActive ? focalColor : 'var(--stage-node-sub)';
        const labelBelow = pos.tier === 'upper' ? 40 : 42;
        return `
          <g class="actor-node ${isActive ? 'active is-lifted' : 'is-idle'}" transform="translate(${pos.x}, ${pos.y})">
            <g class="actor-body">
              <circle class="actor-ring" r="25" fill="var(--stage-node-fill)" stroke="${strokeC}" stroke-width="${isActive ? 2.2 : 1.2}"/>
              <g style="color:${iconC}" transform="scale(0.88)">${ACTOR_ICONS[a.icon] || ACTOR_ICONS.client}</g>
              <text y="${labelBelow}" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="${isActive ? 800 : 600}">${escapeHtml(a.label)}</text>
              <text y="${labelBelow + 14}" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9.5">${escapeHtml(a.sub)}</text>
            </g>
          </g>
        `;
      })
      .join('');

    svgWrap.innerHTML = `
      <svg class="stage-svg zones-stage-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trust-Boundary Split-Zone OAuth diagram">
        <defs>
          <marker id="${uid}-z-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${focalColor}"/>
          </marker>
          <marker id="${uid}-z-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="var(--stage-node-sub)" fill-opacity="0.55"/>
          </marker>
        </defs>

        <!-- Upper Zone: Untrusted / Observable Surface -->
        <rect x="12" y="8" width="${W - 24}" height="${boundaryY - 14}" rx="12" fill="var(--stage-ch-front)" fill-opacity="${isUpperActive ? '0.055' : '0.02'}" stroke="var(--stage-border)" stroke-width="1"/>
        <text x="24" y="26" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" letter-spacing="0.05em">🌐 PUBLIC / USER SURFACE</text>

        <!-- Lower Zone: Sealed Back-Channel TLS Vault -->
        <rect x="12" y="${boundaryY + 6}" width="${W - 24}" height="${H - boundaryY - 14}" rx="12" fill="var(--stage-ch-back)" fill-opacity="${!isUpperActive ? '0.055' : '0.02'}" stroke="var(--stage-border)" stroke-width="1"/>
        <text x="24" y="${H - 18}" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" letter-spacing="0.05em">🔒 SEALED TLS VAULT</text>

        <!-- Trust Boundary Divider Line -->
        <line x1="16" y1="${boundaryY}" x2="${W - 16}" y2="${boundaryY}" stroke="var(--stage-node-sub)" stroke-opacity="0.4" stroke-width="1.2" stroke-dasharray="6 4"/>
        <g transform="translate(${W / 2}, ${boundaryY})">
          <rect x="-86" y="-9" width="172" height="18" rx="9" fill="var(--stage-pill-bg)" stroke="var(--stage-border)" stroke-width="1"/>
          <text y="3" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="800" letter-spacing="0.06em">TRUST BOUNDARY</text>
        </g>

        ${emptyUpperNote}

        <!-- Persistent Past Step Circuit Trail -->
        <g data-role="past-trails">
          ${pastTrails
            .map(
              pt =>
                `<path data-past-idx="${pt.idx}" d="${pt.d}" fill="none" stroke="var(--stage-node-sub)" stroke-opacity="0.34" stroke-width="1.4" marker-end="url(#${uid}-z-muted)"/>`
            )
            .join('')}
        </g>
        <g data-role="past-badges"></g>

        <!-- Active Conduit -->
        <path id="${uid}-z-bg" d="${activeD}" fill="none" stroke="${focalColor}" stroke-width="1.5" stroke-dasharray="${current.channel === 'back' ? 'none' : '6 5'}" opacity="0.32" marker-end="url(#${uid}-z-arrow)"/>
        <path id="${uid}-z-trace" d="${activeD}" fill="none" stroke="${focalColor}" stroke-width="2.6" stroke-linecap="round" marker-end="url(#${uid}-z-arrow)"/>

        <!-- Arrival Burst -->
        <g data-role="arrival-burst" transform="translate(${p2.x}, ${p2.y})" class="${animatePacket ? '' : 'is-arrived'}" pointer-events="none">
          <circle class="arrival-bead-pop" cx="0" cy="0" r="26" fill="none" stroke="${focalColor}" stroke-width="2" opacity="0"/>
        </g>

        ${actorsHtml}

        <!-- Leading Energy Pulse -->
        <circle data-role="z-orb" r="5.5" fill="#ffffff" stroke="${focalColor}" stroke-width="2.4"/>

        <!-- Gliding Carrier Capsule -->
        <g data-role="z-capsule">
          <rect data-role="z-cap-bg" x="-90" y="-13" width="180" height="25" rx="8" fill="var(--stage-pill-bg)" stroke="${focalColor}" stroke-opacity="0.55" stroke-width="1.2"/>
          <text data-role="z-cap-txt" x="0" y="4" text-anchor="middle" fill="var(--stage-pill-text)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${escapeHtml(pillLabel)}</text>
        </g>
      </svg>
    `;

    // Place numbered step beads along past trails
    const badgesGroup = svgWrap.querySelector('[data-role="past-badges"]');
    svgWrap.querySelectorAll('[data-past-idx]').forEach(pathEl => {
      const idx = Number(pathEl.dataset.pastIdx);
      try {
        const len = pathEl.getTotalLength();
        const pt = pathEl.getPointAtLength(len * (0.36 + (idx % 3) * 0.14));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
        g.style.cursor = 'pointer';
        g.innerHTML = `<circle r="8" fill="var(--stage-pill-bg)" stroke="var(--stage-node-sub)" stroke-opacity="0.55" stroke-width="1"/><text y="3" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="800">${idx + 1}</text>`;
        g.addEventListener('click', () => {
          stopPlayback();
          goToStep(idx, true);
        });
        badgesGroup.appendChild(g);
      } catch {}
    });

    const halfW = fitSvgPill(svgWrap, '[data-role="z-cap-bg"]', '[data-role="z-cap-txt"]', pillLabel, 126, 26);
    const bgPath = svgWrap.querySelector(`#${uid}-z-bg`);
    const tracePath = svgWrap.querySelector(`#${uid}-z-trace`);
    const orb = svgWrap.querySelector('[data-role="z-orb"]');
    const cap = svgWrap.querySelector('[data-role="z-capsule"]');
    const arrival = svgWrap.querySelector('[data-role="arrival-burst"]');

    if (bgPath && tracePath && orb && cap) {
      const totalLen = bgPath.getTotalLength();
      const duration = Math.round(860 / speed);
      const startTime = performance.now();
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      tracePath.style.strokeDasharray = `${totalLen}`;
      tracePath.style.strokeDashoffset = `${totalLen}`;

      const updateAt = eased => {
        const orbT = isSelf ? 0.88 : 0.06 + eased * 0.88;
        const orbPt = bgPath.getPointAtLength(totalLen * orbT);
        orb.setAttribute('cx', orbPt.x);
        orb.setAttribute('cy', orbPt.y);
        tracePath.style.strokeDashoffset = `${Math.max(0, totalLen * (1 - orbT))}`;

        const capT = isSelf ? 0.5 : 0.14 + eased * 0.36;
        const capPt = bgPath.getPointAtLength(totalLen * capT);
        const cx = Math.max(halfW + 18, Math.min(W - halfW - 18, capPt.x));
        const cy = Math.max(26, Math.min(H - 22, capPt.y - (isSelf ? 12 : 10)));
        cap.setAttribute('transform', `translate(${cx}, ${cy})`);
      };

      if (prefersReduced || !animatePacket) {
        updateAt(1);
        if (arrival) arrival.classList.add('is-arrived');
      } else {
        const tick = now => {
          const raw = Math.min(1, (now - startTime) / duration);
          updateAt(1 - Math.pow(1 - raw, 3));
          if (raw < 1) rafId = requestAnimationFrame(tick);
          else {
            updateAt(1);
            if (arrival) arrival.classList.add('is-arrived');
          }
        };
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  // ==========================================================================
  // VIEW 2 ("ledger"): 🗝️ LIVE CRYPTOGRAPHIC KEYRING & STATE LEDGER
  // Each actor is a Stateful Memory Card showing held secrets/tokens/hashes,
  // lock verification checks, and single-use consumption in real time!
  // ==========================================================================
  function renderCryptoLedgerView({ svgWrap, steps, actors, current, focalColor, animatePacket }) {
    const W = 880;
    const H = 338;
    const n = actors.length;
    const gap = 14;
    const sidePad = 22;
    const cardW = Math.floor((W - sidePad * 2 - gap * (n - 1)) / n);
    const cardTop = 94;
    const cardH = 228;
    const ledger = computeLedgerState(actors, steps, stepIndex);
    const positions = {};

    actors.forEach((a, i) => {
      const left = sidePad + i * (cardW + gap);
      positions[a.id] = { x: left + cardW / 2, left, top: cardTop, actor: a };
    });

    const p1 = positions[current.from] || positions[actors[0].id];
    const p2 = positions[current.to] || p1;
    const isSelf = p1 === p2;
    const dir = p2.x >= p1.x ? 1 : -1;
    const busD = isSelf
      ? `M ${p1.x - 24} ${cardTop} C ${p1.x - 40} 30, ${p1.x + 40} 30, ${p1.x + 24} ${cardTop}`
      : `M ${p1.x + dir * 14} ${cardTop} Q ${(p1.x + p2.x) / 2} 22 ${p2.x - dir * 14} ${cardTop}`;
    const pillLabel = current.packet || current.short;

    const statusColors = {
      secret: 'var(--stage-ch-front)',
      verified: 'var(--stage-ch-back)',
      alert: 'var(--stage-ch-attack)',
      consumed: 'var(--stage-node-sub)',
      normal: focalColor
    };

    const cardsHtml = actors
      .map(a => {
        const pos = positions[a.id];
        const isSender = current.from === a.id;
        const isReceiver = current.to === a.id;
        const isActive = isSender || isReceiver;
        const slots = ledger[a.id] || [];
        const borderC = isActive ? focalColor : 'var(--stage-border)';

        const slotsHtml =
          slots.length === 0
            ? `<text x="${cardW / 2}" y="138" text-anchor="middle" fill="var(--stage-node-sub)" fill-opacity="0.55" font-family="JetBrains Mono, monospace" font-size="9.5">No artifacts held yet</text>`
            : slots
                .map((sl, si) => {
                  const sy = 96 + si * 40;
                  const sc = statusColors[sl.status] || focalColor;
                  const isStruck = sl.status === 'consumed';
                  const maxChars = n >= 5 ? 16 : 19;
                  const slotText = sl.label.length > maxChars ? `${sl.label.slice(0, maxChars - 1)}…` : sl.label;
                  return `
                    <g class="${sl.isFresh ? 'actor-artifact-chip is-fresh' : ''}" transform="translate(8, ${sy})">
                      <rect width="${cardW - 16}" height="32" rx="7" fill="var(--stage-pill-bg)" stroke="${sc}" stroke-opacity="${sl.isFresh ? '0.85' : '0.32'}" stroke-width="${sl.isFresh ? 1.4 : 1}"/>
                      <text x="9" y="20" fill="${isStruck ? 'var(--stage-node-sub)' : 'var(--stage-pill-text)'}" ${isStruck ? 'text-decoration="line-through" opacity="0.65"' : ''} font-family="JetBrains Mono, monospace" font-size="${n >= 5 ? '8.5' : '9'}" font-weight="700">${escapeHtml(slotText)}</text>
                      ${
                        sl.isFresh
                          ? `<circle cx="${cardW - 26}" cy="16" r="3.2" fill="${sc}"/>`
                          : ''
                      }
                    </g>
                  `;
                })
                .join('');

        return `
          <g transform="translate(${pos.left}, ${pos.top})">
            <rect width="${cardW}" height="${cardH}" rx="13" fill="var(--stage-node-fill)" stroke="${borderC}" stroke-width="${isActive ? 1.8 : 1}"/>
            <!-- Card Header -->
            <g transform="translate(${cardW / 2}, 28)">
              <circle r="15" fill="var(--stage-pill-bg)" stroke="${borderC}" stroke-width="1.2"/>
              <g style="color:${isActive ? focalColor : 'var(--stage-node-sub)'}" transform="scale(0.56)">${ACTOR_ICONS[a.icon] || ACTOR_ICONS.client}</g>
            </g>
            <text x="${cardW / 2}" y="58" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="800">${escapeHtml(a.label)}</text>
            <text x="${cardW / 2}" y="71" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="8.8">${escapeHtml(a.sub)}</text>
            <line x1="12" y1="82" x2="${cardW - 12}" y2="82" stroke="var(--stage-border)" stroke-width="1"/>
            ${slotsHtml}
          </g>
        `;
      })
      .join('');

    svgWrap.innerHTML = `
      <svg class="stage-svg ledger-stage-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cryptographic Keyring & State Ledger OAuth diagram">
        <defs>
          <marker id="${uid}-l-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${focalColor}"/>
          </marker>
        </defs>

        <!-- Overhead Transfer Conduit -->
        <path id="${uid}-l-bg" d="${busD}" fill="none" stroke="${focalColor}" stroke-width="1.4" stroke-dasharray="5 5" opacity="0.32" marker-end="url(#${uid}-l-arrow)"/>
        <path id="${uid}-l-trace" d="${busD}" fill="none" stroke="${focalColor}" stroke-width="2.5" stroke-linecap="round" marker-end="url(#${uid}-l-arrow)"/>

        ${cardsHtml}

        <!-- Arrival Ring on Receiver Card Top Port -->
        <g data-role="arrival-burst" transform="translate(${p2.x}, ${cardTop})" class="${animatePacket ? '' : 'is-arrived'}" pointer-events="none">
          <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="${focalColor}" stroke-width="2"/>
          <circle class="arrival-bead-pop" cx="0" cy="0" r="14" fill="none" stroke="${focalColor}" stroke-width="2" opacity="0"/>
        </g>

        <!-- Gliding Transfer Pill -->
        <g data-role="l-capsule">
          <rect data-role="l-cap-bg" x="-90" y="-12" width="180" height="24" rx="8" fill="var(--stage-pill-bg)" stroke="${focalColor}" stroke-opacity="0.6" stroke-width="1.2"/>
          <text data-role="l-cap-txt" x="0" y="4" text-anchor="middle" fill="var(--stage-pill-text)" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${escapeHtml(pillLabel)}</text>
        </g>
      </svg>
    `;

    const halfW = fitSvgPill(svgWrap, '[data-role="l-cap-bg"]', '[data-role="l-cap-txt"]', pillLabel, 126, 26);
    const bgPath = svgWrap.querySelector(`#${uid}-l-bg`);
    const tracePath = svgWrap.querySelector(`#${uid}-l-trace`);
    const cap = svgWrap.querySelector('[data-role="l-capsule"]');
    const arrival = svgWrap.querySelector('[data-role="arrival-burst"]');

    if (bgPath && tracePath && cap) {
      const totalLen = bgPath.getTotalLength();
      const duration = Math.round(820 / speed);
      const startTime = performance.now();
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      tracePath.style.strokeDasharray = `${totalLen}`;
      tracePath.style.strokeDashoffset = `${totalLen}`;

      const updateAt = eased => {
        tracePath.style.strokeDashoffset = `${Math.max(0, totalLen * (1 - eased))}`;
        const capT = isSelf ? 0.5 : 0.14 + eased * 0.36;
        const pt = bgPath.getPointAtLength(totalLen * capT);
        const cx = Math.max(halfW + 18, Math.min(W - halfW - 18, pt.x));
        const cy = Math.max(22, Math.min(cardTop - 18, pt.y - 6));
        cap.setAttribute('transform', `translate(${cx}, ${cy})`);
      };

      if (prefersReduced || !animatePacket) {
        updateAt(1);
        if (arrival) arrival.classList.add('is-arrived');
      } else {
        const tick = now => {
          const raw = Math.min(1, (now - startTime) / duration);
          updateAt(1 - Math.pow(1 - raw, 3));
          if (raw < 1) rafId = requestAnimationFrame(tick);
          else {
            updateAt(1);
            if (arrival) arrival.classList.add('is-arrived');
          }
        };
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  // ==========================================================================
  // VIEW 3 ("pov"): 🖥️ SPLIT POV — USER SCREEN + BEHIND-THE-SCENES WIRE
  // Left Pane  : Simulated Browser Address Bar / Device UI (what a human sees)
  // Right Pane : Clean 2D Server & Actor Topology (what moves on the network)
  // ==========================================================================
  function renderUserWirePovView({ svgWrap, steps, actors, current, focalColor, animatePacket }) {
    const W = 880;
    const H = 328;
    const hasHumanOrDevice = actors.some(a => ['user', 'tv', 'phone'].includes(a.icon));
    const srcText = `${current.packet || ''} ${current.short || ''} ${current.title || ''}`;
    const pillLabel = current.packet || current.short;

    // Build Left Simulated Screen State
    let urlBarText = 'https://app.example.com';
    let screenBadge = '';
    let screenTitle = '';
    let screenSub1 = '';
    let screenSub2 = '';
    let screenAccent = 'var(--stage-node-sub)';

    if (current.channel === 'front') {
      screenAccent = 'var(--stage-ch-front)';
      if (/302|Callback|\?code=/i.test(srcText)) {
        urlBarText = 'app.example.com/callback?code=Splx…';
        screenBadge = '↩ 302 BROWSER CALLBACK';
        screenTitle = 'Returning Claim Ticket (code)';
        screenSub1 = 'URL carries temporary code + state';
        screenSub2 = '✓ Zero Access/Refresh tokens in URL!';
      } else if (/Login|MFA|Passkey|Consent|SAML IdP/i.test(srcText)) {
        urlBarText = 'https://auth.example.com/login';
        screenBadge = '🔐 IDENTITY PROVIDER UI';
        screenTitle = 'User Signs In & Consents';
        screenSub1 = 'Passkey / MFA verified directly on IdP';
        screenSub2 = '✓ Client App never sees password!';
      } else {
        urlBarText = 'auth.example.com/authorize?challenge=…';
        screenBadge = '🌐 FRONT-CHANNEL REDIRECT';
        screenTitle = 'Navigating Browser to IdP';
        screenSub1 = 'Public params visible in address bar';
        screenSub2 = 'code_challenge + state + scope';
      }
    } else if (current.channel === 'oob') {
      screenAccent = 'var(--stage-ch-oob)';
      urlBarText = '📱 Secondary Device / Push App';
      screenBadge = '📱 OUT-OF-BAND PROMPT';
      screenTitle = 'Decoupled Device Approval';
      screenSub1 = 'User confirms code / FaceID on phone';
      screenSub2 = '✓ Primary device waits on back-channel';
    } else if (current.channel === 'attack') {
      screenAccent = 'var(--stage-ch-attack)';
      urlBarText = '⚠️ Adversarial Threat Simulation';
      screenBadge = '☠ SECURITY BOUNDARY TEST';
      screenTitle = /400|401|REJECT|BLOCKED|REVOKED/i.test(srcText) ? 'Attack Blocked by Protocol!' : 'Attacker Intercepts Traffic';
      screenSub1 = pillLabel;
      screenSub2 = 'Watch right-hand topology response →';
    } else if (!hasHumanOrDevice) {
      screenAccent = 'var(--stage-ch-back)';
      urlBarText = 'headless://daemon-worker.internal';
      screenBadge = '⌨️ HEADLESS WORKLOAD';
      screenTitle = 'No Browser or Human User';
      screenSub1 = 'Pure machine-to-machine execution';
      screenSub2 = `Active: ${pillLabel}`;
    } else {
      screenAccent = 'var(--stage-ch-back)';
      const isLastApi = stepIndex === steps.length - 1 && /Bearer|API|200/i.test(srcText);
      urlBarText = 'https://app.example.com/dashboard';
      screenBadge = isLastApi ? '✅ APP UI READY' : '🔒 INVISIBLE TO BROWSER';
      screenTitle = isLastApi ? 'Protected Data Loaded!' : 'Zero Browser URL Activity';
      screenSub1 = isLastApi ? 'API authorized via server-held token' : 'Happening server-to-server over TLS';
      screenSub2 = '✓ Browser extensions see nothing here';
    }

    // Build Right 2D Topology Grid (x = 358..864) inside 506x300 pane
    const rightLeft = 358;
    const rightW = 508;
    const positions = {};
    const n = actors.length;
    const coords2D =
      n <= 2
        ? [
            { x: rightLeft + 140, y: 184 },
            { x: rightLeft + 368, y: 184 }
          ]
        : n === 3
        ? [
            { x: rightLeft + 118, y: 112 },
            { x: rightLeft + 388, y: 112 },
            { x: rightLeft + 254, y: 248 }
          ]
        : n === 4
        ? [
            { x: rightLeft + 124, y: 108 },
            { x: rightLeft + 384, y: 108 },
            { x: rightLeft + 124, y: 248 },
            { x: rightLeft + 384, y: 248 }
          ]
        : [
            { x: rightLeft + 108, y: 102 },
            { x: rightLeft + 254, y: 92 },
            { x: rightLeft + 400, y: 102 },
            { x: rightLeft + 164, y: 250 },
            { x: rightLeft + 348, y: 250 }
          ];

    actors.forEach((a, i) => {
      const c = coords2D[i] || { x: rightLeft + 254, y: 180 };
      positions[a.id] = { x: c.x, y: c.y, actor: a };
    });

    const p1 = positions[current.from] || positions[actors[0].id];
    const p2 = positions[current.to] || p1;
    const isSelf = p1 === p2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const activeD = isSelf
      ? `M ${p1.x - 14} ${p1.y - 20} C ${p1.x - 36} ${p1.y - 68}, ${p1.x + 36} ${p1.y - 68}, ${p1.x + 14} ${p1.y - 20}`
      : `M ${p1.x + (dx / len) * 24} ${p1.y + (dy / len) * 24} Q ${(p1.x + p2.x) / 2 + nx * 22} ${(p1.y + p2.y) / 2 + ny * 22} ${p2.x - (dx / len) * 24} ${p2.y - (dy / len) * 24}`;

    // Background mesh links between all step pairs
    const seenPairs = new Set();
    const meshLines = [];
    steps.forEach(st => {
      if (st.from === st.to) return;
      const key = [st.from, st.to].sort().join('--');
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      const a = positions[st.from];
      const b = positions[st.to];
      if (a && b) {
        meshLines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--stage-border)" stroke-width="1.2" stroke-dasharray="4 5"/>`);
      }
    });

    const actorsHtml = actors
      .map(a => {
        const pos = positions[a.id];
        const isActive = current.from === a.id || current.to === a.id;
        const sc = isActive ? focalColor : 'var(--stage-border)';
        const ic = isActive ? focalColor : 'var(--stage-node-sub)';
        return `
          <g class="actor-node ${isActive ? 'active is-lifted' : 'is-idle'}" transform="translate(${pos.x}, ${pos.y})">
            <g class="actor-body">
              <circle r="22" fill="var(--stage-node-fill)" stroke="${sc}" stroke-width="${isActive ? 2.2 : 1.2}"/>
              <g style="color:${ic}" transform="scale(0.76)">${ACTOR_ICONS[a.icon] || ACTOR_ICONS.client}</g>
              <text y="36" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="${isActive ? 800 : 600}">${escapeHtml(a.label)}</text>
            </g>
          </g>
        `;
      })
      .join('');

    svgWrap.innerHTML = `
      <svg class="stage-svg pov-stage-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Split User Screen and Backend Topology OAuth diagram">
        <defs>
          <marker id="${uid}-p-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${focalColor}"/>
          </marker>
        </defs>

        <!-- LEFT PANE: SIMULATED USER / BROWSER / DEVICE VIEWPORT -->
        <g transform="translate(14, 12)">
          <rect width="330" height="304" rx="13" fill="var(--stage-node-fill)" stroke="${current.channel === 'front' || current.channel === 'oob' ? screenAccent : 'var(--stage-border)'}" stroke-width="1.4"/>
          <!-- Browser Chrome Bar -->
          <rect x="1" y="1" width="328" height="38" rx="12" fill="var(--stage-pill-bg)"/>
          <circle cx="18" cy="20" r="4" fill="#f43f5e" opacity="0.75"/>
          <circle cx="31" cy="20" r="4" fill="#f59e0b" opacity="0.75"/>
          <circle cx="44" cy="20" r="4" fill="#10b981" opacity="0.75"/>
          <rect x="58" y="8" width="260" height="24" rx="6" fill="var(--stage-node-fill)" stroke="var(--stage-border)" stroke-width="1"/>
          <text x="68" y="24" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9.2" font-weight="600">${escapeHtml(urlBarText.length > 34 ? `${urlBarText.slice(0, 33)}…` : urlBarText)}</text>

          <text x="165" y="64" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" letter-spacing="0.06em">WHAT THE USER / BROWSER SEES</text>

          <!-- Simulated Inner Screen Card -->
          <rect x="20" y="80" width="290" height="196" rx="11" fill="var(--stage-pill-bg)" stroke="${screenAccent}" stroke-opacity="0.45" stroke-width="1.2"/>
          <g transform="translate(165, 114)">
            <rect x="-88" y="-11" width="176" height="22" rx="11" fill="${screenAccent}" fill-opacity="0.14"/>
            <text y="4" text-anchor="middle" fill="${screenAccent}" font-family="JetBrains Mono, monospace" font-size="9" font-weight="800">${escapeHtml(screenBadge)}</text>
          </g>
          <text x="165" y="158" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="800">${escapeHtml(screenTitle)}</text>
          <text x="165" y="186" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="10">${escapeHtml(screenSub1.length > 40 ? `${screenSub1.slice(0, 38)}…` : screenSub1)}</text>
          <line x1="44" y1="212" x2="286" y2="212" stroke="var(--stage-border)" stroke-width="1"/>
          <text x="165" y="238" text-anchor="middle" fill="${screenAccent}" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">${escapeHtml(screenSub2.length > 40 ? `${screenSub2.slice(0, 38)}…` : screenSub2)}</text>
        </g>

        <!-- RIGHT PANE: LIVE NETWORK TOPOLOGY -->
        <rect x="${rightLeft}" y="12" width="${rightW}" height="304" rx="13" fill="var(--stage-node-fill)" fill-opacity="0.45" stroke="var(--stage-border)" stroke-width="1"/>
        <text x="${rightLeft + 18}" y="34" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" letter-spacing="0.05em">NETWORK &amp; SERVER TOPOLOGY (STEP ${stepIndex + 1}/${steps.length})</text>

        ${meshLines.join('')}
        <path id="${uid}-p-bg" d="${activeD}" fill="none" stroke="${focalColor}" stroke-width="1.5" opacity="0.3" marker-end="url(#${uid}-p-arrow)"/>
        <path id="${uid}-p-trace" d="${activeD}" fill="none" stroke="${focalColor}" stroke-width="2.6" stroke-linecap="round" marker-end="url(#${uid}-p-arrow)"/>

        <g data-role="arrival-burst" transform="translate(${p2.x}, ${p2.y})" class="${animatePacket ? '' : 'is-arrived'}" pointer-events="none">
          <circle class="arrival-bead-pop" cx="0" cy="0" r="24" fill="none" stroke="${focalColor}" stroke-width="2" opacity="0"/>
        </g>

        ${actorsHtml}

        <circle data-role="p-orb" r="5" fill="#ffffff" stroke="${focalColor}" stroke-width="2.2"/>
        <g data-role="p-capsule">
          <rect data-role="p-cap-bg" x="-80" y="-12" width="160" height="23" rx="7" fill="var(--stage-pill-bg)" stroke="${focalColor}" stroke-opacity="0.55" stroke-width="1.1"/>
          <text data-role="p-cap-txt" x="0" y="3.5" text-anchor="middle" fill="var(--stage-pill-text)" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">${escapeHtml(pillLabel)}</text>
        </g>
      </svg>
    `;

    const halfW = fitSvgPill(svgWrap, '[data-role="p-cap-bg"]', '[data-role="p-cap-txt"]', pillLabel, 118, 22);
    const bgPath = svgWrap.querySelector(`#${uid}-p-bg`);
    const tracePath = svgWrap.querySelector(`#${uid}-p-trace`);
    const orb = svgWrap.querySelector('[data-role="p-orb"]');
    const cap = svgWrap.querySelector('[data-role="p-capsule"]');
    const arrival = svgWrap.querySelector('[data-role="arrival-burst"]');

    if (bgPath && tracePath && orb && cap) {
      const totalLen = bgPath.getTotalLength();
      const duration = Math.round(820 / speed);
      const startTime = performance.now();
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      tracePath.style.strokeDasharray = `${totalLen}`;
      tracePath.style.strokeDashoffset = `${totalLen}`;

      const updateAt = eased => {
        const orbT = isSelf ? 0.88 : 0.06 + eased * 0.88;
        const orbPt = bgPath.getPointAtLength(totalLen * orbT);
        orb.setAttribute('cx', orbPt.x);
        orb.setAttribute('cy', orbPt.y);
        tracePath.style.strokeDashoffset = `${Math.max(0, totalLen * (1 - orbT))}`;

        const capT = isSelf ? 0.5 : 0.5;
        const midPt = bgPath.getPointAtLength(totalLen * capT);
        const cx = Math.max(rightLeft + halfW + 12, Math.min(W - halfW - 22, midPt.x));
        const cy = Math.max(52, Math.min(H - 28, midPt.y - 10));
        cap.setAttribute('transform', `translate(${cx}, ${cy})`);
      };

      if (prefersReduced || !animatePacket) {
        updateAt(1);
        if (arrival) arrival.classList.add('is-arrived');
      } else {
        const tick = now => {
          const raw = Math.min(1, (now - startTime) / duration);
          updateAt(1 - Math.pow(1 - raw, 3));
          if (raw < 1) rafId = requestAnimationFrame(tick);
          else {
            updateAt(1);
            if (arrival) arrival.classList.add('is-arrived');
          }
        };
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  // ==========================================================================
  // VIEW 4 ("sequence"): 📊 COMPACT ABOVE-THE-FOLD SEQUENCE LADDER
  // Crisp, fast-scanning chronological sequence diagram (~350px tall so the stage,
  // narrative, AND raw HTTP wire packet stay visible together without scrolling!)
  // ==========================================================================
  function renderCompactSequenceView({ svgWrap, steps, actors, current, focalColor, animatePacket }) {
    const W = 880;
    const rowH = 40;
    const headerY = 32;
    const firstRowY = 86;
    const H = firstRowY + steps.length * rowH + 18;
    const padX = 114;
    const n = actors.length;
    const span = W - padX * 2;
    const positions = {};

    actors.forEach((a, i) => {
      const x = n === 1 ? W / 2 : padX + (span / (n - 1)) * i;
      positions[a.id] = { x, y: headerY, actor: a };
    });

    const lifelinesHtml = actors
      .map(a => {
        const pos = positions[a.id];
        const isActive = current.from === a.id || current.to === a.id;
        const strokeColor = isActive ? focalColor : 'var(--stage-border)';

        return `
          <g class="waterfall-actor-col">
            <line x1="${pos.x}" y1="${headerY + 20}" x2="${pos.x}" y2="${H - 12}" stroke="${isActive ? focalColor : 'var(--stage-border)'}" stroke-width="${isActive ? 1.5 : 1}" stroke-dasharray="${isActive ? 'none' : '4 5'}" opacity="${isActive ? 0.45 : 0.75}"/>
            <g transform="translate(${pos.x}, ${headerY})">
              <rect x="-72" y="-18" width="144" height="36" rx="10" fill="var(--stage-node-fill)" stroke="${strokeColor}" stroke-width="${isActive ? 1.6 : 1}"/>
              <text y="-2" text-anchor="middle" fill="var(--stage-node-title)" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="${isActive ? 800 : 600}">${escapeHtml(a.label)}</text>
              <text y="11" text-anchor="middle" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="9">${escapeHtml(a.sub)}</text>
            </g>
          </g>
        `;
      })
      .join('');

    const rowsHtml = steps
      .map((st, idx) => {
        const ry = firstRowY + idx * rowH;
        const p1 = positions[st.from] || positions[actors[0].id];
        const p2 = positions[st.to] || p1;
        const isSelf = st.from === st.to;
        const isCurrent = idx === stepIndex;
        const isPast = idx < stepIndex;
        const rowOpacity = isCurrent ? 1 : isPast ? 0.88 : 0.34;
        const lbl = st.packet || st.short;

        if (isCurrent) {
          return `
            <g class="waterfall-row is-current" data-wf-step="${idx}" style="cursor:pointer">
              <rect x="24" y="${ry - 18}" width="${W - 48}" height="36" rx="8" fill="${focalColor}" fill-opacity="0.07" stroke="${focalColor}" stroke-opacity="0.24" stroke-width="1"/>
              <text x="40" y="${ry + 4}" fill="${focalColor}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="800">#${idx + 1}</text>
            </g>
          `;
        }

        const dir = p2.x >= p1.x ? 1 : -1;
        const x1 = isSelf ? p1.x : p1.x + dir * 8;
        const x2 = isSelf ? p1.x + 52 : p2.x - dir * 10;
        const midX = isSelf ? p1.x + 62 : (x1 + x2) / 2;
        const lineY = ry + 6;
        const pathD = isSelf
          ? `M ${p1.x} ${ry - 4} L ${p1.x + 42} ${ry - 4} L ${p1.x + 42} ${ry + 6} L ${p1.x + 8} ${ry + 6}`
          : `M ${x1} ${lineY} L ${x2} ${lineY}`;
        const labelW = Math.max(84, Math.ceil(lbl.length * 6.3 + 14));
        const labelX = isSelf ? midX - 6 : midX - labelW / 2;

        return `
          <g class="waterfall-row ${isPast ? 'is-past' : 'is-upcoming'}" data-wf-step="${idx}" opacity="${rowOpacity}" style="cursor:pointer">
            <rect x="24" y="${ry - 17}" width="${W - 48}" height="34" rx="7" fill="transparent"/>
            <text x="40" y="${ry + 4}" fill="var(--stage-node-sub)" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">${isPast ? '✓' : `#${idx + 1}`}</text>
            <path d="${pathD}" fill="none" stroke="var(--stage-node-sub)" stroke-opacity="0.62" stroke-width="1.4" marker-end="url(#${uid}-s-muted)"/>
            <circle cx="${p1.x}" cy="${lineY}" r="3.2" fill="var(--stage-node-sub)" fill-opacity="0.8"/>
            <rect x="${labelX}" y="${ry - 14}" width="${labelW}" height="15" rx="4" fill="var(--stage-pill-bg)" stroke="var(--stage-border)" stroke-width="0.8"/>
            <text x="${midX}" y="${ry - 3}" text-anchor="${isSelf ? 'start' : 'middle'}" fill="var(--stage-node-title)" fill-opacity="${isPast ? '0.88' : '0.75'}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600">${escapeHtml(lbl)}</text>
          </g>
        `;
      })
      .join('');

    const activeRy = firstRowY + stepIndex * rowH;
    const beamY = activeRy + 9;
    const ap1 = positions[current.from] || positions[actors[0].id];
    const ap2 = positions[current.to] || ap1;
    const isSelf = current.from === current.to;
    const dir = ap2.x >= ap1.x ? 1 : -1;
    const ax1 = isSelf ? ap1.x : ap1.x + dir * 8;
    const ax2 = isSelf ? ap1.x + 52 : ap2.x - dir * 10;
    const activeD = isSelf
      ? `M ${ap1.x} ${activeRy - 2} L ${ap1.x + 48} ${activeRy - 2} L ${ap1.x + 48} ${activeRy + 10} L ${ap1.x + 8} ${activeRy + 10}`
      : `M ${ax1} ${beamY} L ${ax2} ${beamY}`;
    const pillLabel = current.packet || current.short;

    svgWrap.innerHTML = `
      <svg class="stage-svg waterfall-stage-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Compact Sequence Waterfall OAuth diagram">
        <defs>
          <marker id="${uid}-s-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${focalColor}"/>
          </marker>
          <marker id="${uid}-s-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="var(--stage-node-sub)" fill-opacity="0.75"/>
          </marker>
        </defs>
        ${lifelinesHtml}
        ${rowsHtml}

        <circle cx="${ap1.x}" cy="${beamY}" r="4.5" fill="${focalColor}"/>
        <path id="${uid}-s-beam" d="${activeD}" fill="none" stroke="${focalColor}" stroke-width="2.4" stroke-linecap="round" marker-end="url(#${uid}-s-active)"/>

        <g data-role="arrival-burst" transform="translate(${ap2.x}, ${beamY})" class="${animatePacket ? '' : 'is-arrived'}" pointer-events="none">
          <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="${focalColor}" stroke-width="2"/>
          <circle class="arrival-bead-pop" cx="0" cy="0" r="12" fill="none" stroke="${focalColor}" stroke-width="2" opacity="0"/>
        </g>

        <g data-role="s-capsule">
          <rect data-role="s-cap-bg" x="-85" y="-10" width="170" height="20" rx="6" fill="var(--stage-pill-bg)" stroke="${focalColor}" stroke-opacity="0.48" stroke-width="1"/>
          <text data-role="s-cap-txt" x="0" y="3.5" text-anchor="middle" fill="var(--stage-pill-text)" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">${escapeHtml(pillLabel)}</text>
        </g>
      </svg>
    `;

    const halfW = fitSvgPill(svgWrap, '[data-role="s-cap-bg"]', '[data-role="s-cap-txt"]', pillLabel, 118, 22);

    svgWrap.querySelectorAll('[data-wf-step]').forEach(rowEl => {
      rowEl.addEventListener('click', () => {
        stopPlayback();
        goToStep(Number(rowEl.dataset.wfStep), true);
      });
    });

    const beam = svgWrap.querySelector(`#${uid}-s-beam`);
    const cap = svgWrap.querySelector('[data-role="s-capsule"]');
    const arrival = svgWrap.querySelector('[data-role="arrival-burst"]');

    if (beam && cap) {
      const totalLen = beam.getTotalLength();
      const duration = Math.round(740 / speed);
      const startTime = performance.now();
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      beam.style.strokeDasharray = `${totalLen}`;
      beam.style.strokeDashoffset = `${totalLen}`;

      const setSeqAt = eased => {
        beam.style.strokeDashoffset = `${Math.max(0, totalLen * (1 - eased))}`;
        const targetX = isSelf ? ap1.x + 58 + halfW : ax1 + (ax2 - ax1) * (0.15 + eased * 0.35);
        const cx = Math.max(halfW + 64, Math.min(W - halfW - 28, targetX));
        const cy = isSelf ? activeRy + 2 : activeRy - 7;
        cap.setAttribute('transform', `translate(${cx}, ${cy})`);
      };

      if (prefersReduced || !animatePacket) {
        setSeqAt(1);
        if (arrival) arrival.classList.add('is-arrived');
      } else {
        const tick = now => {
          const raw = Math.min(1, (now - startTime) / duration);
          setSeqAt(1 - Math.pow(1 - raw, 3));
          if (raw < 1) rafId = requestAnimationFrame(tick);
          else {
            setSeqAt(1);
            if (arrival) arrival.classList.add('is-arrived');
          }
        };
        rafId = requestAnimationFrame(tick);
      }
    }
  }

  function renderStageState(animatePacket) {
    cancelAnimationFrame(rafId);
    const steps = getSteps();
    const actors = getActors();
    const current = steps[stepIndex] || steps[0];
    if (!current) return;

    if (getAnimStyle) {
      animStyle = getAnimStyle();
    }

    updateNavButtons(steps);

    const shell = container.querySelector('[data-slot="shell"]');
    if (shell) shell.classList.toggle('attack-active', isAttackActive());

    const focalColor = getFocalColor(current);
    if (animatePacket) {
      sound.playTone(current.channel);
    }

    const svgWrap = container.querySelector('[data-slot="svg-wrap"]');
    const stageArgs = { svgWrap, steps, actors, current, focalColor, animatePacket };

    if (animStyle === 'ledger') {
      renderCryptoLedgerView(stageArgs);
    } else if (animStyle === 'pov') {
      renderUserWirePovView(stageArgs);
    } else if (animStyle === 'sequence') {
      renderCompactSequenceView(stageArgs);
    } else {
      renderTrustZonesView(stageArgs);
    }

    // Connected Stepper Timeline Scrubber
    const timeline = container.querySelector('[data-slot="timeline"]');
    timeline.innerHTML = steps
      .map((st, idx) => {
        const stateCls = idx === stepIndex ? 'active' : idx < stepIndex ? 'completed' : 'upcoming';
        return `
      <button type="button" class="timeline-pill ${stateCls} ${st.channel === 'attack' ? 'attack' : ''}" data-step="${idx}">
        <div class="t-node-row">
          <span class="t-dot">${idx < stepIndex ? '✓' : idx + 1}</span>
          <span class="t-step">STEP ${idx + 1}</span>
        </div>
        <span class="t-lbl">${escapeHtml(st.short)}</span>
      </button>`;
      })
      .join('');

    timeline.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopPlayback();
        goToStep(Number(btn.dataset.step), true);
      });
    });

    // Synchronized 2-Column Readout with Directional Page-Slide & Wire Focus Highlights
    const lens = getLens ? getLens() : 'both';
    let descHtml = '';
    if (current.beginner && current.expert) {
      if (lens === 'beginner') descHtml = `<p>${escapeHtml(current.beginner)}</p>`;
      else if (lens === 'expert') descHtml = `<p>${escapeHtml(current.expert)}</p>`;
      else descHtml = `<p>${escapeHtml(current.beginner)}</p><p class="readout-expert-note"><strong>RFC Wire Detail:</strong> ${escapeHtml(current.expert)}</p>`;
    } else {
      descHtml = `<p>${escapeHtml(current.desc || '')}</p>`;
    }

    const showWireSide = lens !== 'beginner' && Boolean(current.wire);
    const dirCls = animatePacket ? (stepDirection === 'backward' ? 'slide-from-left' : 'slide-from-right') : '';
    const readout = container.querySelector('[data-slot="readout"]');
    readout.className = `theatre-split-readout ${showWireSide ? 'two-col' : 'one-col'} ${dirCls}`;
    readout.innerHTML = `
      <div class="readout-narrative">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <div class="step-badge-num ${current.channel} ${animatePacket ? 'tick-up' : ''}" style="width:32px;height:32px;font-size:0.8rem">${stepIndex + 1}/${steps.length}</div>
          <span class="step-channel-tag ${current.channel}">${CHANNEL_LABEL[current.channel] || current.channel}</span>
        </div>
        <h4>${escapeHtml(current.title)}</h4>
        ${descHtml}
      </div>
      ${
        showWireSide
          ? `
        <div class="readout-wire">
          <div class="readout-wire-head">
            <span>📡 Step ${stepIndex + 1} Wire Packet · ${escapeHtml(current.short)}</span>
            <button type="button" class="copy-mini" data-action="copy-step-wire">Copy</button>
          </div>
          <pre class="code-pre wire-focus-pre" style="max-height:210px;padding:12px 14px;font-size:0.8125rem">${highlightWireWithFocus(current.wire)}</pre>
        </div>`
          : ''
      }
    `;

    const copyBtn = readout.querySelector('[data-action="copy-step-wire"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (onCopy) onCopy(current.wire, 'Copied Step Wire HTTP');
      });
    }

    if (onStepChange) {
      onStepChange(current, stepIndex, activeMode);
    }
  }

  renderShell();

  return {
    destroy() {
      stopPlayback();
      cancelAnimationFrame(rafId);
    },
    refreshLens() {
      renderStageState(false);
    },
    setAnimStyle(nextStyle, animate = true) {
      animStyle = nextStyle;
      renderStageState(animate);
    },
    launchAttackMode() {
      const attackMode = config.modes && config.modes.find(m => m.type === 'attack');
      if (attackMode) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setMode(attackMode.id, true);
      }
    }
  };
}
