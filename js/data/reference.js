// ==========================================================================
// OAUTH ATLAS — Decision Tree, OAuth 2.1 Rules, Deprecated Flows & Checklist
// ==========================================================================

export const DECISION_NODES = {
  start: {
    id: 'start',
    question: 'Is a human user’s identity or permission involved?',
    subtitle: 'First separate pure machine-to-machine automation from flows involving a person.',
    options: [
      {
        label: 'No — Pure Machine-to-Machine',
        hint: 'Background cron, ETL worker, daemon, or microservice acting under its own service identity.',
        next: 'q_m2m'
      },
      {
        label: 'Yes — Human User Involved',
        hint: 'An end-user is logging in, consenting, or their identity is propagating downstream.',
        next: 'q_refresh'
      }
    ]
  },
  q_m2m: {
    id: 'q_m2m',
    question: 'How does the target Authorization Server authenticate workloads?',
    subtitle: 'Always prefer asymmetric keys or Workload Identity over static secrets.',
    options: [
      {
        label: 'Standard OAuth AS (supports private_key_jwt or mTLS)',
        hint: 'Entra ID, Okta, Auth0, Keycloak, SAP BTP, custom OAuth 2.1 servers.',
        result: {
          flowId: 'client-credentials',
          title: 'Flow 2: Client Credentials',
          badge: 'grant_type=client_credentials',
          why: 'Pure back-channel server-to-server flow. Pair with private_key_jwt (RFC 7523 §2.2) or mTLS (RFC 8705) instead of static client_secrets, and cache tokens in memory/Redis.'
        }
      },
      {
        label: 'Target AS requires a Self-Signed Assertion Grant',
        hint: 'e.g., Google Cloud Service Account 2-legged OAuth or Salesforce pre-authorized integrations.',
        result: {
          flowId: 'jwt-bearer',
          title: 'Flow 4: JWT Bearer (RFC 7523)',
          badge: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          why: 'Sign a short-lived JWT assertion (with unique jti and exact AS audience) using your private key and swap it directly at /token.'
        }
      }
    ]
  },
  q_refresh: {
    id: 'q_refresh',
    question: 'Does the client already hold a valid Refresh Token?',
    subtitle: 'If the user consented earlier and the short-lived access token just expired, renew silently.',
    options: [
      {
        label: 'Yes — Renewing an existing session',
        hint: 'Access token expired (5–15 min TTL) and we hold an active refresh token.',
        result: {
          flowId: 'refresh-token',
          title: 'Flow 3: Refresh Token (+ Rotation)',
          badge: 'grant_type=refresh_token',
          why: 'Silently mints a fresh access token without re-prompting the user. Enforce Refresh Token Rotation + Reuse Detection (or DPoP/mTLS sender-constraining) per OAuth 2.1.'
        }
      },
      {
        label: 'No — Need an initial or downstream token',
        hint: 'Either logging the user in now or propagating an already-authenticated user across backend hops.',
        next: 'q_backend'
      }
    ]
  },
  q_backend: {
    id: 'q_backend',
    question: 'Is this a backend service acting on an ALREADY-authenticated user?',
    subtitle: 'Distinguish a brand-new user login from server-to-server Principal Propagation (passing a user’s identity downstream).',
    options: [
      {
        label: 'Yes — Server-to-Server Principal Propagation',
        hint: 'User already signed in upstream; backend needs a downstream API token on that user’s behalf.',
        next: 'q_proof'
      },
      {
        label: 'No — User must authenticate / consent right now',
        hint: 'Starting a brand-new user login or explicit approval ceremony.',
        next: 'q_browser'
      }
    ]
  },
  q_proof: {
    id: 'q_proof',
    question: 'What existing cryptographic proof of the user does the backend hold?',
    subtitle: 'Match the grant type to the incoming credential format and trust topology.',
    options: [
      {
        label: 'OAuth / OIDC Token needing a new audience or delegation chain',
        hint: 'Microservice A → Service B zero-trust handoff or Cloud Workload Identity Federation.',
        result: {
          flowId: 'token-exchange',
          title: 'Flow 6: Token Exchange (RFC 8693)',
          badge: 'urn:ietf:params:oauth:grant-type:token-exchange',
          why: 'Swaps subject_token for a tightly audience-scoped downstream token with narrowed scopes and an explicit act delegation chain (or Entra OBO on Azure).'
        }
      },
      {
        label: 'Enterprise SAML 2.0 XML Assertion',
        hint: 'Corporate SAML SSO bridging into SAP S/4HANA, SuccessFactors, or Salesforce APIs.',
        result: {
          flowId: 'saml2-bearer',
          title: 'Flow 5: SAML 2.0 Bearer (RFC 7522)',
          badge: 'urn:ietf:params:oauth:grant-type:saml2-bearer',
          why: 'Translates a base64url-encoded signed <saml:Assertion> XML into a lightweight OAuth access token with full end-user principal propagation.'
        }
      },
      {
        label: 'Trusted IdP JWT or Admin Pre-Authorized User Key',
        hint: 'Salesforce JWT Bearer, Google Workspace Domain-Wide Delegation, or SAP OAuth2JWTBearer.',
        result: {
          flowId: 'jwt-bearer',
          title: 'Flow 4: JWT Bearer (RFC 7523)',
          badge: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          why: 'Presents a cryptographically signed JWT assertion to the AS back-channel for immediate token issuance with zero browser redirects.'
        }
      }
    ]
  },
  q_browser: {
    id: 'q_browser',
    question: 'Can the user’s device open a local system browser?',
    subtitle: 'If a real system browser is available, always use Authorization Code + PKCE.',
    options: [
      {
        label: 'Yes — Web App, SPA, Mobile App, or Desktop/CLI with local browser',
        hint: 'Browser, BFF, iOS ASWebAuthenticationSession, Android Custom Tabs, localhost loopback.',
        result: {
          flowId: 'auth-code-pkce',
          title: 'Flow 1: Authorization Code + PKCE',
          badge: 'grant_type=authorization_code + S256',
          why: 'The universal OAuth 2.1 gold standard for interactive users. Pair SPAs with a Backend-for-Frontend (BFF) so tokens never touch browser localStorage.'
        }
      },
      {
        label: 'No — Input-constrained or decoupled device',
        hint: 'Smart TV, SSH CLI, POS terminal, call-center desk, or IoT kiosk.',
        next: 'q_push_pull'
      }
    ]
  },
  q_push_pull: {
    id: 'q_push_pull',
    question: 'Does the client already know who the user is and want to PUSH an approval?',
    subtitle: 'Decide between anonymous Pull (QR/code) vs. authenticated Push (mobile notification).',
    options: [
      {
        label: 'No — Anonymous / Public device (User PULLS auth via code or QR)',
        hint: 'Smart TV, gaming console, printer, or remote SSH CLI.',
        result: {
          flowId: 'device-code',
          title: 'Flow 7: Device Authorization (RFC 8628)',
          badge: 'urn:ietf:params:oauth:grant-type:device_code',
          why: 'Displays a short unambiguous user_code and QR link for the user’s phone while the device polls /token. Restrict via Conditional Access to defeat Device Code Phishing.'
        }
      },
      {
        label: 'Yes — Confidential client PUSHES approval to user’s registered Auth Device',
        hint: 'Bank call-center verification, POS payment SCA, voice/IoT assistant with known login_hint.',
        result: {
          flowId: 'ciba',
          title: 'Flow 8: CIBA (Backchannel Auth)',
          badge: 'urn:openid:params:grant-type:ciba',
          why: 'Triggers a decoupled out-of-band approval prompt on the user’s smartphone with a matching binding_message. Use Ping or Poll mode (avoid Push mode for FAPI).'
        }
      }
    ]
  }
};

