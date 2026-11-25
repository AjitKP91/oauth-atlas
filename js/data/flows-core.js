// ==========================================================================
// OAUTH ATLAS — Flows 1 to 4 (Core Active Flows + JWT Bearer)
// ==========================================================================

export const FLOWS_PART_1 = [
  {
    id: 'auth-code-pkce',
    num: 1,
    accent: '#38bdf8',
    group: 'Core Active Flows',
    groupTag: 'core',
    name: 'Authorization Code + PKCE',
    shortName: 'Auth Code + PKCE',
    grantType: 'authorization_code',
    rfc: 'RFC 6749 §4.1 · RFC 7636 · RFC 9207 · OAuth 2.1 §4.1',
    userPresence: 'Interactive (Browser on same device)',
    clientType: 'Public or Confidential',
    tokensIssued: 'Access Token, Refresh Token (if offline_access), ID Token (OIDC)',
    primaryUse: 'Web apps (BFF), SPAs, Native mobile & desktop apps with a user present.',
    art: 'assets/analogy-pkce.jpg',
    artCaption: 'Locked Suitcase + One-Time Hash Padlock (PKCE)',
    atAGlance:
      'The gold-standard interactive login flow where the browser only ever sees a temporary, single-use authorization code, which the app secretly swaps for tokens on the back-channel using a one-time cryptographic proof (PKCE).',
    bridge:
      'Start here: how a human logs into a web or mobile app without ever typing their password into your app.',
    analogy:
      'Imagine dropping off a locked suitcase at a hotel concierge. Before leaving, you invent a secret padlock combination (code_verifier), lock it, and show only a one-way hash of that combination (code_challenge). In the crowded lobby (Front-Channel), you receive a numbered claim slip (code). Later at the private vault window (Back-Channel), you hand over BOTH the claim slip and your secret combination—even if a pickpocket copied your claim slip in the lobby, they cannot open the suitcase without the combination.',
    whenYes: [
      'Server-Side Web Apps & Backend-for-Frontend (BFF) architectures.',
      'Single-Page Applications (SPAs) — ideally paired with a BFF server so tokens never enter browser localStorage.',
      'Native iOS / Android apps (via secure system browser views like ASWebAuthenticationSession / Chrome Custom Tabs) and Desktop / CLI apps (via localhost loopback).'
    ],
    whenNo: [
      'Pure backend daemon/cron jobs with no human user (use Flow 2: Client Credentials).',
      'Browserless devices like Smart TVs or headless SSH CLIs (use Flow 7: Device Authorization).',
      'Microservice-to-microservice propagation for an already-authenticated user (use Flow 6: Token Exchange).'
    ],
    interactiveLab: 'pkce',
    modes: [
      { id: 'normal', label: 'Standard PKCE Flow', type: 'normal' },
      { id: 'attack', label: 'Simulate Code Theft Attack', type: 'attack' }
    ],
    actors: [
      { id: 'u', label: 'User / Browser', sub: 'Front-Channel Agent', icon: 'user', color: '#f59e0b' },
      { id: 'c', label: 'Client App / BFF', sub: 'Public or Confidential', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Auth Server', sub: 'OIDC / OAuth 2.1 AS', icon: 'as', color: '#10b981' },
      { id: 'rs', label: 'Resource Server', sub: 'Protected API', icon: 'rs', color: '#06b6d4' }
    ],
    attackActor: { id: 'att', label: 'Malicious App', sub: 'Intercepts URI Code', icon: 'attacker', color: '#f43f5e' },
    scenarios: {
      normal: [
        {
          from: 'c', to: 'c', channel: 'local',
          short: 'Forge PKCE + Nonce',
          title: 'Step 1 — Client Generates One-Time PKCE Secret, state & nonce',
          beginner: 'Before opening the login page, the app invents a one-time secret combination (code_verifier), turns it into a one-way scrambled fingerprint (code_challenge), and creates two anti-tamper tags: state (protects the return redirect) and nonce (ties the login receipt to this browser session).',
          expert: 'Local generation: code_verifier (43–128 chars MUST per RFC 7636 §4.1; ≥256-bit entropy SHOULD per §7.1) -> code_challenge = BASE64URL(SHA256(ASCII(verifier))), plus session-bound state (CSRF defense) and OIDC nonce (ID Token replay binding).',
          packet: 'SHA256(verifier) -> challenge',
          wire: `# Computed locally inside Client / SDK (never send code_verifier yet!)\ncode_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk\ncode_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))\n               = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM\nstate          = 8b4f9c2e-7a1d-4e3f-9c2a-1d5f8e6b3a09\nnonce          = n-0S6_WzA2Mj`
        },
        {
          from: 'c', to: 'u', channel: 'front',
          short: 'Redirect /authorize',
          title: 'Step 2 — Browser Redirects to Authorization Server (Front-Channel)',
          beginner: 'The app directs your browser to the Authorization Server carrying ONLY the scrambled fingerprint (code_challenge), the permissions it is asking for (scope), state, and nonce—keeping the original secret safely hidden.',
          expert: 'Front-channel GET /oauth2/authorize with response_type=code, exact pre-registered redirect_uri, code_challenge_method=S256, state, and OIDC nonce.',
          packet: 'GET /authorize [challenge, state, nonce]',
          wire: `GET /oauth2/authorize?response_type=code\n  &client_id=web-portal-prod-01\n  &redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Fcallback\n  &scope=openid%20profile%20orders%3Aread%20offline_access\n  &state=8b4f9c2e-7a1d-4e3f-9c2a-1d5f8e6b3a09\n  &nonce=n-0S6_WzA2Mj\n  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM\n  &code_challenge_method=S256 HTTP/1.1\nHost: auth.example.com`
        },
        {
          from: 'u', to: 'as', channel: 'front',
          short: 'Login + MFA + Consent',
          title: 'Step 3 — User Authenticates Directly at Authorization Server',
          beginner: 'Alice signs in (with a Passkey or password + two-factor authentication) directly on the Authorization Server’s own domain—the Client App NEVER sees her password!',
          expert: 'AS verifies user credentials (e.g., pwd + FIDO2 hwk), records explicit consent, and stores (code -> code_challenge, redirect_uri, nonce, user) with a short TTL (RFC 6749 §4.1.2 recommends ≤10 min; harden to ≤60s).',
          packet: 'Passkey / MFA + Consent',
          wire: `# User authenticates strictly on auth.example.com (zero password exposure to Client)\n# AS binds temporary authorization code to:\n{\n  "code": "SplxlOBeZQQYbYS6WxSbIA",\n  "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",\n  "nonce": "n-0S6_WzA2Mj",\n  "ttl_seconds": 60\n}`
        },
        {
          from: 'as', to: 'c', channel: 'front',
          short: '302 Callback ?code=',
          title: 'Step 4 — Front-Channel Callback Returns Short-Lived Claim Ticket (code)',
          beginner: 'The Authorization Server redirects your browser back to the app with a temporary, single-use claim slip (code), the matching state tag, and its issuer ID (iss). Still NO real tokens have touched the browser URL!',
          expert: '302 Found to exact pre-registered redirect_uri carrying single-use code, state (verified against HttpOnly session cookie), and RFC 9207 iss parameter (defeats AS Mix-Up attacks).',
          packet: 'code + state + iss',
          wire: `HTTP/1.1 302 Found\nLocation: https://app.example.com/auth/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=8b4f9c2e-7a1d-4e3f-9c2a-1d5f8e6b3a09&iss=https%3A%2F%2Fauth.example.com\nCache-Control: no-store`
        },
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token + verifier',
          title: 'Step 5 — Back-Channel Swap: Claim Slip + Original PKCE Secret',
          beginner: 'Behind closed doors over an encrypted server-to-server call, the app presents BOTH the claim slip (code) AND the original secret combination (code_verifier) to prove it is the exact same app that started Step 1.',
          expert: 'Back-channel POST /oauth2/token with grant_type=authorization_code, code, exact redirect_uri, and code_verifier. Confidential clients (BFF / backend) authenticate via Basic or private_key_jwt; public clients omit Authorization and send client_id. AS verifies BASE64URL(SHA256(code_verifier)) === stored code_challenge.',
          packet: 'code + code_verifier [TLS]',
          wire: `# Confidential Client / BFF authenticates below (Public clients omit Authorization and pass client_id in body)\nPOST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic d2ViLXBvcnRhbC1wcm9kLTAxOnMzY3IzdF9wcm9kX3ZhbHVl\n\ngrant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Fcallback&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK Tokens Issued',
          title: 'Step 6 — AS Verifies Hash & Issues Access, Refresh & ID Tokens',
          beginner: 'The secret combination matches the original fingerprint! The Authorization Server destroys the one-time code and returns the Access Token (API keycard), Refresh Token (renewal voucher), and ID Token (identity passport with matching nonce).',
          expert: 'AS marks code as consumed (single-use per RFC 6749 §4.1.2) and returns RFC 9068 access_token (typ: at+jwt), refresh_token, and OIDC id_token (with matching nonce and RFC 8176 amr: ["pwd","hwk","mfa"]).',
          packet: 'access_token + id_token + RT',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json;charset=UTF-8\nCache-Control: no-store\nPragma: no-cache\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6ImFzLWtleS0yMDI2LTAxIn0.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c3JfOWY4MmExIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJjbGllbnRfaWQiOiJ3ZWItcG9ydGFsLXByb2QtMDEiLCJzY29wZSI6Im9yZGVyczpyZWFkIiwiaWF0IjoxNzk1MDY5MjAwLCJleHAiOjE3OTUwNzAxMDAsImp0aSI6ImF0LWY4ZTdkNmM1In0.SIGNATURE",\n  "token_type": "Bearer",\n  "expires_in": 900,\n  "refresh_token": "rt_v2_9d4e7f1a8b2c6e0d3f5a9b1c4e7d2a8f",\n  "scope": "openid profile orders:read offline_access",\n  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFzLWtleS0yMDI2LTAxIn0.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c3JfOWY4MmExIiwiYXVkIjoid2ViLXBvcnRhbC1wcm9kLTAxIiwiZXhwIjoxNzk1MDcyODAwLCJpYXQiOjE3OTUwNjkyMDAsImF1dGhfdGltZSI6MTc5NTA2OTE5NSwibm9uY2UiOiJuLTBTNl9XekEyTWoiLCJhbXIiOlsicHdkIiwiaHdrIiwibWZhIl0sImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20ifQ.SIGNATURE"\n}`
        },
        {
          from: 'c', to: 'rs', channel: 'back',
          short: 'API Call w/ Bearer',
          title: 'Step 7 — Client (or BFF) Calls Protected API with Access Token',
          beginner: 'The app attaches the short-lived Access Token in the Authorization header. The API checks the token’s digital signature using the Authorization Server’s public keys, confirms it is meant for this API and unexpired, and returns Alice’s orders.',
          expert: 'RS verifies JWT signature via cached JWKS (kid), checks exact iss, exact aud === https://api.example.com, exp, and scope orders:read.',
          packet: 'Authorization: Bearer AT',
          wire: `GET /v1/orders HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIs...`
        }
      ],
      attack: [
        {
          from: 'c', to: 'as', channel: 'front',
          short: 'Legit Auth + PKCE',
          title: 'Attack Step 1 — Legitimate App Starts Login with PKCE Hash',
          beginner: 'The honest mobile app sends code_challenge (the SHA-256 hash) to the Authorization Server while keeping code_verifier locked in memory.',
          expert: 'Public native client initiates /authorize with code_challenge=E9Melhoa... and method=S256.',
          packet: 'code_challenge [S256]',
          wire: `GET /oauth2/authorize?response_type=code&client_id=mobile-app&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256 HTTP/1.1`
        },
        {
          from: 'as', to: 'att', channel: 'attack',
          short: 'INTERCEPTED CODE!',
          title: 'Attack Step 2 — Rogue App Hijacks Custom URI Scheme & Steals code!',
          beginner: 'On the user’s device, a malicious app registered the same custom URI scheme (myapp://callback) and intercepts the Authorization Code in mid-air!',
          expert: 'Front-channel Authorization Code Interception (RFC 7636 threat model). Attacker now possesses code=SplxlOBeZQQYbYS6WxSbIA AND knows public client_id.',
          packet: 'STOLEN code=SplxlOBe...',
          wire: `# Malicious app intercepts OS deep-link redirect:\nmyapp://callback?code=SplxlOBeZQQYbYS6WxSbIA&state=8b4f9c2e...`
        },
        {
          from: 'att', to: 'as', channel: 'attack',
          short: 'Attacker Redeems Code',
          title: 'Attack Step 3 — Attacker Races to POST /token Without code_verifier',
          beginner: 'The thief tries to cash in the stolen claim slip at the vault window—guessing a fake combination because SHA-256 cannot be reversed!',
          expert: 'Attacker submits stolen code with a forged or missing code_verifier to /oauth2/token.',
          packet: 'Stolen code + FAKE verifier',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code&client_id=mobile-app&code=SplxlOBeZQQYbYS6WxSbIA&code_verifier=ATTACKER_WRONG_GUESS_12345678901234567890`
        },
        {
          from: 'as', to: 'att', channel: 'attack',
          shockwave: 'as',
          short: 'PKCE SHIELD BLOCKS!',
          title: 'Attack Step 4 — SHA-256 Mismatch! Authorization Server Shatters Attack',
          beginner: 'SHA-256(attacker_guess) does NOT match the stored padlock hash! The server rejects the thief and destroys the code immediately.',
          expert: 'AS computes BASE64URL(SHA256(verifier)) !== E9Melhoa..., returns HTTP 400 invalid_grant, and invalidates the single-use code.',
          packet: '400 invalid_grant [BLOCKED]',
          wire: `HTTP/1.1 400 Bad Request\nContent-Type: application/json\nCache-Control: no-store\n\n{\n  "error": "invalid_grant",\n  "error_description": "PKCE code_verifier verification failed."\n}`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'Access Token (at+jwt)',
        header: { alg: 'RS256', typ: 'at+jwt', kid: 'as-key-2026-01' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'usr_9f82a1',
          aud: 'https://api.example.com',
          client_id: 'web-portal-prod-01',
          scope: 'orders:read',
          iat: 1795069200,
          exp: 1795070100,
          jti: 'at-f8e7d6c5'
        }
      },
      {
        label: 'OIDC ID Token',
        header: { alg: 'RS256', typ: 'JWT', kid: 'as-key-2026-01' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'usr_9f82a1',
          aud: 'web-portal-prod-01',
          exp: 1795072800,
          iat: 1795069200,
          auth_time: 1795069195,
          nonce: 'n-0S6_WzA2Mj',
          amr: ['pwd', 'hwk', 'mfa'],
          email: 'alice@example.com'
        }
      }
    ],
    threats: [
      {
        name: 'Authorization Code Interception',
        mechanism: 'Rogue mobile app registers the same custom URI scheme (myapp://callback) or browser extension reads callback URL.',
        mitigation: 'Mandatory PKCE (S256) binds /authorize to /token cryptographically—stolen codes are worthless without code_verifier.'
      },
      {
        name: 'Login CSRF / Code Injection',
        mechanism: 'Attacker completes login as themselves and tricks victim’s browser into visiting /callback?code=ATTACKER_CODE.',
        mitigation: 'Bind cryptographically random state AND code_verifier to an HttpOnly; Secure; SameSite=Lax browser session cookie.'
      },
      {
        name: 'Authorization Server Mix-Up Attack',
        mechanism: 'Multi-IdP client is tricked into sending honest AS-A’s code to an attacker-controlled AS-B /token endpoint.',
        mitigation: 'Validate RFC 9207 iss query parameter on every callback or register distinct per-AS redirect_uri paths.'
      }
    ],
    pitfalls: [
      {
        name: 'Storing Tokens in Browser localStorage (Use BFF Instead!)',
        detail: 'Any single XSS vulnerability steals every token in localStorage instantly. Put a thin Backend-for-Frontend (BFF) proxy in front of your SPA so tokens stay server-side behind an HttpOnly; Secure; SameSite=Lax cookie.'
      },
      {
        name: 'Allowing code_challenge_method=plain',
        detail: 'Completely defeats PKCE against passive front-channel observers; explicitly disable plain on your Authorization Server.'
      },
      {
        name: 'Not Enforcing Short-Lived Single-Use Codes',
        detail: 'RFC 6749 §4.1.2 mandates short expiry (recommends ≤10 min; harden to ≤60s) and single use; if reused, AS MUST reject and SHOULD revoke all tokens previously issued from that code.'
      }
    ]
  },

  {
    id: 'client-credentials',
    num: 2,
    accent: '#f59e0b',
    group: 'Core Active Flows',
    groupTag: 'core',
    name: 'Client Credentials',
    shortName: 'Client Credentials',
    grantType: 'client_credentials',
    rfc: 'RFC 6749 §4.4 · OAuth 2.1 §4.2 · RFC 7523 §2.2 · RFC 8705',
    userPresence: 'None (Pure Machine-to-Machine)',
    clientType: 'Confidential only',
    tokensIssued: 'Access Token (SHOULD NOT issue Refresh Token; no ID Token)',
    primaryUse: 'Daemon jobs, cron workers, microservices calling APIs under their own service identity.',
    art: 'assets/hero-observatory.jpg',
    artCaption: 'Armored Server-to-Server Vault Handshake',
    atAGlance:
      'A direct back-channel handshake where a backend application proves its own identity to the Authorization Server to get an API token—with zero human user involved.',
    bridge:
      'Flow 1 worked because a person clicked Allow in a browser. What if there is NO human at all—just a nightly backend service calling an API?',
    analogy:
      'An armored courier picking up cash directly from a bank vault. The courier does not represent an individual customer; they present their verified corporate credentials at the loading dock and receive scoped vault access.',
    whenYes: [
      'Nightly ETL jobs, background queue workers, or CI/CD pipelines.',
      'Microservice A calling Microservice B purely on behalf of the system itself (e.g., inventory sync).'
    ],
    whenNo: [
      'NEVER in Public Clients (SPAs, mobile, desktop apps)—embedding a client_secret exposes admin credentials to every user.',
      'NEVER as a "God-Mode Service Account" shortcut when you actually need user-level authorization & audit trails (use Flow 1 or Flow 6).'
    ],
    interactiveLab: 'cache-sim',
    modes: [
      { id: 'private_key_jwt', label: 'private_key_jwt (Recommended)', type: 'normal' },
      { id: 'basic', label: 'Static Secret (Basic Auth)', type: 'alt' }
    ],
    actors: [
      { id: 'c', label: 'Backend Worker', sub: 'Confidential Client', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Auth Server', sub: 'Token Endpoint', icon: 'as', color: '#10b981' },
      { id: 'rs', label: 'Inventory API', sub: 'Resource Server', icon: 'rs', color: '#06b6d4' }
    ],
    scenarios: {
      private_key_jwt: [
        {
          from: 'c', to: 'c', channel: 'local',
          short: 'Sign client_assertion',
          title: 'Step 1 — Check Token Cache & Sign Short-Lived client_assertion (RFC 7523 §2.2)',
          beginner: 'First, the backend worker checks if it already has an unexpired token in memory. When it needs a fresh one, instead of sending a reusable password across the network, it signs a 60-second digital note with its private key to prove its identity.',
          expert: 'On cache miss (or ~80% TTL proactive refresh via singleflight lock), client signs ES256 client_assertion JWT (iss=sub=client_id, aud=AS /token, exp=+60s, unique jti).',
          packet: 'ES256 client_assertion',
          wire: `# Signed locally with worker's private key (private key NEVER leaves server)\nHeader:  {"alg": "ES256", "typ": "client-auth+jwt", "kid": "order-sync-key-2026"}\nPayload: {"iss": "order-sync-worker", "sub": "order-sync-worker", "aud": "https://auth.example.com/oauth2/token", "iat": 1795069200, "exp": 1795069260, "jti": "ca-91d2a3b4-7f8c"}`
        },
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token [7523 §2.2]',
          title: 'Step 2 — Pure Back-Channel Token Request (No User, No Browser)',
          beginner: 'The worker calls the Authorization Server directly over an encrypted server-to-server connection—no browser, no human—attaching its signed 60-second note and asking for Inventory API access.',
          expert: 'grant_type=client_credentials with RFC 8707 resource indicator and RFC 7523 §2.2 client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer.',
          packet: 'client_credentials + assertion',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials\n&scope=inventory%3Awrite\n&resource=https%3A%2F%2Finventory.internal.example.com\n&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer\n&client_assertion=eyJhbGciOiJFUzI1NiIsInR5cCI6ImNsaWVudC1hdXRoK2p3dCIsImtpZCI6Im9yZGVyLXN5bmMta2V5LTIwMjYifQ.PAYLOAD.SIG`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK (No Refresh)',
          title: 'Step 3 — AS Verifies Key Signature & Returns Scoped Access Token',
          beginner: 'The Authorization Server verifies the signature using the worker’s pre-registered public key and returns a 1-hour Access Token. No Refresh Token is needed—when it nears expiry, the worker simply signs a fresh request.',
          expert: 'Per RFC 6749 §4.4.3 (and OAuth 2.1 §4.2.2), a refresh token SHOULD NOT be included. Client caches access_token until ~80% TTL (or exp - 60s).',
          packet: 'access_token (No RT!)',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json;charset=UTF-8\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6ImFzLWtleS0yMDI2LTAxIn0.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJvcmRlci1zeW5jLXdvcmtlciIsImF1ZCI6Imh0dHBzOi8vaW52ZW50b3J5LmludGVybmFsLmV4YW1wbGUuY29tIiwiY2xpZW50X2lkIjoib3JkZXItc3luYy13b3JrZXIiLCJzY29wZSI6ImludmVudG9yeTp3cml0ZSIsImlhdCI6MTc5NTA2OTIwMCwiZXhwIjoxNzk1MDcyODAwLCJqdGkiOiJhdC1jYzAxOTJhMyJ9.SIGNATURE",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "inventory:write"\n}`
        },
        {
          from: 'c', to: 'rs', channel: 'back',
          short: 'Call Inventory API',
          title: 'Step 4 — Worker Reuses Cached Token Across Thousands of API Calls',
          beginner: 'The worker reuses that cached token across thousands of API calls. The Inventory API verifies the signature and sees the token represents the service itself rather than a human user, with inventory:write permission.',
          expert: 'RS verifies JWKS signature, exact aud, exp, scope, and recognizes M2M workload context via sub === client_id (RFC 9068 §2.2).',
          packet: 'Bearer AT [Cached]',
          wire: `POST /v1/inventory/reserve HTTP/1.1\nHost: inventory.internal.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIs...\n\n{"sku":"WIDGET-900","qty":12}`
        }
      ],
      basic: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token [Basic]',
          title: 'Static Secret Request (client_secret_basic)',
          beginner: 'Sends Base64(client_id:client_secret) in the Authorization header. Simpler to set up, but carries higher leak risk than private_key_jwt or mTLS.',
          expert: 'RFC 6749 §2.3.1 quirk: client_id and client_secret MUST be application/x-www-form-urlencoded BEFORE joining with ":" and Base64-encoding!',
          packet: 'Authorization: Basic ...',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic b3JkZXItc3luYy13b3JrZXI6dG9wX3MzY3IzdF9rM3k=\n\ngrant_type=client_credentials&scope=inventory%3Awrite&resource=https%3A%2F%2Finventory.internal.example.com`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK Access Token',
          title: 'Access Token Issued (Cache in Memory / Redis)',
          beginner: 'Same scoped Access Token returned—no refresh token needed. Store client_secret strictly in Vault/KMS with automated dual-key rotation.',
          expert: 'HTTP 200 OK with expires_in=3600; no refresh_token per RFC 6749 §4.4.3.',
          packet: 'access_token [3600s]',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIs...",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "inventory:write"\n}`
        },
        {
          from: 'c', to: 'rs', channel: 'back',
          short: 'Call Inventory API',
          title: 'Invoke Protected API with Cached Bearer Token',
          beginner: 'Reuse the cached token until ~80% of its lifetime elapses, then refresh once behind a mutex lock.',
          expert: 'Pair with mTLS (RFC 8705) for sender-constrained tokens so leaked bearer tokens cannot be replayed externally.',
          packet: 'Bearer AT',
          wire: `POST /v1/inventory/reserve HTTP/1.1\nHost: inventory.internal.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIs...`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'M2M Access Token',
        header: { alg: 'RS256', typ: 'at+jwt', kid: 'as-key-2026-01' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'order-sync-worker',
          aud: 'https://inventory.internal.example.com',
          client_id: 'order-sync-worker',
          scope: 'inventory:write',
          iat: 1795069200,
          exp: 1795072800,
          jti: 'at-cc0192a3'
        }
      },
      {
        label: 'client_assertion (RFC 7523 §2.2)',
        header: { alg: 'ES256', typ: 'client-auth+jwt', kid: 'order-sync-key-2026' },
        payload: {
          iss: 'order-sync-worker',
          sub: 'order-sync-worker',
          aud: 'https://auth.example.com/oauth2/token',
          iat: 1795069200,
          exp: 1795069260,
          jti: 'ca-91d2a3b4-7f8c'
        }
      }
    ],
    threats: [
      {
        name: 'Static Client Secret Exfiltration',
        mechanism: 'Secret committed to Git, dumped in CI logs, or leaked in container env vars enables silent external API access.',
        mitigation: 'Replace static secrets with private_key_jwt, mTLS (RFC 8705), or Workload Identity Federation.'
      },
      {
        name: 'Over-Privileged "God-Mode" Service Account',
        mechanism: 'One shared client_id holds broad scopes across 20 APIs; compromising one worker compromises the entire platform.',
        mitigation: 'Provision 1 dedicated client_id per workload with narrow scopes and strict RFC 8707 resource/aud binding.'
      },
      {
        name: 'Stolen Bearer Token Replay',
        mechanism: 'Attacker grabs an active M2M bearer token from logs/traces and replays it from an untrusted network.',
        mitigation: 'Use sender-constrained mTLS (cnf.x5t#S256) or DPoP (cnf.jkt) tokens + 5–15 min lifetimes.'
      }
    ],
    pitfalls: [
      {
        name: 'Fetching a New Token on Every Outbound API Call',
        detail: 'Turns your Authorization Server into a bottleneck and triggers 429 rate-limit outages. Cache tokens in memory/Redis and refresh proactively at ~80% TTL behind a singleflight lock.'
      },
      {
        name: 'User Spoofing via Unsigned Headers (X-User-Id: alice)',
        detail: 'Never call an API with client_credentials and pass user identity in a plain header—any compromised service can impersonate the CEO. Use Flow 6 (Token Exchange).'
      },
      {
        name: 'Confusing sub == client_id at Resource Servers',
        detail: 'In RFC 9068, M2M tokens set sub equal to client_id. Make sure your API explicitly distinguishes human user tokens from M2M workload tokens.'
      }
    ]
  },

  {
    id: 'refresh-token',
    num: 3,
    accent: '#10b981',
    group: 'Core Active Flows',
    groupTag: 'core',
    name: 'Refresh Token (+ Rotation & Reuse Detection)',
    shortName: 'Refresh Token',
    grantType: 'refresh_token',
    rfc: 'RFC 6749 §6 · RFC 9700 §4.14 · OAuth 2.1 §4.3 · RFC 9449',
    userPresence: 'Offline (User consented earlier)',
    clientType: 'Public (with RTR/DPoP) or Confidential',
    tokensIssued: 'New Access Token, Rotated Refresh Token, optional ID Token',
    primaryUse: 'Silently renewing expired short-lived access tokens without forcing re-login.',
    art: 'assets/analogy-refresh.jpg',
    artCaption: 'Self-Shredding Front-Desk Security Voucher',
    atAGlance:
      'A silent renewal flow that swaps a Refresh Token for a fresh short-lived Access Token—hardened in OAuth 2.1 with single-use Rotation and automatic Reuse Detection.',
    bridge:
      'Short-lived Access Tokens expire in 15 minutes for safety. How does an app renew them silently without kicking the user back to login?',
    analogy:
      'Your Access Token is a 15-minute visitor badge; your Refresh Token is a front-desk renewal voucher. With Rotation, every renewal shreds Voucher #1 and hands you Voucher #2. If a thief copied Voucher #1 and tries to redeem it later, security sees a shredded voucher being replayed, sounds the Reuse Detection alarm, and immediately locks out BOTH Voucher #1 and Voucher #2!',
    whenYes: [
      'Keeping users smoothly logged in across 5–15 minute Access Token expirations.',
      'Offline background syncs (mobile mail, calendar sync) after initial user consent in Flow 1 or Flow 7.'
    ],
    whenNo: [
      'Machine-to-machine client_credentials flows (never needed).',
      'High-assurance step-up actions (wire transfers, account deletion)—force fresh interactive MFA (prompt=login / max_age=0).'
    ],
    interactiveLab: 'rtr-vault',
    modes: [
      { id: 'normal', label: 'Normal Rotation (+ DPoP)', type: 'normal' },
      { id: 'attack', label: 'Simulate Stolen RT Reuse Attack', type: 'attack' }
    ],
    actors: [
      { id: 'c', label: 'Legitimate Client', sub: 'Holds RT_gen1 -> gen2', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Auth Server', sub: 'Token Family F-42 Store', icon: 'as', color: '#10b981' },
      { id: 'rs', label: 'Resource Server', sub: 'Protected API', icon: 'rs', color: '#06b6d4' }
    ],
    attackActor: { id: 'att', label: 'Attacker', sub: 'Stole RT_gen1 Earlier', icon: 'attacker', color: '#f43f5e' },
    scenarios: {
      normal: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token [RT_gen1]',
          title: 'Step 1 — Access Token Expired; Client Sends RT_gen1 (+ Optional DPoP)',
          beginner: 'The 15-minute Access Token expired. Silently in the background, the app hands in Voucher #1 (RT_gen1) for a fresh token—and if sender-constraining (DPoP) is enabled, signs a proof showing this request comes from the exact same device.',
          expert: 'Back-channel POST /oauth2/token with grant_type=refresh_token, RT_gen1, and optional downscoped scope (must be subset of original consent). Shown here with optional RFC 9449 DPoP proof header binding tokens to the client’s keypair.',
          packet: 'RT_gen1 + DPoP Proof',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic d2ViLXBvcnRhbC1wcm9kLTAxOnMzY3IzdF9wcm9kX3ZhbHVl\nDPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...}}.PAYLOAD.SIG\n\ngrant_type=refresh_token&refresh_token=rt_v2_9d4e7f1a8b2c6e0d3f5a9b1c4e7d2a8f&scope=orders%3Aread`
        },
        {
          from: 'as', to: 'as', channel: 'local',
          short: 'Rotate Family F-42',
          title: 'Step 2 — AS Retires RT_gen1 (Keeps Hash!) & Mints RT_gen2',
          beginner: 'The security desk marks Voucher #1 as USED—keeping its serial number on file so any future copy is caught immediately!—and mints brand-new Voucher #2 (RT_gen2).',
          expert: 'AS verifies RT_gen1 is ACTIVE in Token Family F-42, transitions RT_gen1 -> USED, and issues RT_gen2 (ACTIVE) linked to the same family + original absolute session expiry.',
          packet: 'RT_gen1=USED -> RT_gen2=ACTIVE',
          wire: `# Token Family Store (Family F-42):\n{\n  "family_id": "F-42",\n  "client_id": "web-portal-prod-01",\n  "absolute_exp": "2026-12-20T00:00:00Z",\n  "tokens": [\n    {"id": "RT_gen1", "status": "USED (WATCH FOR REPLAY)"},\n    {"id": "RT_gen2", "status": "ACTIVE"}\n  ]\n}`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK [New AT + RT_gen2]',
          title: 'Step 3 — Client Atomically Saves RT_gen2 & Calls API with Fresh Token',
          beginner: 'The app immediately overwrites Voucher #1 with Voucher #2 in secure storage and resumes API calls with the new Access Token—Alice never sees a login popup.',
          expert: 'Response returns new DPoP-bound access_token (cnf.jkt) and rotated refresh_token RT_gen2. Client must persist rotated RT atomically before discarding the response.',
          packet: 'DPoP AT + RT_gen2',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json;charset=UTF-8\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9.DPOP_BOUND_PAYLOAD.SIG",\n  "token_type": "DPoP",\n  "expires_in": 900,\n  "refresh_token": "rt_v2_7c1a5e9f3b0d4a8e2c6f1b5d9a3e7c0b",\n  "scope": "orders:read"\n}`
        }
      ],
      attack: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'Honest Rotation -> gen2',
          title: 'Attack Step 1 — Honest User Rotates RT_gen1 into RT_gen2',
          beginner: 'Unbeknownst to Alice, a thief copied RT_gen1 earlier. Meanwhile Alice’s real app legitimately refreshes and rotates to RT_gen2 (shredding RT_gen1).',
          expert: 'RT_gen1 transitions to USED; RT_gen2 becomes the sole ACTIVE token in Family F-42.',
          packet: 'RT_gen1 -> RT_gen2',
          wire: `# Legitimate client already rotated:\n# RT_gen1 = USED (retained in Family F-42 audit log)\n# RT_gen2 = ACTIVE`
        },
        {
          from: 'att', to: 'as', channel: 'attack',
          short: 'REPLAYS STOLEN RT_gen1!',
          title: 'Attack Step 2 — Attacker Attempts to Spend Stolen RT_gen1!',
          beginner: 'Hours later, the thief walks up to the token endpoint trying to cash in the copied RT_gen1.',
          expert: 'Attacker submits superseded RT_gen1 to POST /oauth2/token.',
          packet: 'REPLAYED RT_gen1',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=refresh_token&refresh_token=rt_v2_9d4e7f1a8b2c6e0d3f5a9b1c4e7d2a8f`
        },
        {
          from: 'as', to: 'att', channel: 'attack',
          shockwave: 'as',
          short: 'REUSE ALARM -> REVOKE ALL!',
          title: 'Attack Step 3 — REUSE DETECTED! Entire Token Family F-42 Revoked!',
          beginner: 'ALARM! Security sees a shredded voucher (RT_gen1) being replayed. It immediately rejects the thief AND revokes RT_gen2 too—stopping the compromise cold!',
          expert: 'RFC 9700 §4.14.2 Automatic Reuse Detection triggers immediate revocation of Family F-42 (all descendant tokens) and returns HTTP 400 invalid_grant.',
          packet: '400 invalid_grant [FAMILY KILLED]',
          wire: `HTTP/1.1 400 Bad Request\nContent-Type: application/json\nCache-Control: no-store\n\n{\n  "error": "invalid_grant",\n  "error_description": "Refresh token reuse detected. Token family F-42 has been revoked."\n}`
        },
        {
          from: 'c', to: 'as', channel: 'attack',
          short: 'RT_gen2 Invalidated',
          title: 'Attack Step 4 — Honest Client Prompted for Clean Re-Authentication',
          beginner: 'Next time Alice’s app tries RT_gen2, it gets a clean logout signal so she re-authenticates safely with MFA—completely evicting the attacker.',
          expert: 'Client receives invalid_grant, purges local session state, and initiates fresh Flow 1 Auth Code + PKCE login.',
          packet: 'Force Safe Re-Login',
          wire: `HTTP/1.1 400 Bad Request\n\n{"error": "invalid_grant", "error_description": "Session revoked due to security event."}`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'DPoP-Bound Access Token',
        header: { alg: 'RS256', typ: 'at+jwt', kid: 'as-key-2026-01' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'usr_9f82a1',
          aud: 'https://api.example.com',
          scope: 'orders:read',
          cnf: { jkt: '0bzgTYCjJOd_Dwqnp-34x9aL8tBZxwiFS8a' },
          iat: 1795070100,
          exp: 1795071000
        }
      },
      {
        label: 'DPoP Proof JWT (RFC 9449)',
        header: { typ: 'dpop+jwt', alg: 'ES256', jwk: { kty: 'EC', crv: 'P-256' } },
        payload: {
          jti: 'dpop-4a91f0e2-8b3c',
          htm: 'POST',
          htu: 'https://auth.example.com/oauth2/token',
          iat: 1795070100
        }
      }
    ],
    threats: [
      {
        name: 'Long-Lived Silent Persistence Theft',
        mechanism: 'A static stolen refresh token lets an attacker mint fresh access tokens silently for months.',
        mitigation: 'OAuth 2.1 mandate: Sender-Constrain refresh tokens (DPoP/mTLS) OR enforce Refresh Token Rotation + Reuse Detection.'
      },
      {
        name: 'Scope Escalation During Refresh',
        mechanism: 'Compromised client asks for admin:write on refresh when original user consent was read-only.',
        mitigation: 'AS MUST strictly verify requested_scope ⊆ originally_granted_scope (RFC 6749 §6).'
      },
      {
        name: 'Immortal Sliding Sessions',
        mechanism: 'Sliding 30-day inactivity timeout resets on every refresh forever—even after employee offboarding.',
        mitigation: 'Enforce BOTH inactivity timeout (7–14d) AND hard absolute session lifetime (30–90d) + revocation hooks.'
      }
    ],
    pitfalls: [
      {
        name: 'The Parallel-Refresh Race Condition (#1 Rotation Outage!)',
        detail: 'Three browser tabs hit 401 simultaneously and send RT_gen1 in parallel—Tab #2 trips Reuse Detection and nukes the user’s session! Fix: coordinate refreshes via Web Locks API (navigator.locks) + BroadcastChannel or server-side mutex.'
      },
      {
        name: 'Dropped Network Response Mid-Rotation',
        detail: 'AS commits RT_gen2, but mobile network drops before the phone receives it. Persist rotated refresh tokens atomically and handle invalid_grant gracefully.'
      },
      {
        name: 'Blindly Overwriting Refresh Token When Omitted',
        detail: 'Some AS configs only return refresh_token when rotating—always check if (resp.refresh_token) before updating storage.'
      }
    ]
  },

  {
    id: 'jwt-bearer',
    num: 4,
    accent: '#a855f7',
    group: 'Enterprise & Microservice Propagation',
    groupTag: 'ext',
    name: 'JWT Bearer Assertion',
    shortName: 'JWT Bearer',
    grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    rfc: 'RFC 7523 §2.1 · RFC 7521 · rfc7523bis',
    userPresence: 'Indirect / Pre-authorized (or Service Account)',
    clientType: 'Confidential only (holds signing key or trusted JWT)',
    tokensIssued: 'Access Token (typically no Refresh Token)',
    primaryUse: 'Server-to-server asymmetric trust, pre-authorized user impersonation (Salesforce, GCP), IdP JWT federation.',
    art: 'assets/analogy-exchange.jpg',
    artCaption: 'Notarized Cryptographic Power of Attorney',
    atAGlance:
      'A purely server-to-server flow where a trusted backend presents a signed JWT assertion—signed either with its own pre-registered private key or issued by a trusted Identity Provider—and immediately receives an Access Token with zero browser redirects.',
    bridge:
      'Now step into enterprise backends: skip the browser login screen entirely using a pre-trusted, cryptographically signed notarized letter.',
    analogy:
      'Walking into a bank with a notarized Power of Attorney letter stamped with a verifiable wax seal. Because the bank already trusts the notary’s official seal (pre-registered public key / JWKS), the teller verifies it and releases funds for the named account holder (sub) without them standing next to you.',
    whenYes: [
      'Admin pre-authorized backend integrations using asymmetric keys (Salesforce JWT Bearer, Google Cloud Service Account 2-legged OAuth, Google Workspace Domain-Wide Delegation).',
      'Exchanging a trusted Identity Provider’s signed JWT for a downstream Access Token (e.g., SAP BTP OAuth2JWTBearer).'
    ],
    whenNo: [
      'Interactive user logins where dynamic consent or MFA is needed (use Flow 1).',
      'Public Clients (cannot protect private signing keys).',
      'Multi-hop microservice delegation needing nested act chains (use Flow 6: Token Exchange).'
    ],
    interactiveLab: 'jti-replay',
    modes: [
      { id: 'normal', label: 'RFC 7523 §2.1 Grant', type: 'normal' },
      { id: 'attack', label: 'Simulate Assertion Replay (jti)', type: 'attack' }
    ],
    actors: [
      { id: 'idp', label: 'Key Holder / IdP', sub: 'Holds Private RSA/EC Key', icon: 'vault', color: '#a855f7' },
      { id: 'c', label: 'Backend Client', sub: 'Confidential Service', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Auth Server', sub: 'Trusted JWKS + jti Cache', icon: 'as', color: '#10b981' },
      { id: 'rs', label: 'Partner API', sub: 'Resource Server', icon: 'rs', color: '#06b6d4' }
    ],
    attackActor: { id: 'att', label: 'Replay Attacker', sub: 'Intercepted Signed JWT', icon: 'attacker', color: '#f43f5e' },
    scenarios: {
      normal: [
        {
          from: 'idp', to: 'c', channel: 'local',
          short: 'Sign JWT Assertion',
          title: 'Step 1 — Mint & Sign Short-Lived JWT Assertion (≤180s + Unique jti)',
          beginner: 'Either a trusted Identity Provider or the backend service itself writes a short-lived notarized letter naming who signed it (iss), who it represents (sub), which Authorization Server it is meant for (aud), a 3-minute expiry (exp), and a one-time barcode (jti)—then seals it with a private key.',
          expert: 'RFC 7523 §2.1 supports both self-signed client assertions (Salesforce Connected Apps, Google 2LO) and external IdP JWTs (SAP OAuth2JWTBearer). Mandatory §3 claims: iss, sub, aud (exact AS token/issuer URI), exp; harden with unique jti and explicit typ (rfc7523bis).',
          packet: 'Signed JWT Assertion',
          wire: `Header:  {"alg": "RS256", "typ": "JWT", "kid": "svc-billing-key-2026-04"}\nPayload: {\n  "iss": "3MVG9_billing_connected_app_client_id",\n  "sub": "alice.chen@corp.example.com",\n  "aud": "https://auth.partner.example.com/oauth2/token",\n  "iat": 1795069200,\n  "nbf": 1795069195,\n  "exp": 1795069380,\n  "jti": "jwtb-7f4e91c0-3b2a-4d1e-8c6a-9f0e2d1b4a3c",\n  "scope": "invoices:read invoices:write"\n}`
        },
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token [jwt-bearer]',
          title: 'Step 2 — Back-Channel Assertion Grant Request (RFC 7523 §2.1)',
          beginner: 'The backend sends the sealed JWT directly to the Authorization Server as the authorization proof itself.',
          expert: 'Notice §2.1 uses grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer + assertion=<JWT> (distinct from §2.2 client_assertion used solely for client authentication!).',
          packet: 'grant_type=jwt-bearer',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.partner.example.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN2Yy1iaWxsaW5nLWtleS0yMDI2LTA0In0.PAYLOAD.SIG&scope=invoices%3Aread`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK Access Token',
          title: 'Step 3 — AS Validates Signature, aud, Pre-Auth & jti Cache -> Issues Token',
          beginner: 'The server verifies the wax seal via its pre-registered public key, checks that the barcode (jti) has never been used, confirms Alice is pre-authorized, and hands back an Access Token.',
          expert: 'AS records jti in distributed Redis cache until exp + clock skew, validates exact aud and pre-authorized subject allowlist, and returns access_token.',
          packet: 'access_token [1800s]',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json;charset=UTF-8\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9.ALICE_PARTNER_AT.SIG",\n  "token_type": "Bearer",\n  "expires_in": 1800,\n  "scope": "invoices:read"\n}`
        },
        {
          from: 'c', to: 'rs', channel: 'back',
          short: 'GET /v1/accounts',
          title: 'Step 4 — Call Partner API Under Authorized Identity',
          beginner: 'The backend queries the Partner API cleanly using the freshly minted Access Token.',
          expert: 'RS enforces aud, iss, exp, and scope=invoices:read.',
          packet: 'Bearer AT',
          wire: `GET /v1/accounts HTTP/1.1\nHost: api.partner.example.com\nAuthorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6ImF0K2p3dCJ9.ALICE_PARTNER_AT.SIG`
        }
      ],
      attack: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: '1st Use (jti Stored)',
          title: 'Replay Step 1 — Legitimate Client Uses Assertion Once',
          beginner: 'The honest service redeems assertion barcode jti=jwtb-7f4e91c0... and receives its token. Redis caches that barcode for 3 minutes.',
          expert: 'AS validates signature, inserts jti into Redis SETNX with TTL = (exp - now + 30s), returns 200 OK.',
          packet: 'jti=jwtb-7f4e91c0 [NEW]',
          wire: `# Redis Replay Guard:\nSETEX jti:jwtb-7f4e91c0-3b2a-4d1e-8c6a-9f0e2d1b4a3c 210 "CONSUMED"`
        },
        {
          from: 'att', to: 'as', channel: 'attack',
          short: 'REPLAYS SAME JWT!',
          title: 'Replay Step 2 — Attacker Replays Intercepted Assertion Within 3-Min Window',
          beginner: 'Even though the JWT is still mathematically valid and unexpired, an attacker tries submitting the exact same signed assertion a second time.',
          expert: 'Attacker submits identical assertion parameter carrying already-consumed jti.',
          packet: 'REPLAY jti=jwtb-7f4e91c0',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.partner.example.com\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=<SAME_SIGNED_JWT>`
        },
        {
          from: 'as', to: 'att', channel: 'attack',
          shockwave: 'as',
          short: 'jti CACHE BLOCKS!',
          title: 'Replay Step 3 — Redis jti Cache Hits -> Instant Rejection!',
          beginner: 'Barcode already scanned! The Authorization Server blocks the replay immediately.',
          expert: 'AS detects existing jti key in Redis and returns HTTP 400 invalid_grant (assertion replay detected).',
          packet: '400 invalid_grant [REPLAY]',
          wire: `HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n{\n  "error": "invalid_grant",\n  "error_description": "JWT assertion jti has already been consumed."\n}`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'Signed JWT Assertion (RFC 7523 §2.1)',
        header: { alg: 'RS256', typ: 'JWT', kid: 'svc-billing-key-2026-04' },
        payload: {
          iss: '3MVG9_billing_connected_app_client_id',
          sub: 'alice.chen@corp.example.com',
          aud: 'https://auth.partner.example.com/oauth2/token',
          iat: 1795069200,
          nbf: 1795069195,
          exp: 1795069380,
          jti: 'jwtb-7f4e91c0-3b2a-4d1e-8c6a-9f0e2d1b4a3c',
          scope: 'invoices:read invoices:write'
        }
      }
    ],
    threats: [
      {
        name: 'Assertion Replay Attack',
        mechanism: 'An intercepted 5-minute JWT assertion is replayed repeatedly to mint extra tokens.',
        mitigation: 'Short exp (≤180s) + mandatory unique jti stored in a distributed Redis replay cache until expiry.'
      },
      {
        name: 'Cross-JWT Confusion (ID Token Reuse)',
        mechanism: 'Attacker submits an ordinary OIDC ID Token as a jwt-bearer grant assertion if audiences overlap.',
        mitigation: 'Enforce strict exact aud isolation (AS token endpoint URI) and explicit typ header validation (RFC 8725 / rfc7523bis).'
      },
      {
        name: 'Algorithm Confusion & Unrestricted sub Impersonation',
        mechanism: 'Swapping alg to none/HS256, supplying untrusted inline jwk headers, or asserting sub=ceo@corp.com.',
        mitigation: 'Allowlist asymmetric RS256/ES256/PS256, pin keys strictly by kid in pre-registered JWKS, and enforce subject pre-authorization allowlists.'
      }
    ],
    pitfalls: [
      {
        name: 'Wrong aud String Format (#1 Integration Bug)',
        detail: 'Google Cloud expects https://oauth2.googleapis.com/token, Salesforce expects https://login.salesforce.com (NOT /services/oauth2/token!), and Entra ID expects https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token.'
      },
      {
        name: 'Forgetting Admin Pre-Authorization',
        detail: 'JWT Bearer has zero browser UI—if an admin hasn’t pre-approved the Connected App or Domain-Wide Delegation scopes, the AS fails with "user hasn’t approved this consumer".'
      },
      {
        name: 'Confusing §2.1 (Grant) vs. §2.2 (Client Auth)',
        detail: '§2.1 uses grant_type=jwt-bearer + assertion to replace user authorization; §2.2 uses client_assertion to replace client_secret during ANY grant.'
      }
    ]
  }
];
