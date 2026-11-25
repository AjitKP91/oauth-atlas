// ==========================================================================
// OAUTH ATLAS — Wire HTTP Syntax Highlighter & JWT / SAML X-Ray Inspector
// ==========================================================================

import { CLAIM_EXPLANATIONS } from '../data/glossary.js?v=4.3';

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlightWire(raw) {
  const escaped = escapeHtml(raw || '');
  return escaped
    .split('\n')
    .map(line => {
      if (/^#/.test(line.trim())) {
        return `<span style="color:var(--code-muted);font-style:italic">${line}</span>`;
      }
      if (/^(GET|POST|PUT|DELETE)\s/.test(line)) {
        return line.replace(/^(GET|POST|PUT|DELETE)/, '<span class="syn-method">$1</span>');
      }
      if (/^HTTP\/1\.1\s+2\d\d/.test(line)) {
        return `<span class="syn-status">${line}</span>`;
      }
      if (/^HTTP\/1\.1\s+[45]\d\d/.test(line)) {
        return `<span class="syn-status-err">${line}</span>`;
      }
      if (/^[A-Za-z0-9-]+:\s/.test(line) && !line.trim().startsWith('"')) {
        return line.replace(/^([A-Za-z0-9-]+):/, '<span class="syn-header">$1</span>:');
      }
      if (line.trim().startsWith('&lt;')) {
        return line.replace(
          /(&lt;\/?[a-zA-Z0-9:_-]+)|(\s[a-zA-Z0-9:_-]+)(=)/g,
          (m, tag, attr, eq) => {
            if (tag) return `<span class="syn-xml-tag">${tag}</span>`;
            if (attr) return `<span class="syn-xml-attr">${attr}</span>${eq}`;
            return m;
          }
        );
      }
      return line
        .replace(/(&quot;[^&]+?&quot;)(\s*:)/g, '<span class="syn-key">$1</span>$2')
        .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="syn-str">$1</span>')
        .replace(/:\s*(\d+)/g, ': <span class="syn-num">$1</span>');
    })
    .join('\n');
}

export function renderXRayPanel(container, artifacts = []) {
  if (!container) return;
  if (!artifacts.length) {
    container.innerHTML = `<div class="xray-claims"><p style="color:var(--code-muted);font-size:0.84rem">Select a step with a JWT or SAML artifact to inspect its decoded claims.</p></div>`;
    return;
  }

  let activeIdx = 0;

  function draw() {
    const art = artifacts[activeIdx];
    const tabsHtml = artifacts
      .map(
        (a, i) =>
          `<button type="button" class="xray-tab ${i === activeIdx ? 'active' : ''}" data-idx="${i}">${escapeHtml(a.label)}</button>`
      )
      .join('');

    const headerRows = Object.entries(art.header || {})
      .map(([k, v]) => renderClaimRow(k, v, 'var(--ch-attack)'))
      .join('');

    const payloadRows = Object.entries(art.payload || {})
      .map(([k, v]) => renderClaimRow(k, v, 'var(--accent-primary)'))
      .join('');

    const isSaml = /saml/i.test(art.label || '') || Boolean(art.header && art.header.SignatureAlg);
    const headerTitle = isSaml ? 'SAML Envelope & XMLDSig' : 'JOSE Header';
    const payloadTitle = isSaml ? 'SAML Subject & Conditions' : 'Decoded Claims Payload';

    container.innerHTML = `
      <div class="code-panel-head">
        <span style="display:inline-flex;align-items:center;gap:8px">
          <span class="window-dots"><i></i><i></i><i></i></span>
          <span>Token X-Ray Decoder</span>
        </span>
        <span style="color:var(--ch-back)">RFC Claim Annotations</span>
      </div>
      <div class="xray-tabs">${tabsHtml}</div>
      <div class="xray-claims">
        <div style="font-family:var(--font-mono);font-size:0.75rem;text-transform:uppercase;color:var(--ch-attack);letter-spacing:0.08em;padding:2px 4px">${headerTitle}</div>
        ${headerRows}
        <div style="font-family:var(--font-mono);font-size:0.75rem;text-transform:uppercase;color:var(--ch-oob);letter-spacing:0.08em;padding:8px 4px 2px">${payloadTitle}</div>
        ${payloadRows}
      </div>
    `;

    container.querySelectorAll('.xray-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeIdx = Number(btn.dataset.idx);
        draw();
      });
    });
  }

  draw();
}

function renderClaimRow(key, val, accent) {
  const formatted = typeof val === 'object' ? JSON.stringify(val) : String(val);
  const note = CLAIM_EXPLANATIONS[key] || 'Protocol-specific or vendor claim.';
  return `
    <div class="claim-row">
      <span class="claim-k" style="color:${accent}">${escapeHtml(key)}</span>
      <span class="claim-v">${escapeHtml(formatted)}</span>
      <span class="claim-explain">${escapeHtml(note)}</span>
    </div>
  `;
}
