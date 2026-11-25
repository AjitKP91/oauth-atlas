// ==========================================================================
// OAUTH ATLAS — 8 Bespoke Hands-On Interactive Learning Sandboxes
// ==========================================================================

import { escapeHtml } from './jwt-xray.js?v=4.3';
import { sound } from './sound.js?v=4.3';

async function sha256Base64Url(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(hash);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(48);
  crypto.getRandomValues(arr);
  return Array.from(arr, x => chars[x % chars.length]).join('');
}

export function mountFlowLab(container, labType, openGlossaryTerm) {
  if (!container || !labType) return () => {};
  const cleanups = [];

  if (labType === 'pkce') {
    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>🔐 Live PKCE SHA-256 Forge &amp; Parameter Explorer</h4>
          <span class="lab-badge">Real Web Crypto API</span>
        </div>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px">
          Don’t memorize RFC character rules—your OAuth SDK generates these automatically! Type anything below (or click Randomize) to watch real browser <code>SHA-256</code> lock your secret into a one-way <code>code_challenge</code>:
        </p>
        <div class="pkce-grid">
          <div class="pkce-box">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <label for="pkce-ver-input" style="margin-bottom:0">1. Secret code_verifier (Private)</label>
              <button type="button" class="stage-btn" id="pkce-rand-btn" style="padding:4px 10px;font-size:0.75rem">🎲 Randomize</button>
            </div>
            <input id="pkce-ver-input" class="pkce-input" value="dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" />
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
              <button type="button" class="stage-btn primary" id="pkce-legit-btn">✅ Redeem as Legit Client</button>
              <button type="button" class="stage-btn attack-toggle" id="pkce-crack-btn">☠ Redeem as Attacker</button>
            </div>
          </div>
          <div class="pkce-arrow">
            <span>SHA-256</span>
            <span style="font-size:1.35rem">→</span>
            <span>Base64URL</span>
          </div>
          <div class="pkce-box">
            <label>2. Public code_challenge (Sent in Browser Redirect)</label>
            <div id="pkce-chal-out" class="pkce-output">Computing...</div>
            <div id="pkce-crack-msg" style="font-size:0.76rem;color:var(--text-muted);margin-top:8px">
              Test redeeming the authorization code as the legitimate client vs. an attacker guessing a verifier.
            </div>
          </div>
        </div>
        <div class="concept-duo">
          <div class="concept-mini">
            <strong>What is <code>nonce</code>? ("Number Used Once")</strong>
            An OpenID Connect random token sent at login and baked inside the signed <strong>ID Token</strong>. Client verifies <code>id_token.nonce === saved_nonce</code> to block ID Token replay attacks. <button type="button" class="term-trigger" style="font-size:0.78rem" data-glossary="nonce">Deep dive →</button>
          </div>
          <div class="concept-mini">
            <strong><code>state</code> vs. <code>nonce</code> vs. <code>BFF</code></strong>
            <code>state</code> guards the browser redirect against CSRF; <code>nonce</code> binds the returned ID Token; a <strong>BFF</strong> proxy keeps tokens out of <code>localStorage</code> completely. <button type="button" class="term-trigger" style="font-size:0.78rem" data-glossary="bff">Explain BFF →</button>
          </div>
        </div>
      </div>
    `;

    const input = container.querySelector('#pkce-ver-input');
    const out = container.querySelector('#pkce-chal-out');
    const msg = container.querySelector('#pkce-crack-msg');

    const update = async () => {
      const val = input.value || '';
      out.textContent = await sha256Base64Url(val);
    };
    input.addEventListener('input', update);
    container.querySelector('#pkce-rand-btn').addEventListener('click', () => {
      input.value = randomVerifier();
      msg.style.color = 'var(--text-muted)';
      msg.textContent = 'Fresh 48-char cryptographic verifier generated (>256 bits entropy).';
      sound.playTone('local');
      update();
    });
    container.querySelector('#pkce-legit-btn').addEventListener('click', async () => {
      const chal = await sha256Base64Url(input.value || '');
      sound.playTone('success');
      msg.style.color = 'var(--ch-back)';
      msg.textContent = `✅ 200 OK! AS verified SHA256(verifier) === "${chal.slice(0, 14)}…" — Tokens issued!`;
    });
    container.querySelector('#pkce-crack-btn').addEventListener('click', async () => {
      const fakeChal = await sha256Base64Url('attacker_wrong_guess_' + Math.random());
      sound.playTone('attack');
      msg.style.color = 'var(--ch-attack)';
      msg.textContent = `❌ 400 invalid_grant! Attacker hash "${fakeChal.slice(0, 14)}…" ≠ stored challenge. Code destroyed!`;
    });
    update();
  }

  if (labType === 'cache-sim') {
    let cachedMode = false;
    let totalCalls = 0;
    let asHits = 0;
    let cacheHits = 0;

    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>⚡ Interactive M2M Token Cache &amp; Rate-Limit Simulator</h4>
          <div class="toggle-pills">
            <button type="button" class="toggle-pill active danger" id="cs-uncached">❌ Uncached (Naive Anti-Pattern)</button>
            <button type="button" class="toggle-pill" id="cs-cached">✅ Cached + Singleflight (Prod)</button>
          </div>
        </div>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px">
          Click <strong>Fire 5 API Requests</strong> below to see why fetching a new <code>client_credentials</code> token on every call triggers <code>429 Too Many Requests</code> outages—and how caching with a singleflight lock (one shared refresh for concurrent calls) fixes it:
        </p>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:14px">
          <button type="button" class="stage-btn primary" id="cs-fire">🚀 Fire 5 API Requests</button>
          <button type="button" class="stage-btn" id="cs-reset">↺ Reset</button>
          <span id="cs-status" style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">Ready</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px">
          <div class="pkce-box"><label>API Calls Fired</label><div id="cs-total" style="font-size:1.5rem;font-weight:800;color:var(--accent-primary)">0</div></div>
          <div class="pkce-box"><label>Auth Server /token Hits</label><div id="cs-as" style="font-size:1.5rem;font-weight:800;color:var(--ch-attack)">0</div></div>
          <div class="pkce-box"><label>0.4ms Cache Hits</label><div id="cs-hit" style="font-size:1.5rem;font-weight:800;color:var(--ch-back)">0</div></div>
        </div>
      </div>
    `;

    const elTotal = container.querySelector('#cs-total');
    const elAs = container.querySelector('#cs-as');
    const elHit = container.querySelector('#cs-hit');
    const elStatus = container.querySelector('#cs-status');
    const btnUncached = container.querySelector('#cs-uncached');
    const btnCached = container.querySelector('#cs-cached');

    const sync = () => {
      elTotal.textContent = totalCalls;
      elAs.textContent = asHits;
      elHit.textContent = cacheHits;
    };

    btnUncached.addEventListener('click', () => {
      cachedMode = false;
      btnUncached.className = 'toggle-pill active danger';
      btnCached.className = 'toggle-pill';
    });
    btnCached.addEventListener('click', () => {
      cachedMode = true;
      btnCached.className = 'toggle-pill active safe';
      btnUncached.className = 'toggle-pill';
    });
    container.querySelector('#cs-reset').addEventListener('click', () => {
      totalCalls = 0; asHits = 0; cacheHits = 0;
      elStatus.style.color = 'var(--text-muted)';
      elStatus.textContent = 'Reset.';
      sync();
    });
    container.querySelector('#cs-fire').addEventListener('click', () => {
      totalCalls += 5;
      if (!cachedMode) {
        asHits += 5;
        if (asHits >= 10) {
          sound.playTone('attack');
          elStatus.style.color = '#fb7185';
          elStatus.textContent = '🔥 HTTP 429 Too Many Requests! Auth Server rate-limited your microservice (+140ms p99 penalty)!';
        } else {
          sound.playTone('front');
          elStatus.style.color = '#fbbf24';
          elStatus.textContent = '⚠️ Wasting 5 full /token round-trips (+110ms latency each). Fire again to hit rate limit!';
        }
      } else {
        if (asHits === 0) {
          asHits += 1;
          cacheHits += 4;
        } else {
          cacheHits += 5;
        }
        sound.playTone('success');
        elStatus.style.color = '#34d399';
        elStatus.textContent = '✅ 1 token fetched total! All subsequent requests hit Redis/in-memory cache in 0.4ms until 80% TTL.';
      }
      sync();
    });
  }

  if (labType === 'rtr-vault') {
    let gen = 1;
    let familyRevoked = false;
    let mutexEnabled = false;
    let history = [{ id: 'RT_gen1', status: 'ACTIVE' }];

    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>🛡️ Live Token Family F-42 Vault &amp; 3-Tab Parallel Race Simulator</h4>
          <span class="lab-badge" id="rtr-badge">FAMILY ACTIVE</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center">
          <button type="button" class="stage-btn primary" id="rtr-rotate">🔄 Legit Refresh</button>
          <button type="button" class="stage-btn attack-toggle" id="rtr-replay">☠️ Attacker Replays RT_gen1</button>
          <button type="button" class="stage-btn" id="rtr-race" style="border-color:color-mix(in srgb,var(--ch-front) 50%,transparent);color:var(--ch-front)">⚡ 3-Tab Parallel 401</button>
          <button type="button" class="stage-btn" id="rtr-mutex">🔓 Web Locks Mutex: OFF</button>
          <button type="button" class="stage-btn" id="rtr-reset">↺ Reset</button>
        </div>
        <div id="rtr-log" style="font-family:var(--font-mono);font-size:0.8rem;margin-bottom:12px;color:var(--ch-back)">
          Family F-42 active. Try "⚡ 3-Tab Parallel 401" with Mutex OFF vs. ON to see the #1 real-world RTR outage!
        </div>
        <div id="rtr-cards" style="display:flex;flex-wrap:wrap;gap:10px"></div>
      </div>
    `;

    const badge = container.querySelector('#rtr-badge');
    const log = container.querySelector('#rtr-log');
    const cards = container.querySelector('#rtr-cards');
    const mutexBtn = container.querySelector('#rtr-mutex');

    const renderVault = () => {
      badge.textContent = familyRevoked ? '🚨 FAMILY F-42 REVOKED' : `FAMILY ACTIVE (gen ${gen})`;
      badge.style.color = familyRevoked ? 'var(--ch-attack)' : 'var(--ch-back)';
      badge.style.borderColor = familyRevoked ? 'color-mix(in srgb,var(--ch-attack) 45%,transparent)' : 'color-mix(in srgb,var(--ch-back) 40%,transparent)';
      cards.innerHTML = history
        .map(t => {
          const c = t.status === 'ACTIVE' ? 'var(--ch-back)' : t.status === 'USED' ? 'var(--ch-front)' : 'var(--ch-attack)';
          return `<div class="rtr-token-card" style="border-color:${c}">
            <div class="rtr-token-id">${t.id}</div>
            <div class="rtr-token-state" style="color:${c}">${t.status}</div>
          </div>`;
        })
        .join('');
    };

    mutexBtn.addEventListener('click', () => {
      mutexEnabled = !mutexEnabled;
      mutexBtn.textContent = mutexEnabled ? '🔒 Web Locks Mutex: ON' : '🔓 Web Locks Mutex: OFF';
      mutexBtn.classList.toggle('mode-active', mutexEnabled);
      sound.playTone('local');
    });

    container.querySelector('#rtr-race').addEventListener('click', () => {
      if (familyRevoked) {
        sound.playTone('attack');
        log.style.color = 'var(--ch-attack)';
        log.textContent = '❌ Family F-42 is already revoked—click ↺ Reset first!';
        return;
      }
      const curTok = `RT_gen${gen}`;
      if (!mutexEnabled) {
        history[history.length - 1].status = 'USED';
        gen++;
        history.push({ id: `RT_gen${gen} (Tab 1)`, status: 'REVOKED' });
        familyRevoked = true;
        history.forEach(t => (t.status = 'REVOKED'));
        sound.playTone('attack');
        log.style.color = 'var(--ch-attack)';
        log.textContent = `💥 SELF-INFLICTED OUTAGE! Tab 1 rotated ${curTok} -> RT_gen${gen}, then Tab 2 arrived 15ms later with ${curTok} -> tripped Reuse Detection & logged Alice out! Flip Web Locks Mutex ON and retry.`;
      } else {
        history[history.length - 1].status = 'USED';
        gen++;
        history.push({ id: `RT_gen${gen} (Shared via BroadcastChannel)`, status: 'ACTIVE' });
        sound.playTone('success');
        log.style.color = 'var(--ch-back)';
        log.textContent = `✅ SAFE! navigator.locks("oauth-refresh") serialized Tabs 1–3: Tab 1 refreshed once (${curTok} -> RT_gen${gen}) and broadcast the fresh Access Token to Tabs 2 & 3!`;
      }
      renderVault();
    });

    container.querySelector('#rtr-rotate').addEventListener('click', () => {
      if (familyRevoked) {
        sound.playTone('attack');
        log.style.color = 'var(--ch-attack)';
        log.textContent = '❌ 400 invalid_grant — Family F-42 is permanently revoked. User must re-login cleanly!';
        return;
      }
      history[history.length - 1].status = 'USED';
      gen++;
      history.push({ id: `RT_gen${gen}`, status: 'ACTIVE' });
      sound.playTone('back');
      log.style.color = 'var(--ch-back)';
      log.textContent = `✅ Rotated! RT_gen${gen - 1} shredded (kept in family log); client now holds RT_gen${gen}.`;
      renderVault();
    });

    container.querySelector('#rtr-replay').addEventListener('click', () => {
      if (gen === 1 && !familyRevoked) {
        history[0].status = 'USED';
        gen++;
        history.push({ id: 'RT_gen2 (Attacker!)', status: 'ACTIVE' });
        sound.playTone('front');
        log.style.color = 'var(--ch-front)';
        log.textContent = '⚠️ Attacker beat Alice to RT_gen1! Now click "🔄 Legit Refresh" — Alice’s honest retry of RT_gen1 will ALSO trip Reuse Detection & revoke the attacker!';
        renderVault();
        return;
      }
      familyRevoked = true;
      history.forEach(t => (t.status = 'REVOKED'));
      sound.playTone('attack');
      log.style.color = 'var(--ch-attack)';
      log.textContent = '🚨 REUSE DETECTED ON RT_gen1! Authorization Server immediately revoked ALL tokens in Family F-42 — attacker evicted!';
      renderVault();
    });

    container.querySelector('#rtr-reset').addEventListener('click', () => {
      gen = 1; familyRevoked = false;
      history = [{ id: 'RT_gen1', status: 'ACTIVE' }];
      log.style.color = 'var(--ch-back)';
      log.textContent = 'Fresh session minted. Click "🔄 Legit Refresh" once, then click "☠️ Attacker Replays RT_gen1"!';
      renderVault();
    });

    renderVault();
  }

  if (labType === 'jti-replay') {
    const seen = new Set();
    let currentJti = 'jwtb-7f4e91c0-3b2a';

    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>🎯 Live Redis <code>jti</code> Replay Guard &amp; RFC 7523 §2.1 vs §2.2</h4>
          <span class="lab-badge">Single-Use Assertion Defense</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px">
          <button type="button" class="stage-btn primary" id="jti-send">📨 Submit Signed JWT (jti: <span id="jti-cur">${currentJti}</span>)</button>
          <button type="button" class="stage-btn" id="jti-mint">✨ Mint Fresh jti</button>
        </div>
        <div id="jti-res" style="padding:10px 14px;border-radius:10px;background:var(--bg-code);border:1px solid var(--code-border);font-family:var(--font-mono);font-size:0.8125rem;color:var(--code-muted);margin-bottom:14px">
          Click "Submit Signed JWT" twice in a row to watch the Redis replay cache block the 2nd attempt!
        </div>
        <div class="concept-duo">
          <div class="concept-mini">
            <strong>RFC 7523 §2.1 — JWT as Authorization Grant (Flow 4)</strong>
            <code>grant_type=...:jwt-bearer</code> + <code>assertion=&lt;JWT&gt;</code>. The JWT itself <em>replaces</em> interactive user login/consent.
          </div>
          <div class="concept-mini">
            <strong>RFC 7523 §2.2 — JWT as Client Auth (<code>private_key_jwt</code>)</strong>
            <code>client_assertion_type=...:jwt-bearer</code> + <code>client_assertion=&lt;JWT&gt;</code>. Replaces <code>client_secret</code> in <em>any</em> grant (like Flow 1, 2, or 8).
          </div>
        </div>
      </div>
    `;

    const elRes = container.querySelector('#jti-res');
    const elCur = container.querySelector('#jti-cur');

    container.querySelector('#jti-send').addEventListener('click', () => {
      if (seen.has(currentJti)) {
        sound.playTone('attack');
        elRes.style.color = 'var(--ch-attack)';
        elRes.textContent = `❌ HTTP 400 invalid_grant — REPLAY BLOCKED! Redis key "jti:${currentJti}" already exists.`;
      } else {
        seen.add(currentJti);
        sound.playTone('success');
        elRes.style.color = 'var(--ch-back)';
        elRes.textContent = `✅ HTTP 200 OK — Access Token issued! Stored "jti:${currentJti}" in Redis (TTL 180s). Try submitting again!`;
      }
    });

    container.querySelector('#jti-mint').addEventListener('click', () => {
      currentJti = 'jwtb-' + Math.random().toString(16).slice(2, 10) + '-' + Math.random().toString(16).slice(2, 6);
      elCur.textContent = currentJti;
      elRes.style.color = 'var(--accent-primary)';
      elRes.textContent = `✨ New signed assertion ready with unique jti="${currentJti}".`;
      sound.playTone('local');
    });
  }

  if (labType === 'saml-inspector') {
    const parts = [
      { id: 'issuer', tag: '<saml:Issuer>', val: 'https://idp.corp.example.com/saml2', desc: 'Identifies the Corporate SAML IdP. Downstream AS looks up the pre-imported X.509 certificate for this exact Issuer.' },
      { id: 'sig', tag: '<ds:Signature>', val: 'XMLDSig RSA-SHA256 + exc-c14n', desc: 'Covers Reference URI="#_a7c4e9f2". Any whitespace edit breaks digest! Hardened parsers read claims ONLY from this signed subtree (defeats XSW).' },
      { id: 'nameid', tag: '<saml:NameID>', val: 'alice.chen@corp.example.com', desc: 'The user identity mapped by S/4HANA (USREXTID) or Salesforce to local user account ACHEN.' },
      { id: 'cond', tag: '<saml:Conditions>', val: 'Audience + NotOnOrAfter (≤5 min)', desc: 'Strictly binds this assertion to ONE OAuth AS Audience and Recipient=/token so Web-SSO assertions cannot be cross-replayed.' }
    ];
    let activePart = parts[0];
    let xswInjected = false;

    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>🧬 Interactive SAML 2.0 XML Anatomy &amp; XSW Attack Lab</h4>
          <button type="button" class="stage-btn attack-toggle" id="saml-xsw-btn">☠️ Inject XSW Attack</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px" id="saml-btns">
          ${parts.map((p, i) => `<button type="button" class="stage-btn ${i === 0 ? 'mode-active' : ''}" data-pid="${p.id}">${escapeHtml(p.tag)}</button>`).join('')}
        </div>
        <div id="saml-detail" style="padding:14px 16px;border-radius:12px;background:var(--bg-code);border:1px solid var(--code-border);color:var(--code-text)"></div>
      </div>
    `;

    const detail = container.querySelector('#saml-detail');
    const xswBtn = container.querySelector('#saml-xsw-btn');

    const draw = () => {
      if (xswInjected) {
        detail.style.borderColor = 'color-mix(in srgb,var(--ch-attack) 55%,transparent)';
        detail.innerHTML = `
          <div style="font-family:var(--font-mono);font-size:0.8125rem;color:var(--ch-attack);margin-bottom:10px;font-weight:700">☠️ XML SIGNATURE WRAPPING (XSW) PAYLOAD INJECTED — Unsigned sibling &lt;NameID&gt;ADMIN_SUPERUSER&lt;/NameID&gt; spliced around real signed Alice node!</div>
          <div class="concept-duo" style="margin-top:0">
            <div class="concept-mini" style="background:color-mix(in srgb,var(--ch-attack) 10%,transparent);border-color:color-mix(in srgb,var(--ch-attack) 40%,transparent);color:var(--text-primary)">
              <strong style="color:var(--ch-attack)">❌ Naive XPath Parser (BREACHED!)</strong>
              Verifies <code>&lt;ds:Signature URI="#_a7c4e9f2"&gt;</code> → Valid! Then calls <code>//saml:NameID</code> → extracts unsigned <code>ADMIN_SUPERUSER</code>!
            </div>
            <div class="concept-mini" style="background:color-mix(in srgb,var(--ch-back) 10%,transparent);border-color:color-mix(in srgb,var(--ch-back) 40%,transparent);color:var(--text-primary)">
              <strong style="color:var(--ch-back)">✅ Hardened XSD + Signed-Subtree Parser (BLOCKED!)</strong>
              Validates strict SAML 2.0 XSD schema, confirms <code>Reference URI</code> equals root Assertion ID, and rejects with <code>400 invalid_grant</code>!
            </div>
          </div>
        `;
        return;
      }
      detail.style.borderColor = 'var(--code-border)';
      detail.innerHTML = `
        <div style="font-family:var(--font-mono);font-size:0.82rem;color:var(--accent-primary);margin-bottom:6px;font-weight:700">${escapeHtml(activePart.tag)} → <span style="color:var(--ch-front)">${escapeHtml(activePart.val)}</span></div>
        <div style="font-size:0.86rem;color:var(--text-secondary)">${escapeHtml(activePart.desc)}</div>
      `;
    };
    xswBtn.addEventListener('click', () => {
      xswInjected = !xswInjected;
      xswBtn.classList.toggle('mode-active', xswInjected);
      xswBtn.textContent = xswInjected ? '✓ Clear XSW Payload' : '☠️ Inject XSW Attack';
      sound.playTone(xswInjected ? 'attack' : 'local');
      draw();
    });
    container.querySelectorAll('[data-pid]').forEach(btn => {
      btn.addEventListener('click', () => {
        xswInjected = false;
        xswBtn.classList.remove('mode-active');
        xswBtn.textContent = '☠️ Inject XSW Attack';
        activePart = parts.find(p => p.id === btn.dataset.pid);
        container.querySelectorAll('[data-pid]').forEach(b => b.classList.toggle('mode-active', b === btn));
        sound.playTone('local');
        draw();
      });
    });
    draw();
  }

  if (labType === 'act-builder') {
    const allServices = ['svc-checkout', 'svc-billing', 'svc-ledger', 'svc-fraud-audit'];
    let hops = 1;
    let isDelegation = true;

    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>🔗 Interactive RFC 8693 Nested <code>act</code> Chain Builder</h4>
          <div class="toggle-pills">
            <button type="button" class="toggle-pill active safe" id="act-del">✅ Delegation (act Claim)</button>
            <button type="button" class="toggle-pill" id="act-imp">⚠️ Impersonation (No act)</button>
          </div>
        </div>
        <div class="hop-controls">
          <button type="button" class="stage-btn primary" id="hop-add">+ Add Microservice Hop</button>
          <button type="button" class="stage-btn" id="hop-rem">− Remove Hop</button>
          <span style="font-size:0.8rem;color:var(--text-muted)">Notice RFC 8693 §4.1: <strong>outermost <code>act</code> = most recent caller</strong>!</span>
        </div>
        <div class="hop-chain-visual" id="hop-visual"></div>
        <pre class="code-pre" id="hop-json" style="border-radius:12px;background:var(--bg-code);border:1px solid var(--code-border);color:var(--code-text)"></pre>
      </div>
    `;

    const vis = container.querySelector('#hop-visual');
    const pre = container.querySelector('#hop-json');
    const btnDel = container.querySelector('#act-del');
    const btnImp = container.querySelector('#act-imp');

    const renderChain = () => {
      const activeSvcs = allServices.slice(0, hops);
      const targetAud = allServices[hops] || 'svc-vault-db';
      vis.innerHTML =
        `<span class="hop-node user">👤 Alice (sub)</span>` +
        activeSvcs.map(s => `<span style="color:var(--text-dim)">→</span><span class="hop-node">${s}</span>`).join('') +
        `<span style="color:var(--text-dim)">→</span><span class="hop-node" style="border-color:color-mix(in srgb,var(--ch-oob) 55%,transparent);color:var(--ch-oob);background:var(--ch-oob-soft)">🎯 aud: ${targetAud}</span>`;

      const token = {
        iss: 'https://auth.example.com',
        sub: 'usr_alice_9f82a1',
        aud: `https://${targetAud}.internal.example.com`,
        exp: 1795069505
      };

      if (isDelegation) {
        let nested = null;
        for (let i = 0; i < activeSvcs.length; i++) {
          nested = nested ? { sub: activeSvcs[i], act: nested } : { sub: activeSvcs[i] };
        }
        token.act = nested;
      }

      pre.textContent = JSON.stringify(token, null, 2);
    };

    container.querySelector('#hop-add').addEventListener('click', () => {
      if (hops < allServices.length) {
        hops++;
        sound.playTone('back');
        renderChain();
      }
    });
    container.querySelector('#hop-rem').addEventListener('click', () => {
      if (hops > 1) {
        hops--;
        sound.playTone('local');
        renderChain();
      }
    });
    btnDel.addEventListener('click', () => {
      isDelegation = true;
      btnDel.className = 'toggle-pill active safe';
      btnImp.className = 'toggle-pill';
      renderChain();
    });
    btnImp.addEventListener('click', () => {
      isDelegation = false;
      btnImp.className = 'toggle-pill active danger';
      btnDel.className = 'toggle-pill';
      renderChain();
    });
    renderChain();
  }

  if (labType === 'device-tv') {
    let unlocked = false;
    let pollInterval = 5;
    let pollCount = 1;

    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>📺 Playable Smart TV + Smartphone Pairing Simulator</h4>
          <span class="lab-badge">RFC 8628 Live Loop</span>
        </div>
        <div class="device-sim-grid">
          <div class="smart-tv-frame" id="tv-screen">
            <div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:0.75rem;color:#94a3b8">
              <span>LIVING ROOM 4K TV</span>
              <span id="tv-state-pill" style="color:#fbbf24">● AWAITING AUTHORIZATION</span>
            </div>
            <div id="tv-body" style="margin-top:14px">
              <div style="font-size:0.86rem;color:#cbd5e1">Visit <strong style="color:#fff">auth.example.com/device</strong> on your phone and enter:</div>
              <div class="tv-code">WDJB-MJHT</div>
              <div style="font-size:0.76rem;color:#94a3b8">Base-20 unambiguous consonants (no 0/O or 1/I/l · 25.6 billion combos)</div>
            </div>
            <div class="poll-ticker" id="tv-ticker">
              <span>POST /token (#1) → 400 authorization_pending</span>
              <span>interval: 5s</span>
            </div>
          </div>

          <div class="phone-frame">
            <div class="phone-notch"></div>
            <div style="font-family:var(--font-mono);font-size:0.75rem;color:#c084fc;text-align:center">USER SMARTPHONE BROWSER</div>
            <div style="padding:10px;border-radius:10px;background:rgba(30,41,59,0.7);font-size:0.8rem">
              <div style="color:#94a3b8;font-size:0.75rem">Confirm Device Sign-In</div>
              <div style="font-weight:700;margin:4px 0">Living Room TV App</div>
              <div style="font-family:var(--font-mono);color:#38bdf8;font-size:0.9rem">Code: WDJB-MJHT</div>
            </div>
            <button type="button" class="stage-btn primary" id="tv-approve" style="justify-content:center">✓ FaceID Approve on Phone</button>
            <button type="button" class="stage-btn" id="tv-slow" style="justify-content:center">🐢 Simulate slow_down (+5s)</button>
            <button type="button" class="stage-btn" id="tv-reset" style="justify-content:center">↺ Reset TV</button>
          </div>
        </div>
      </div>
    `;

    const tvState = container.querySelector('#tv-state-pill');
    const tvBody = container.querySelector('#tv-body');
    const tvTicker = container.querySelector('#tv-ticker');

    const pollTimer = setInterval(() => {
      if (unlocked || document.hidden) return;
      pollCount++;
      tvTicker.innerHTML = `<span>POST /token (#${pollCount}) → 400 authorization_pending</span><span>interval: ${pollInterval}s</span>`;
    }, 2200);
    cleanups.push(() => clearInterval(pollTimer));

    container.querySelector('#tv-approve').addEventListener('click', () => {
      unlocked = true;
      sound.playTone('success');
      tvState.textContent = '● SIGNED IN (ALICE)';
      tvState.style.color = '#34d399';
      tvBody.innerHTML = `
        <div style="padding:14px;border-radius:12px;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.4)">
          <div style="font-size:1.15rem;font-weight:800;color:#34d399">🎬 Welcome back, Alice!</div>
          <div style="font-size:0.82rem;color:#cbd5e1;margin-top:4px">TV’s next back-channel poll received <code>200 OK</code> with Access + Refresh Tokens. Ready to stream!</div>
        </div>
      `;
      tvTicker.style.color = '#34d399';
      tvTicker.innerHTML = `<span>POST /token (#${pollCount + 1}) → 200 OK Tokens Issued!</span><span>polling stopped</span>`;
    });

    container.querySelector('#tv-slow').addEventListener('click', () => {
      if (unlocked) return;
      pollInterval += 5;
      sound.playTone('front');
      tvTicker.style.color = '#fb7185';
      tvTicker.innerHTML = `<span>400 slow_down! Backoff mandated by RFC 8628 §3.5</span><span>interval: ${pollInterval}s</span>`;
    });

    container.querySelector('#tv-reset').addEventListener('click', () => {
      unlocked = false;
      pollInterval = 5;
      pollCount = 1;
      tvState.textContent = '● AWAITING AUTHORIZATION';
      tvState.style.color = '#fbbf24';
      tvBody.innerHTML = `
        <div style="font-size:0.86rem;color:#cbd5e1">Visit <strong style="color:#fff">auth.example.com/device</strong> on your phone and enter:</div>
        <div class="tv-code">WDJB-MJHT</div>
        <div style="font-size:0.76rem;color:#94a3b8">Base-20 unambiguous consonants (no 0/O or 1/I/l · 25.6 billion combos)</div>
      `;
      tvTicker.style.color = '#fbbf24';
      tvTicker.innerHTML = `<span>POST /token (#1) → 400 authorization_pending</span><span>interval: 5s</span>`;
    });
  }

  if (labType === 'ciba-modes') {
    let code = 'TXN-8492';
    container.innerHTML = `
      <div class="live-lab-box">
        <div class="lab-header">
          <h4>💳 CIBA Dual-Device Visual Binding Simulator (<code>binding_message</code>)</h4>
          <button type="button" class="stage-btn" id="ciba-newcode">🎲 New Transaction Code</button>
        </div>
        <div class="device-sim-grid">
          <div class="smart-tv-frame" style="border-color:#0284c7">
            <div style="font-family:var(--font-mono);font-size:0.75rem;color:#38bdf8">CONSUMPTION DEVICE · BANK AGENT / POS TERMINAL</div>
            <div style="margin-top:10px;font-size:0.88rem;color:#cbd5e1">Customer: <strong>alice.chen@example.com</strong> · Payment: <strong>$250.00</strong></div>
            <div style="margin-top:10px;font-size:0.8rem;color:#94a3b8">Read or show this dynamic binding code to customer:</div>
            <div class="tv-code" id="ciba-code-pos" style="font-size:1.75rem">${code}</div>
            <div id="ciba-pos-status" style="font-family:var(--font-mono);font-size:0.76rem;color:#fbbf24">⏳ Waiting for FaceID approval on customer’s Auth Device...</div>
          </div>
          <div class="phone-frame" style="border-color:#a855f7">
            <div class="phone-notch"></div>
            <div style="font-family:var(--font-mono);font-size:0.75rem;color:#c084fc;text-align:center">ALICE’S REGISTERED BANKING APP</div>
            <div style="padding:10px;border-radius:10px;background:rgba(168,85,247,0.14);border:1px solid rgba(168,85,247,0.35);font-size:0.8rem">
              <div>Approve <strong>$250.00</strong> POS Payment?</div>
              <div style="margin-top:5px;font-family:var(--font-mono);font-weight:800;color:#fff">Match Code: <span id="ciba-code-phone" style="color:#38bdf8">${code}</span></div>
            </div>
            <button type="button" class="stage-btn primary" id="ciba-ok" style="justify-content:center">🔓 FaceID Approve</button>
            <button type="button" class="stage-btn attack-toggle" id="ciba-deny" style="justify-content:center">✕ Deny (Push Fatigue!)</button>
          </div>
        </div>
      </div>
    `;

    const cPos = container.querySelector('#ciba-code-pos');
    const cPh = container.querySelector('#ciba-code-phone');
    const cStat = container.querySelector('#ciba-pos-status');

    container.querySelector('#ciba-newcode').addEventListener('click', () => {
      code = 'TXN-' + Math.floor(1000 + Math.random() * 9000);
      cPos.textContent = code;
      cPh.textContent = code;
      cStat.style.color = '#fbbf24';
      cStat.textContent = '⏳ Fresh dynamic binding_message minted! Awaiting customer approval...';
      sound.playTone('local');
    });
    container.querySelector('#ciba-ok').addEventListener('click', () => {
      sound.playTone('success');
      cStat.style.color = '#34d399';
      cStat.textContent = `✅ Approved via FaceID (${code})! Bank Auth Server (OP) sent Ping webhook -> POS fetched Access & ID Tokens via private_key_jwt.`;
    });
    container.querySelector('#ciba-deny').addEventListener('click', () => {
      sound.playTone('attack');
      cStat.style.color = '#fb7185';
      cStat.textContent = '🛑 Denied by Alice! Bank Auth Server (OP) returns 400 access_denied and flags a security alert.';
    });
  }

  // Bind any glossary buttons inside the lab
  container.querySelectorAll('[data-glossary]').forEach(btn => {
    btn.addEventListener('click', () => openGlossaryTerm && openGlossaryTerm(btn.dataset.glossary));
  });

  return () => cleanups.forEach(fn => fn());
}