export const OAUTH_21_RULES = [
  {
    num: 1,
    title: 'PKCE (S256) Mandatory for ALL Auth Code Clients',
    desc: 'Both Public and Confidential clients must use PKCE (RFC 7636), eliminating authorization code interception and injection across the board.'
  },
  {
    num: 2,
    title: 'Implicit Grant (response_type=token) Removed',
    desc: 'Returning raw access tokens in browser URL fragments (#access_token=...) is formally banned.'
  },
  {
    num: 3,
    title: 'Password Grant (ROPC) Removed',
    desc: 'Collecting raw user passwords directly inside client applications (grant_type=password) is formally banned.'
  },
  {
    num: 4,
    title: 'Exact Redirect URI Matching',
    desc: 'Wildcard (https://*.app.com/*) and prefix matching are prohibited (only exception: ephemeral ports on loopback 127.0.0.1 / [::1] per RFC 8252).'
  },
  {
    num: 5,
    title: 'No Bearer Tokens in URI Query Strings',
    desc: 'Never send ?access_token=... in URLs (leaks in logs, CDNs, Referer headers); always use the Authorization: Bearer header (RFC 6750).'
  },
  {
    num: 6,
    title: 'Protected Refresh Tokens for Public Clients',
    desc: 'Public client refresh tokens MUST be either sender-constrained (mTLS RFC 8705 / DPoP RFC 9449) OR rotated on every use with reuse detection.'
  },
  {
    num: 7,
    title: 'Issuer Identification (RFC 9207)',
    desc: 'Authorization responses carry the iss parameter (RFC 9207 / OAuth 2.1 §4.1.2) so clients talking to multiple login servers defeat Authorization Server Mix-Up attacks.'
  }
];

