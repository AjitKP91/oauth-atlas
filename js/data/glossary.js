// ==========================================================================
// OAUTH ATLAS — Universal IAM Glossary & JWT Claim Explanations
// ==========================================================================

export const GLOSSARY = [
  {
    id: 'bff',
    term: 'BFF (Backend-for-Frontend)',
    tag: 'Web Security Pattern',
    short: 'A thin server-side proxy sitting right in front of your browser SPA so OAuth tokens never touch JavaScript.',
    detail:
      'Instead of storing Access and Refresh Tokens in browser localStorage (where any XSS bug or rogue analytics script can steal them), a BFF (e.g., Next.js API routes, Spring Cloud Gateway, Duende BFF, or SAP AppRouter) acts as a Confidential Client. It runs the OAuth token exchange on the server, locks the tokens inside a server-side session store (like Redis), and gives the browser ONLY an HttpOnly, Secure, SameSite=Lax cookie. When your React/Vue app calls /api/orders, the BFF swaps the cookie for Authorization: Bearer <token> server-side and forwards the request.',
    analogy: 'Like a hotel valet keeping your car keys locked in a steel desk safe and handing you only a paper claim stub.'
  },
  {
    id: 'nonce',
    term: 'nonce ("Number Used Once")',
    tag: 'OIDC Core 1.0',
    short: 'A random one-time string baked into the signed ID Token to prove it belongs to THIS exact login attempt.',
    detail:
      'Before redirecting the user to /authorize, the Client generates a fresh random nonce and stores it in the browser session. The Authorization Server copies that exact nonce inside the signed ID Token. When the ID Token arrives back, the Client verifies id_token.nonce === saved_nonce. Quick mental rule: "state" protects the browser redirect from CSRF; "nonce" binds the signed ID Token to this login to defeat replay attacks.',
    analogy: 'Asking a friend to hold up today’s newspaper in a selfie so you know the photo wasn’t taken last month.'
  },
  {
    id: 'state',
    term: 'state (CSRF Token)',
    tag: 'RFC 6749 §4.1.1',
    short: 'An unguessable per-login random token bound to the user’s browser cookie to prevent Login CSRF.',
    detail:
      'The Client sends state in the initial redirect and checks that the exact same state returns on /callback. Without binding state to an HttpOnly session cookie, an attacker could pause their own login and trick your browser into loading /callback?code=ATTACKER_CODE, silently logging you into the attacker’s account (Login CSRF).',
    analogy: 'A coat-check stub with a unique serial number matched before handing back a coat.'
  },
  {
    id: 'pkce',
    term: 'PKCE (Proof Key for Code Exchange)',
    tag: 'RFC 7636 / OAuth 2.1',
    short: 'A dynamic one-time secret + SHA-256 hash pair that makes stolen authorization codes completely useless.',
    detail:
      'Before redirecting, your OAuth SDK invents a long random secret (code_verifier) and hashes it with SHA-256 (code_challenge). It sends only the hash on the public front-channel, and later proves it knows the original secret on the back-channel /token call. Nobody needs to memorize the exact RFC character rules—always let your SDK generate it with S256 (never plain).',
    analogy: 'Locking a suitcase with a one-time combination, sending the lock’s serial hash publicly, and revealing the combination only at the private pickup window.'
  },
  {
    id: 'dpop',
    term: 'DPoP (Demonstrating Proof-of-Possession)',
    tag: 'RFC 9449',
    short: 'Binds access and refresh tokens to a client-held asymmetric key pair so stolen tokens cannot be replayed.',
    detail:
      'Standard Bearer tokens work like cash—anyone who steals one can spend it. With DPoP, the client generates a key pair, sends a signed DPoP proof JWT on every request, and the Authorization Server stamps the public key thumbprint (cnf.jkt) inside the token. Even if an attacker steals the token, they cannot sign valid DPoP proofs without the private key.',
    analogy: 'A credit card that requires your live cryptographic signature at every register instead of anonymous cash.'
  },
  {
    id: 'mtls',
    term: 'mTLS (Mutual TLS & Cert-Bound Tokens)',
    tag: 'RFC 8705',
    short: 'Two-way TLS where both server and client prove identity with X.509 certificates, binding tokens to that cert.',
    detail:
      'In confidential backend-to-backend integrations, mTLS eliminates static client_secrets and stamps the client certificate thumbprint (cnf.x5t#S256) into issued tokens so they can only be used over a TLS connection authenticated by that exact client certificate.',
    analogy: 'An armored truck whose license plate and biometric driver seal are verified at the vault gate.'
  },
  {
    id: 'act',
    term: 'act Claim (Actor / Delegation Chain)',
    tag: 'RFC 8693 §4.1',
    short: 'Records which microservice or actor is acting on behalf of the user (sub) in Token Exchange.',
    detail:
      'When Service A exchanges Alice’s token for a downstream token for Service B, the Authorization Server keeps sub="alice" and embeds act: { sub: "service-a" }. Across multiple hops, act nests from outermost (most recent actor) to innermost (earliest actor), preserving end-to-end audit provenance.',
    analogy: 'A connecting boarding pass showing both the passenger’s name and the transfer airline that handed them off.'
  },
  {
    id: 'jti',
    term: 'jti (JWT ID & Replay Cache)',
    tag: 'RFC 7519 §4.1.7',
    short: 'A unique identifier (UUID) for a single JWT so the server can track and reject replayed assertions.',
    detail:
      'In assertion flows (JWT Bearer, private_key_jwt, DPoP), an attacker who intercepts a signed JWT within its 2-minute validity window could replay it. Storing seen jti values in Redis until exp ensures every assertion is strictly single-use.',
    analogy: 'A unique concert ticket barcode that turns red at the scanner the second time anyone tries to use it.'
  },
  {
    id: 'jwks',
    term: 'JWKS (JSON Web Key Set)',
    tag: 'RFC 7517',
    short: 'The Authorization Server’s public key directory (/.well-known/jwks.json) used to verify JWT signatures.',
    detail:
      'Resource Servers fetch and cache JWKS public keys indexed by kid (Key ID) so they can verify incoming access tokens locally in microseconds without calling the Authorization Server on every request—and perform rate-limited background refreshes during zero-downtime key rotation.',
    analogy: 'An official embassy ledger of wax-seal stamps anyone can inspect to verify signed passports.'
  },
  {
    id: 'private_key_jwt',
    term: 'private_key_jwt (Client Assertion)',
    tag: 'RFC 7523 §2.2',
    short: 'Authenticating a confidential client with a short-lived signed JWT instead of transmitting a static client_secret.',
    detail:
      'Commonly confused with the JWT Bearer grant (§2.1)! private_key_jwt uses client_assertion_type + client_assertion solely to prove the client’s identity during ANY grant (like client_credentials, authorization_code, or CIBA). The private key never leaves your server.',
    analogy: 'Signing a check with a hardware-backed notary stamp instead of reading your account PIN aloud.'
  },
  {
    id: 'rtr',
    term: 'Refresh Token Rotation & Reuse Detection',
    tag: 'RFC 9700 / OAuth 2.1',
    short: 'Every refresh issues a brand-new refresh token and retires the old one; replaying a retired token revokes the entire session.',
    detail:
      'If a thief steals RT_gen1 and the real user rotates to RT_gen2, the thief’s later attempt to spend RT_gen1 trips Reuse Detection. The Authorization Server immediately invalidates the entire Token Family (including RT_gen2), capping theft blast radius to seconds.',
    analogy: 'Shredding your front-desk voucher every time you renew a hotel keycard—if anyone hands in a copy of a shredded voucher, security locks the room immediately.'
  },
  {
    id: 'xsw',
    term: 'XSW (XML Signature Wrapping)',
    tag: 'SAML 2.0 Threat',
    short: 'A classic SAML attack injecting an unsigned forged Assertion alongside a legitimately signed one.',
    detail:
      'If a buggy XML parser checks the XMLDSig signature on element A while extracting <saml:NameID> from an unsigned sibling element B, an attacker can forge any admin identity. Always verify the signature reference URI and extract claims exclusively from the verified DOM subtree with DTD/XXE disabled.',
    analogy: 'Stapling a forged cover letter onto a notarized page hoping the clerk verifies the stamp on page 2 while reading the name on page 1.'
  }
];