export const DEPRECATED_FLOWS = [
  {
    name: 'Implicit Grant (RFC 6749 §4.2)',
    wire: 'response_type=token  →  #access_token=...',
    reasons: [
      'Front-Channel Exposure: Access tokens leak immediately into browser history, OS logs, rogue browser extensions, and cross-site Referer headers.',
      'Access Token Injection: No back-channel /token step means no PKCE or client auth—attackers can inject stolen tokens directly into callbacks.',
      'No Refresh Tokens: Forces fragile hidden-iframe silent renewals broken by modern third-party cookie blocking (Safari ITP / Chrome).'
    ],
    replacement: 'Flow 1: Authorization Code + PKCE (ideally behind a Backend-for-Frontend / BFF for SPAs).',
    replacementFlowId: 'auth-code-pkce'
  },
  {
    name: 'Resource Owner Password Credentials / ROPC (RFC 6749 §4.3)',
    wire: 'grant_type=password&username=...&password=...',
    reasons: [
      'Destroys OAuth’s Core Premise: Trains users to hand raw passwords to client apps, expanding credential theft to every client codebase.',
      'Breaks Modern AuthN: Completely incompatible with MFA, Passkeys/WebAuthn, Enterprise SAML/OIDC SSO, and Conditional Access.',
      'Credential-Stuffing Oracle: Turns /token into a high-speed automated password-spraying endpoint—even when kept "only for CI tests".'
    ],
    replacement: 'Flow 1 (interactive users), Flow 2 (M2M), Flow 7/8 (headless/decoupled), or Flow 4/6 (backend delegation).',
    replacementFlowId: 'client-credentials'
  }
];

export const HARDENING_CHECKLIST = [
  {
    domain: '1. Token Storage & Frontend Architecture',
    items: [
      { id: 'c1', label: 'Zero tokens in localStorage / sessionStorage', detail: 'Use Backend-for-Frontend (BFF) with HttpOnly; Secure; SameSite=Lax cookies.' },
      { id: 'c2', label: 'Hardware-backed mobile storage', detail: 'iOS Keychain (AfterFirstUnlockThisDeviceOnly) / Android Keystore + EncryptedSharedPreferences.' },
      { id: 'c3', label: 'Zero token leakage in logs & URLs', detail: 'Never send ?access_token=; scrub Authorization, assertion, code, code_verifier, refresh_token from logs & APM.' }
    ]
  },
  {
    domain: '2. Transport & Sender-Constraining',
    items: [
      { id: 'c4', label: 'TLS 1.3 + HSTS enforced everywhere', detail: 'Reject plaintext HTTP on all AS, RS, and callback endpoints (except RFC 8252 loopback).' },
      { id: 'c5', label: 'Sender-constrained tokens on high-value APIs', detail: 'Bind tokens with mTLS (RFC 8705 cnf.x5t#S256) or DPoP (RFC 9449 cnf.jkt).' },
      { id: 'c6', label: 'Eliminate static client_secrets', detail: 'Migrate confidential clients to private_key_jwt (RFC 7523 §2.2), mTLS, or Cloud Workload Identity Federation.' }
    ]
  },
  {
    domain: '3. Cryptography & JWKS Rotation',
    items: [
      { id: 'c7', label: 'Asymmetric JWT signing only', detail: 'Use ES256, PS256, or RS256 across trust boundaries; explicitly reject alg: "none".' },
      { id: 'c8', label: 'Zero-downtime JWKS rotation caching', detail: 'Cache /.well-known/jwks.json by kid with rate-limited background refresh on unknown kid.' },
      { id: 'c9', label: 'Explicit JWT typing (RFC 8725 §3.11)', detail: 'Validate JOSE typ header (at+jwt, dpop+jwt, JWT) to defeat cross-JWT substitution.' }
    ]
  },
  {
    domain: '4. Lifetimes, Rotation & Revocation',
    items: [
      { id: 'c10', label: 'Short-lived access tokens (5–15 min)', detail: 'Cap interactive access tokens at 5–15 min (up to 60 min max for low-risk internal M2M).' },
      { id: 'c11', label: 'Refresh Token Rotation + Reuse Detection', detail: 'Single-use rotated tokens with automatic token-family revocation + client-side refresh mutex.' },
      { id: 'c12', label: 'Dual session caps (inactivity + absolute)', detail: 'Enforce both sliding inactivity (7–14d) AND hard max session TTL (30–90d) + RFC 7009 revocation.' },
      { id: 'c13', label: 'High-risk immediate revocation check', detail: 'Use fresh step-up auth (max_age=0) or RFC 7662 introspection for irreversible actions.' }
    ]
  },
  {
    domain: '5. Resource Server Validation (Every Request)',
    items: [
      { id: 'c14', label: 'Verify signature against trusted AS JWKS', detail: 'Never trust unverified JWT decode() calls.' },
      { id: 'c15', label: 'Strict exact iss & aud matching', detail: 'Confirm aud matches THIS Resource Server identifier to defeat Confused Deputy replay.' },
      { id: 'c16', label: 'Tight exp & nbf check (≤ 60s clock skew)', detail: 'Reject expired or future-dated tokens immediately.' },
      { id: 'c17', label: 'Differentiate human vs. M2M tokens + scopes', detail: 'Enforce granular scope/RBAC/ABAC and distinguish sub != client_id vs. sub == client_id.' },
      { id: 'c18', label: 'Distributed jti replay cache for assertions', detail: 'Track seen jti values in Redis until exp for jwt-bearer, saml2-bearer, client_assertion, and DPoP.' }
    ]
  },
  {
    domain: '6. Client & Authorization Hardening',
    items: [
      { id: 'c19', label: 'Mandatory PKCE (S256) on 100% of clients', detail: 'Disable code_challenge_method=plain on the Authorization Server.' },
      { id: 'c20', label: 'Exact byte-for-byte redirect_uri matching', detail: 'Zero wildcards, zero path prefixes, zero open redirectors.' },
      { id: 'c21', label: 'CSRF, Replay & Mix-Up validation', detail: 'Validate session-bound state, OIDC nonce, and RFC 9207 iss on every callback.' },
      { id: 'c22', label: 'Restrict high-risk extension flows', detail: 'Block Device Code globally via Conditional Access except allowlisted devices; enforce dynamic binding_message on CIBA.' },
      { id: 'c23', label: 'Disable Implicit & ROPC in ALL tenants', detail: 'Remove response_type=token and grant_type=password everywhere (including CI/CD test accounts—replace with Flow 2 or Flow 4).' }
    ]
  }
];