export const CLAIM_EXPLANATIONS = {
  alg: 'Signing algorithm (must be allowlisted asymmetric RS256 / ES256 / PS256 — never "none").',
  typ: 'Explicit JOSE media type (RFC 8725) — e.g. "at+jwt" for access tokens or "dpop+jwt" for DPoP proofs prevents cross-JWT confusion.',
  kid: 'Key ID selecting which public key in the issuer’s /.well-known/jwks.json verifies this signature.',
  x5t: 'Base64url SHA-1 thumbprint of the X.509 signing certificate per RFC 7515 §4.1.7 (for SHA-256 thumbprints see x5t#S256).',
  jwk: 'Embedded public key inside a DPoP proof header (RFC 9449) matched against the private key signature.',
  iss: 'Issuer URI — the exact Authorization Server or client that signed and minted this token.',
  sub: 'Subject — the unique user ID (or client_id in M2M flows) this token represents.',
  aud: 'Audience — the exact intended recipient (Resource Server for access tokens; Client ID for ID tokens; Token Endpoint for assertions).',
  client_id: 'Identifier of the OAuth Client application that requested this token.',
  scope: 'Space-delimited permissions granted (least-privilege boundaries enforced by the Resource Server).',
  iat: 'Issued At (Unix timestamp) — when the token was minted.',
  nbf: 'Not Before (Unix timestamp) — token is invalid prior to this moment.',
  exp: 'Expiration (Unix timestamp) — short-lived (5–15 min for access tokens, ≤3 min for assertions).',
  jti: 'Unique JWT ID — cached in Redis by the server to block replay of single-use assertions.',
  htm: 'HTTP Method claim in DPoP proof (RFC 9449) — binds the proof to an exact HTTP verb such as POST or GET.',
  htu: 'HTTP Target URI claim in DPoP proof (RFC 9449) — binds the proof to the exact scheme, host, and path.',
  nonce: 'OIDC one-time random string tying this signed ID Token to the exact login request that initiated it.',
  auth_time: 'Exact Unix timestamp when the human user actively authenticated.',
  amr: 'Authentication Methods References (RFC 8176 registered values: pwd, hwk, face, fpt, mfa).',
  acr: 'Authentication Context Class Reference — assurance tier met (e.g., PSD2 Strong Customer Authentication).',
  email: 'Identity claim in an OIDC ID Token identifying the user’s email address.',
  act: 'RFC 8693 Actor claim — records who is acting on behalf of sub (outermost = immediate caller, nested = prior callers).',
  cnf: 'Confirmation claim — cryptographically pins the token to a sender’s DPoP key thumbprint (jkt) or mTLS cert (x5t#S256).',
  authorization_details: 'Rich Authorization Requests (RFC 9396) structured JSON permissions (e.g., exact payment amount and payee).',
  'urn:openid:params:jwt:claim:auth_req_id': 'CIBA Core §10.3.1 claim binding the ID Token cryptographically back to the original /bc-authorize auth_req_id.',
  Version: 'SAML Assertion protocol version (always "2.0" for OASIS SAML 2.0).',
  ID: 'Unique SAML Assertion identifier — referenced by <ds:Reference URI> and cached to block replay.',
  IssueInstant: 'UTC timestamp when the corporate SAML Identity Provider minted this assertion.',
  SignatureAlg: 'XML Digital Signature + Exclusive Canonicalization algorithms protecting the SAML assertion.',
  Issuer: 'EntityID of the corporate SAML Identity Provider that signed this assertion.',
  NameID: 'Authenticated user identifier in SAML (mapped to a local ERP/API user such as ACHEN).',
  Recipient: 'Exact OAuth /token endpoint URL authorized to accept this SAML bearer assertion (RFC 7522 §3).',
  Audience: 'Intended Authorization Server audience URI — prevents Web-SSO assertions from being replayed at /token.',
  NotOnOrAfter: 'Strict UTC expiration timestamp after which the SAML assertion MUST be rejected.',
  AuthnContext: 'Authentication context class describing how the user signed in at the SAML Identity Provider.'
};
