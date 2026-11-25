// ==========================================================================
// OAUTH ATLAS — Flows 5 to 8 (SAML Bearer, Token Exchange, Device Code, CIBA)
// ==========================================================================

export const FLOWS_PART_2 = [
  {
    id: 'saml2-bearer',
    num: 5,
    accent: '#ec4899',
    group: 'Enterprise & Microservice Propagation',
    groupTag: 'ext',
    name: 'SAML 2.0 Bearer Assertion',
    shortName: 'SAML 2.0 Bearer',
    grantType: 'urn:ietf:params:oauth:grant-type:saml2-bearer',
    rfc: 'RFC 7522 §2.1 · RFC 7521 · OASIS SAML 2.0',
    userPresence: 'Indirect (Authenticated via Enterprise SAML SSO)',
    clientType: 'Confidential only',
    tokensIssued: 'Access Token (typically no Refresh Token)',
    primaryUse: 'Bridging legacy SAML 2.0 Enterprise SSO to modern OAuth REST APIs (SAP S/4HANA, SuccessFactors, Salesforce).',
    art: 'assets/passport-keycard.jpg',
    artCaption: 'Enterprise Diplomatic Passport -> City Transit Card',
    atAGlance:
      'An enterprise bridge flow that trades a signed SAML 2.0 XML Assertion (from corporate SSO) for a lightweight OAuth 2.0 Access Token so modern REST APIs enforce the logged-in user’s permissions without parsing XML.',
    bridge:
      'What if your company’s login system speaks legacy SAML 2.0 XML instead of modern JSON Web Tokens?',
    analogy:
      'Arriving in a foreign country with a bulky paper diplomatic passport (SAML 2.0 XML) from your home embassy (Corporate IdP). At the border kiosk (Authorization Server), officers verify the holographic seal and hand you a sleek tap-to-pay city transit card (OAuth Access Token) accepted at every subway turnstile (REST APIs).',
    whenYes: [
      'Enterprise landscapes where users log in via corporate SAML SSO (ADFS, Okta, SAP IAS) and apps/middleware (like SAP BTP) must call S/4HANA, SuccessFactors, or Salesforce under the exact end-user’s identity.'
    ],
    whenNo: [
      'Greenfield cloud-native microservices speaking OIDC/OAuth natively (use Flow 1 + Flow 6: Token Exchange—avoid XML canonicalization and manual SAML cert rotation!).',
      'Public Clients (SPAs / mobile apps).'
    ],
    interactiveLab: 'saml-inspector',
    modes: [
      { id: 'normal', label: 'RFC 7522 XML Bridge', type: 'normal' },
      { id: 'attack', label: 'Simulate XSW XML Attack', type: 'attack' }
    ],
    actors: [
      { id: 'idp', label: 'Corporate SAML IdP', sub: 'X.509 Signing Cert', icon: 'vault', color: '#a855f7' },
      { id: 'c', label: 'App / Middleware', sub: 'e.g. SAP BTP Dest.', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Target Auth Server', sub: 'S/4HANA / Salesforce', icon: 'as', color: '#10b981' },
      { id: 'rs', label: 'ERP OData / API', sub: 'ABAP User Context', icon: 'rs', color: '#06b6d4' }
    ],
    attackActor: { id: 'att', label: 'XML Attacker', sub: 'Injects Forged Node', icon: 'attacker', color: '#f43f5e' },
    scenarios: {
      normal: [
        {
          from: 'idp', to: 'c', channel: 'front',
          short: 'Signed <saml:Assertion>',
          title: 'Step 1 — Obtain Signed SAML 2.0 Assertion for Alice',
          beginner: 'Either Alice signs in through corporate SAML Single Sign-On, or a trusted enterprise gateway (such as SAP BTP Destination Service) mints a signed XML assertion on her behalf—proving she is alice.chen@corp.example.com.',
          expert: 'Signed <saml:Assertion> (obtained via Web-SSO or minted dynamically by a trusted assertion issuer) contains <ds:Signature> (exc-c14n + RSA-SHA256), <saml:NameID>, bearer SubjectConfirmation with Recipient=/token URL, AudienceRestriction, and short NotOnOrAfter.',
          packet: 'Signed XML Assertion',
          wire: `<saml:Assertion ID="_a7c4e9f2" Version="2.0" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">\n  <saml:Issuer>https://idp.corp.example.com/saml2</saml:Issuer>\n  <ds:Signature><!-- XMLDSig RSA-SHA256 over #_a7c4e9f2 --></ds:Signature>\n  <saml:Subject>\n    <saml:NameID Format="...emailAddress">alice.chen@corp.example.com</saml:NameID>\n    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">\n      <saml:SubjectConfirmationData NotOnOrAfter="2026-11-20T03:45:00Z"\n        Recipient="https://erp.corp.example.com/sap/bc/sec/oauth2/token"/>\n    </saml:SubjectConfirmation>\n  </saml:Subject>\n  <saml:Conditions NotBefore="2026-11-20T03:39:30Z" NotOnOrAfter="2026-11-20T03:45:00Z">\n    <saml:AudienceRestriction>\n      <saml:Audience>https://erp.corp.example.com/oauth2</saml:Audience>\n    </saml:AudienceRestriction>\n  </saml:Conditions>\n</saml:Assertion>`
        },
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token [saml2-bearer]',
          title: 'Step 2 — Back-Channel Base64URL SAML-to-OAuth Exchange',
          beginner: 'The backend encodes the exact untouched XML assertion (never re-formatting spaces or line breaks, which would break the digital signature!) and trades it at the ERP’s OAuth token endpoint.',
          expert: 'RFC 7522 §2.1: assertion MUST be a single <saml:Assertion> (never <samlp:Response>) encoded using base64url (SHOULD omit line breaks & "=" padding, though legacy server tolerances vary).',
          packet: 'grant_type=saml2-bearer',
          wire: `POST /sap/bc/sec/oauth2/token HTTP/1.1\nHost: erp.corp.example.com\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic YnRwLXBvcnRhbC1jbGllbnQ6czNjcjN0X2VycF9rM3k=\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Asaml2-bearer&assertion=PHNhbWw6QXNzZXJ0aW9uIHhtbG5zOnNhbWw9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iLi4uPC9zYW1sOkFzc2VydGlvbj4&scope=API_SALES_ORDER_SRV_0001`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK OAuth Token',
          title: 'Step 3 — XMLDSig Verified & NameID Mapped -> Lightweight OAuth Token',
          beginner: 'The target ERP (e.g., SAP S/4HANA) verifies the Identity Provider’s signing certificate, safely blocks dangerous XML entity tricks, maps alice.chen@corp.example.com to her internal ERP account (ACHEN), and returns a lightweight OAuth Access Token.',
          expert: 'AS verifies XMLDSig against trusted IdP X.509 cert, checks Assertion ID replay cache, Recipient, Audience, and NotOnOrAfter, then mints user-scoped OAuth access_token.',
          packet: 'OAuth Token [sub=ACHEN]',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json;charset=UTF-8\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVycC1vYXV0aC0yMDI2In0.eyJpc3MiOiJodHRwczovL2VycC5jb3JwLmV4YW1wbGUuY29tIiwic3ViIjoiQUNIRU4iLCJhdWQiOiJodHRwczovL2VycC5jb3JwLmV4YW1wbGUuY29tL3NhcC9vcHUvb2RhdGEiLCJzY29wZSI6IkFQSV9TQUxFU19PUkRFUl9TUlZfMDAwMSIsImlhdCI6MTc5NTA2OTIwMywiZXhwIjoxNzk1MDcyODAzfQ.SIGNATURE",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "API_SALES_ORDER_SRV_0001"\n}`
        },
        {
          from: 'c', to: 'rs', channel: 'back',
          short: 'Call OData API',
          title: 'Step 4 — Call ERP REST / OData API Under Alice’s Exact Permissions',
          beginner: 'Modern REST calls flow effortlessly with a standard Bearer token while S/4HANA enforces Alice’s full ABAP authorization profile.',
          expert: 'Zero XML overhead on API calls; audit trail logs ABAP user ACHEN.',
          packet: 'Bearer ERP_TOKEN',
          wire: `GET /sap/opu/odata/API_SALES_ORDER_SRV/A_SalesOrder HTTP/1.1\nHost: erp.corp.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImVycC1vYXV0aC0yMDI2In0...`
        }
      ],
      attack: [
        {
          from: 'att', to: 'as', channel: 'attack',
          short: 'XML Signature Wrapping!',
          title: 'XSW Attack Step 1 — Attacker Splices Unsigned Forged <saml:Assertion>',
          beginner: 'The attacker keeps a legitimately signed assertion for "alice", but wraps an unsigned forged sibling claiming NameID="ADMIN" into the XML tree—hoping a sloppy parser checks the signature on one node and reads the username from the other!',
          expert: 'XML Signature Wrapping (XSW): <ds:Reference URI="#_legit_alice"> validates cleanly while naive XPath //saml:NameID reads the injected unsigned node.',
          packet: 'Wrapped Evil XML DOM',
          wire: `<!-- FORGED UNSIGNED WRAPPER -->\n<saml:Assertion ID="_evil_forged">\n  <saml:Subject><saml:NameID>ADMIN_SUPERUSER</saml:NameID></saml:Subject>\n  <Extensions>\n    <!-- REAL SIGNED NODE MOVED INSIDE -->\n    <saml:Assertion ID="_a7c4e9f2"><ds:Signature URI="#_a7c4e9f2"/>...alice...</saml:Assertion>\n  </Extensions>\n</saml:Assertion>`
        },
        {
          from: 'as', to: 'att', channel: 'attack',
          shockwave: 'as',
          short: 'STRICT DOM SHIELD!',
          title: 'XSW Attack Step 2 — Strict XSD + Verified-Subtree Parser Rejects Forgery',
          beginner: 'A hardened SAML parser rejects invalid XML structure, disables external DTD/XXE entities, and ONLY reads the username from inside the exact cryptographically signed box!',
          expert: 'AS enforces strict SAML 2.0 XSD schema validation, confirms Reference URI points strictly to root Assertion ID, and rejects with HTTP 400 invalid_grant.',
          packet: '400 invalid_grant [XSW BLOCKED]',
          wire: `HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n{\n  "error": "invalid_grant",\n  "error_description": "SAML XML schema / root signature reference verification failed."\n}`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'Issued ERP Access Token',
        header: { alg: 'RS256', typ: 'JWT', kid: 'erp-oauth-2026' },
        payload: {
          iss: 'https://erp.corp.example.com',
          sub: 'ACHEN',
          aud: 'https://erp.corp.example.com/sap/opu/odata',
          scope: 'API_SALES_ORDER_SRV_0001',
          iat: 1795069203,
          exp: 1795072803
        }
      },
      {
        label: 'Decoded <saml:Assertion> (RFC 7522)',
        header: {
          Version: '2.0',
          ID: '_a7c4e9f2',
          IssueInstant: '2026-11-20T03:40:00Z',
          SignatureAlg: 'rsa-sha256 + xml-exc-c14n'
        },
        payload: {
          Issuer: 'https://idp.corp.example.com/saml2',
          NameID: 'alice.chen@corp.example.com',
          Recipient: 'https://erp.corp.example.com/sap/bc/sec/oauth2/token',
          Audience: 'https://erp.corp.example.com/oauth2',
          NotOnOrAfter: '2026-11-20T03:45:00Z',
          AuthnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'
        }
      }
    ],
    threats: [
      {
        name: 'XML Signature Wrapping (XSW)',
        mechanism: 'Attacker injects an unsigned forged Assertion alongside a valid signed one to trick naive XPath claim lookups.',
        mitigation: 'Enforce strict SAML XSD schema, verify <ds:Reference URI> matches root Assertion ID, and read claims strictly from the verified DOM subtree.'
      },
      {
        name: 'XXE & Billion Laughs XML DoS',
        mechanism: 'Malicious <!DOCTYPE> or recursive XML entity expansion inside Base64-decoded payload leaks files or crashes RAM.',
        mitigation: 'Completely disable DOCTYPE, external entities, and XInclude in the XML parser BEFORE signature checks.'
      },
      {
        name: 'Assertion Replay & Web-SSO Cross-Use',
        mechanism: 'Replaying a SAML Web-SSO assertion at an OAuth /token endpoint.',
        mitigation: 'Strictly validate Recipient === AS /token URL, Audience, short NotOnOrAfter (≤5 min), and Assertion ID replay cache.'
      }
    ],
    pitfalls: [
      {
        name: 'Base64 vs. Base64URL & Whitespace Mutation',
        detail: 'RFC 7522 §2.1 mandates base64url (SHOULD omit "=" padding), yet some legacy SAP/Salesforce servers expect standard Base64 URL-encoded. Never pretty-print or re-serialize signed XML—any whitespace edit breaks XMLDSig!'
      },
      {
        name: 'NameID Format Mismatch',
        detail: 'Corporate IdP sends emailAddress while downstream ERP expects Employee ID or uppercase ABAP username. Align NameIDFormat and USREXTID mapping across landscapes.'
      },
      {
        name: 'Silent SAML X.509 Certificate Expiry',
        detail: 'Unlike auto-polling JWKS, SAML trust stores rely on static certs expiring every 1–3 years—alert 90/60/30 days ahead and use dual-cert rollover.'
      }
    ]
  },

  {
    id: 'token-exchange',
    num: 6,
    accent: '#06b6d4',
    group: 'Enterprise & Microservice Propagation',
    groupTag: 'ext',
    name: 'Token Exchange (Delegation vs. Impersonation)',
    shortName: 'Token Exchange',
    grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
    rfc: 'RFC 8693 (Delegation, Impersonation & Nested act Claim)',
    userPresence: 'Indirect (End-user token carried across hops)',
    clientType: 'Confidential only',
    tokensIssued: 'Access Token (or ID/Custom Token) + required issued_token_type',
    primaryUse: 'Zero-trust microservice chains (act claim), strict audience re-scoping, Cloud Workload Identity Federation.',
    art: 'assets/analogy-exchange.jpg',
    artCaption: 'Connecting International Boarding Pass with Nested act Stamp',
    atAGlance:
      'The zero-trust microservice handoff flow letting Service A trade Alice’s incoming token for a fresh, tightly audience-scoped token meant ONLY for Service B—recording who handed off whom via the nested act claim.',
    bridge:
      'Modern zero-trust microservices: swap Alice’s token at every service hop to narrow audience & scopes while stamping the full chain of custody (act).',
    analogy:
      'Flying an international connecting itinerary. When you land at the hub (Service A), you don’t walk onto Airline 2 waving Airline 1’s boarding pass. The transfer desk swaps it for a new Airline 2 pass listing BOTH the passenger (sub: Alice) AND which transfer carrier handed you off (act: Service A).',
    whenYes: [
      'Zero-trust microservice graphs (Gateway -> Service A -> Service B -> Service C) requiring single-service aud isolation and monotonic scope narrowing.',
      'Cloud Workload Identity Federation (e.g., Google Cloud STS exchanging GitHub/AWS/K8s OIDC JWTs).'
    ],
    whenNo: [
      'Initial interactive browser login (use Flow 1).',
      'Pure M2M calls with no end-user context (use Flow 2).',
      'Async queues (Kafka/SQS) where the user’s short-lived subject_token will expire before the worker runs.'
    ],
    interactiveLab: 'act-builder',
    modes: [
      { id: 'delegation', label: 'Delegation (with act Claim)', type: 'normal' },
      { id: 'impersonation', label: 'Impersonation (No act Claim)', type: 'alt' }
    ],
    actors: [
      { id: 'u', label: 'User Alice', sub: 'Holds Token_A', icon: 'user', color: '#f59e0b' },
      { id: 'a', label: 'Service A', sub: 'svc-checkout', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Auth Server (STS)', sub: 'RFC 8693 Policy Engine', icon: 'as', color: '#10b981' },
      { id: 'b', label: 'Service B', sub: 'svc-billing', icon: 'rs', color: '#a855f7' }
    ],
    scenarios: {
      delegation: [
        {
          from: 'u', to: 'a', channel: 'front',
          short: 'Token_A [aud=checkout]',
          title: 'Step 1 — Alice Calls Service A with Token_A (Scoped Only to Service A)',
          beginner: 'Alice checks out her cart using Token_A. Service A verifies Token_A is valid for checkout—and refuses to blindly forward Token_A to Billing (wrong audience!).',
          expert: 'Service A validates Token_A (sig, exp, aud === svc-checkout). Forwarding Token_A directly would create a Confused Deputy lateral-replay risk.',
          packet: 'Token_A [sub=alice, aud=A]',
          wire: `POST /checkout HTTP/1.1\nHost: checkout.internal.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiJ9.SUB_ALICE_AUD_CHECKOUT.SIG_A`
        },
        {
          from: 'a', to: 'as', channel: 'back',
          short: 'POST /token [RFC 8693]',
          title: 'Step 2 — Service A Exchanges Token_A for a Scoped Billing Token',
          beginner: 'Service A proves its own identity to the Authorization Server (acting as a Security Token Service, or STS), hands over Alice’s Token_A, and asks for a narrow billing:charge token meant ONLY for Service B.',
          expert: 'RFC 8693 §2.1: grant_type=token-exchange, subject_token=Token_A, subject_token_type=access_token, audience=svc-billing, narrowed scope=billing:charge + client auth (or actor_token).',
          packet: 'subject_token -> aud=billing',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic c3ZjLWNoZWNrb3V0OnMzY3IzdF9jaGVja291dF9rM3k=\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange\n&subject_token=eyJhbGciOiJSUzI1NiJ9.SUB_ALICE_AUD_CHECKOUT.SIG_A\n&subject_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aaccess_token\n&requested_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aaccess_token\n&audience=https%3A%2F%2Fbilling.internal.example.com\n&scope=billing%3Acharge`
        },
        {
          from: 'as', to: 'a', channel: 'back',
          short: '200 OK [Token_B + act]',
          title: 'Step 3 — STS Enforces Policy, Caps exp & Stamps act Claim!',
          beginner: 'The Authorization Server confirms Checkout is allowed to call Billing for Alice, shrinks the expiry so it cannot outlive Alice’s session, and stamps BOTH sub="alice" AND act.sub="svc-checkout" inside Token_B.',
          expert: 'RFC 8693 §2.2.1 response MUST include issued_token_type. Token_B embeds aud=svc-billing, narrowed scope, exp <= Token_A.exp, and act: { sub: "svc-checkout" }.',
          packet: 'Token_B [sub=alice, act=A]',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json;charset=UTF-8\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9.TOKEN_B_WITH_ACT.SIG_B",\n  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",\n  "token_type": "Bearer",\n  "expires_in": 300,\n  "scope": "billing:charge"\n}`
        },
        {
          from: 'a', to: 'b', channel: 'back',
          short: 'Call Service B [Provenance]',
          title: 'Step 4 — Service B Verifies Audience AND Full Delegation Chain',
          beginner: 'Billing now knows TWO facts with cryptographic certainty: (1) this action is on behalf of Alice, AND (2) it arrived specifically via Checkout—ideal for zero-trust rules and audit logs!',
          expert: 'Service B enforces aud === svc-billing, sub === usr_alice_9f82a1, and act.sub === svc-checkout (plus optional may_act validation).',
          packet: 'Bearer Token_B [act=checkout]',
          wire: `POST /v1/charges HTTP/1.1\nHost: billing.internal.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9.TOKEN_B_WITH_ACT.SIG_B`
        }
      ],
      impersonation: [
        {
          from: 'a', to: 'as', channel: 'back',
          short: 'Exchange [Impersonation]',
          title: 'Impersonation Step 1 — Service A Requests Token Without Actor Provenance',
          beginner: 'In Impersonation mode, Service A swaps Alice’s Token_A for a Billing token without stamping its own intermediary identity.',
          expert: 'RFC 8693 §1.1 Impersonation semantics: no actor_token / act policy requested on POST /oauth2/token.',
          packet: 'Impersonation Request',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange&subject_token=<Token_A>&subject_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aaccess_token&audience=https%3A%2F%2Fbilling.internal.example.com`
        },
        {
          from: 'as', to: 'a', channel: 'back',
          short: '200 OK [No act Claim]',
          title: 'Impersonation Step 2 — STS Returns Token_B Carrying Only sub=Alice',
          beginner: 'The Authorization Server returns Token_B to Service A, naming ONLY Alice (sub) with zero mention that Service A requested it.',
          expert: 'AS omits the act claim; resulting Token_B carries sub="usr_alice_9f82a1" and aud="https://billing.internal.example.com".',
          packet: 'Token_B [sub=alice, NO act]',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9.IMPERSONATED_TOKEN_B.SIG",\n  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",\n  "token_type": "Bearer",\n  "expires_in": 300\n}`
        },
        {
          from: 'a', to: 'b', channel: 'back',
          short: 'Call B (Indistinguishable)',
          title: 'Impersonation Step 3 — Service B Cannot Tell Alice Apart From Service A',
          beginner: 'When Service A calls Service B, Service A looks 100% indistinguishable from Alice calling directly! Avoid Impersonation in regulated systems unless a legacy API breaks on extra claims—prefer Delegation (act) for auditability.',
          expert: 'Higher compliance/blast-radius risk: Service B sees aud === svc-billing and sub === usr_alice_9f82a1, losing intermediary chain-of-custody.',
          packet: 'Bearer Token_B [No act!]',
          wire: `{\n  "iss": "https://auth.example.com",\n  "sub": "usr_alice_9f82a1",\n  "aud": "https://billing.internal.example.com",\n  "scope": "billing:charge",\n  "exp": 1795069505\n  // WARNING: No "act" claim — Billing cannot tell svc-checkout mediated this call!\n}`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'Delegated Token_B (with act)',
        header: { alg: 'RS256', typ: 'at+jwt', kid: 'as-key-2026' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'usr_alice_9f82a1',
          aud: 'https://billing.internal.example.com',
          client_id: 'svc-checkout',
          scope: 'billing:charge',
          act: { sub: 'svc-checkout' },
          iat: 1795069205,
          exp: 1795069505
        }
      },
      {
        label: '3-Hop Nested act (RFC 8693 §4.1)',
        header: { alg: 'RS256', typ: 'at+jwt', kid: 'as-key-2026' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'usr_alice_9f82a1',
          aud: 'https://ledger.internal.example.com',
          scope: 'ledger:debit',
          act: { sub: 'svc-billing', act: { sub: 'svc-checkout' } },
          iat: 1795069209,
          exp: 1795069505
        }
      }
    ],
    threats: [
      {
        name: 'Token Forwarding / Lateral Replay (Confused Deputy)',
        mechanism: 'If Service A blindly forwards Token_A to Service B, a compromised Service B replays Token_A against Service C.',
        mitigation: 'Enforce single-service aud validation everywhere and perform RFC 8693 Token Exchange at every service boundary.'
      },
      {
        name: 'Unbounded Lateral Privilege Escalation',
        mechanism: 'Compromised low-trust service swaps read-only Token_A into an admin token for an unrelated service.',
        mitigation: 'Allowlist exact (caller -> target_audience, allowed_scopes) edges at the STS, intersect scopes, and check may_act.'
      },
      {
        name: 'Token Lifetime Laundering',
        mechanism: 'Rogue service exchanges an expiring token 2s before expiry to keep minting fresh 1-hour tokens forever.',
        mitigation: 'STS MUST cap Token_B.exp <= min(now + exchange_ttl, subject_token.exp) so tokens never outlive the user session.'
      }
    ],
    pitfalls: [
      {
        name: 'Latency Cascades Across Deep Microservice Graphs',
        detail: '5 synchronous uncached exchanges add 5 × 80ms to p99 latency. Cache Token_B keyed by (SHA256(subject_token), audience, scope) with TTL capped to min(Token_B.exp, Token_A.exp) - 30s.'
      },
      {
        name: 'Assuming Every Vendor Speaks Raw RFC 8693',
        detail: 'Microsoft Entra ID OBO uses grant_type=jwt-bearer + requested_token_use=on_behalf_of (NOT token-exchange!). Always check vendor dialects.'
      },
      {
        name: 'Async Queue Expiry Breakage',
        detail: 'Storing short-lived subject_token in Kafka/SQS fails 15 min later when a consumer wakes up. Validate synchronously at ingress or use scoped offline mandates.'
      }
    ]
  },

  {
    id: 'device-code',
    num: 7,
    accent: '#f97316',
    group: 'Browserless & Decoupled Devices',
    groupTag: 'ext',
    name: 'Device Authorization',
    shortName: 'Device Flow',
    grantType: 'urn:ietf:params:oauth:grant-type:device_code',
    rfc: 'RFC 8628 (OAuth 2.0 Device Authorization Grant)',
    userPresence: 'Interactive on Secondary Device (Pull via code / QR)',
    clientType: 'Public or Confidential',
    tokensIssued: 'Access Token, Refresh Token (if offline_access), ID Token (OIDC)',
    primaryUse: 'Smart TVs, gaming consoles, printers, conference screens, headless SSH CLIs.',
    art: 'assets/analogy-decoupled.jpg',
    artCaption: 'Smart TV Displays Code -> Smartphone Unlocks It',
    atAGlance:
      'A two-device login flow for screens with no real keyboard or browser (Smart TVs, SSH CLIs): the device displays a short pairing code / QR code that the user enters on their phone while the device quietly polls until login completes.',
    bridge:
      'What if the user is holding a TV remote or typing in an SSH terminal with no local browser? Let them PULL login onto their smartphone.',
    analogy:
      'Pairing Netflix on a new Smart TV. Typing a 24-character password and hardware MFA key with a TV remote is torture—so the TV shows "Go to auth.example.com/device and enter WDJB-MJHT." You scan the QR on your phone, log in effortlessly with FaceID, and 5 seconds later the TV unlocks automatically.',
    whenYes: [
      'Smart TVs, Apple TV, Roku, gaming consoles, printers, IoT kiosks.',
      'Headless / SSH / remote-container CLIs (gh auth login, az login --use-device-code) where no local browser can open.'
    ],
    whenNo: [
      'NEVER on laptops, phones, or web apps that DO have a local system browser (violates RFC 8252 and invites remote phishing—use Flow 1!).',
      'When the backend already knows the user’s identity and wants to PUSH an approval prompt (use Flow 8: CIBA).'
    ],
    interactiveLab: 'device-tv',
    modes: [
      { id: 'normal', label: 'Smart TV + Phone Pairing', type: 'normal' },
      { id: 'attack', label: 'Simulate Storm-2372 Phishing', type: 'attack' }
    ],
    actors: [
      { id: 'd', label: 'Smart TV / CLI', sub: 'Input-Constrained Device', icon: 'tv', color: '#38bdf8' },
      { id: 'as', label: 'Auth Server', sub: '/device_authorization', icon: 'as', color: '#10b981' },
      { id: 'u', label: 'User Smartphone', sub: 'Secondary Browser', icon: 'phone', color: '#a855f7' },
      { id: 'rs', label: 'Media API', sub: 'Resource Server', icon: 'rs', color: '#06b6d4' }
    ],
    attackActor: { id: 'att', label: 'Phishing Attacker', sub: 'Emails Genuine Code', icon: 'attacker', color: '#f43f5e' },
    scenarios: {
      normal: [
        {
          from: 'd', to: 'as', channel: 'back',
          short: 'POST /device_auth',
          title: 'Step 1 — Smart TV Requests Pairing Codes Over Back-Channel',
          beginner: 'The TV calls the Authorization Server asking for a secret polling handle (device_code) and a human-friendly short code (user_code).',
          expert: 'RFC 8628 §3.1: POST /oauth2/device_authorization with client_id and scope. AS returns device_code, unambiguous base-20 user_code (WDJB-MJHT), verification_uri, expires_in (600s), interval (5s).',
          packet: 'client_id + scope',
          wire: `POST /oauth2/device_authorization HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\n\nclient_id=living-room-tv-app&scope=openid%20media%3Astream%20offline_access\n\n--- RESPONSE 200 OK ---\n{\n  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",\n  "user_code": "WDJB-MJHT",\n  "verification_uri": "https://auth.example.com/device",\n  "verification_uri_complete": "https://auth.example.com/device?user_code=WDJB-MJHT",\n  "expires_in": 600,\n  "interval": 5\n}`
        },
        {
          from: 'd', to: 'as', channel: 'back',
          short: 'Poll: pending',
          title: 'Step 2 — TV Displays WDJB-MJHT & Polls /token Every 5 Seconds',
          beginner: 'While waiting for you to pick up your phone, the TV politely checks in every 5 seconds and receives "authorization_pending" (or "slow_down" -> add +5s!).',
          expert: 'RFC 8628 §3.4–3.5: Device polls grant_type=urn:ietf:params:oauth:grant-type:device_code. Must honor slow_down (+5s backoff), stop on access_denied or expired_token.',
          packet: '400 authorization_pending',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS&client_id=living-room-tv-app\n\n--- RESPONSE 400 Bad Request ---\n{"error": "authorization_pending", "error_description": "The user has not yet completed authorization."}`
        },
        {
          from: 'u', to: 'as', channel: 'oob',
          short: 'Phone Enters Code',
          title: 'Step 3 — User Visits URL on Smartphone, Logs In + MFA & Approves',
          beginner: 'You scan the QR or visit auth.example.com/device on your phone, confirm WDJB-MJHT, authenticate with FaceID/MFA, and tap Approve.',
          expert: 'Front-channel authentication occurs entirely on the high-capability secondary device; AS marks device_code as authorized.',
          packet: 'WDJB-MJHT + FaceID Approve',
          wire: `# On User's Smartphone Browser:\nGET https://auth.example.com/device?user_code=WDJB-MJHT\n# -> User verifies client name "Living Room TV" + clicks Confirm Approve`
        },
        {
          from: 'as', to: 'd', channel: 'back',
          short: '200 OK TV Unlocked!',
          title: 'Step 4 — Next Poll Succeeds! Smart TV Receives Tokens & Starts Streaming',
          beginner: 'Five seconds later, the TV’s next poll returns 200 OK with Access & Refresh tokens—your shows appear instantly!',
          expert: 'AS returns access_token + refresh_token (and optional id_token), and immediately invalidates device_code.',
          packet: 'access_token + RT',
          wire: `HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9.TV_MEDIA_AT.SIG",\n  "token_type": "Bearer",\n  "expires_in": 900,\n  "refresh_token": "rt_v2_device_4f8b2e1c9d0a7f3e6b5c1a8d2e4f9b0c",\n  "scope": "openid media:stream offline_access"\n}`
        }
      ],
      attack: [
        {
          from: 'att', to: 'as', channel: 'attack',
          short: 'Starts Device Flow',
          title: 'Phishing Step 1 — Attacker Initiates Genuine Device Code Flow',
          beginner: 'An attacker (like Storm-2372) runs /device_authorization on their own laptop and gets a 100% legitimate microsoft.com/devicelogin URL and user_code!',
          expert: 'Attacker holds device_code locally and begins silently polling /token waiting for a victim to type the code.',
          packet: 'Gets REAL user_code',
          wire: `POST /oauth2/device_authorization HTTP/1.1\n\nclient_id=microsoft-office-client&scope=Mail.Read%20offline_access\n# Attacker receives real user_code: "F8KL-9PQW"`
        },
        {
          from: 'att', to: 'u', channel: 'attack',
          short: 'Phishes Victim',
          title: 'Phishing Step 2 — Attacker Slacks/Emails Genuine URL + Code to Victim',
          beginner: 'The victim clicks a REAL microsoft.com/devicelogin link, enters F8KL-9PQW, and signs in—even a phishing-resistant Passkey/FIDO2 key succeeds because the domain really IS microsoft.com! Typing that code unknowingly approves the attacker’s waiting session.',
          expert: 'WebAuthn/FIDO2 cryptographically verifies origin === login.microsoftonline.com, which is 100% genuine—Device Code phishing hijacks cross-device session binding rather than spoofing the login domain!',
          packet: 'Genuine URL + F8KL-9PQW',
          wire: `# Phishing DM to Victim:\n"Hi Alice, please sign in at https://microsoft.com/devicelogin and enter code F8KL-9PQW to confirm your Q4 benefits."`
        },
        {
          from: 'as', to: 'att', channel: 'attack',
          shockwave: 'att',
          short: 'ATTACKER GETS TOKENS!',
          title: 'Phishing Step 3 — Attacker’s Poll Silently Receives Victim’s Tokens!',
          beginner: 'Seconds later, the attacker’s polling loop gets Alice’s full Access & Refresh tokens! MITIGATION: Block Device Code Flow globally via Conditional Access except on allowlisted TV/kiosk devices!',
          expert: 'Defense: Entra ID / Okta Conditional Access blocking Authentication Flows -> Device Code globally; require explicit device IP/geolocation confirmation on consent UI.',
          packet: 'STOLEN VICTIM TOKENS!',
          wire: `HTTP/1.1 200 OK\n{\n  "access_token": "STOLEN_ALICE_GRAPH_TOKEN",\n  "refresh_token": "STOLEN_ALICE_RT"\n}\n# MITIGATION: Block Device Flow globally via Conditional Access!`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'Device Access Token',
        header: { alg: 'RS256', typ: 'at+jwt', kid: 'as-key-2026' },
        payload: {
          iss: 'https://auth.example.com',
          sub: 'usr_9f82a1',
          aud: 'https://media.example.com',
          scope: 'media:stream',
          iat: 1795069260,
          exp: 1795070160
        }
      }
    ],
    threats: [
      {
        name: 'Remote Device Code Phishing (Storm-2372)',
        mechanism: 'Attacker emails a genuine devicelogin URL + user_code; even FIDO2 MFA succeeds because the domain is 100% real!',
        mitigation: 'Block Device Flow globally via Conditional Access except for explicitly allowlisted headless devices/networks; show requesting IP/location loudly; short expires_in (5–10m).'
      },
      {
        name: 'user_code Brute-Force Guessing',
        mechanism: 'Attackers script guesses of short numeric codes during active login windows.',
        mitigation: 'Use RFC 8628 §6.1 base-20 unambiguous consonants (BCDFGHJKLMNPQRSTVWXZ) at length 8 (20⁸ = 25.6 billion combos) + strict rate limits.'
      },
      {
        name: 'IoT Fleet Polling DoS',
        mechanism: 'Millions of TVs hammer /token every 500ms during live sports.',
        mitigation: 'Enforce interval ≥ 5s and return slow_down (+5s mandatory client backoff).'
      }
    ],
    pitfalls: [
      {
        name: 'Ignoring slow_down Backoff',
        detail: 'Hardcoding sleep(2) instead of adding +5s on slow_down gets TV fleets IP-banned by AS WAFs.'
      },
      {
        name: 'Auto-Approving verification_uri_complete on Page Load',
        detail: 'Scanning a QR code should pre-fill the code, NEVER auto-approve without an explicit human confirmation click showing the Client Name.'
      },
      {
        name: 'Using Device Flow in Desktop/Mobile Apps Out of Laziness',
        detail: 'If a local browser exists, RFC 8252 mandates Flow 1 (Auth Code + PKCE). Never expose laptops to Device Code phishing.'
      }
    ]
  },

  {
    id: 'ciba',
    num: 8,
    accent: '#84cc16',
    group: 'Browserless & Decoupled Devices',
    groupTag: 'ext',
    name: 'CIBA — Client-Initiated Backchannel Auth',
    shortName: 'CIBA (Push/Ping/Poll)',
    grantType: 'urn:openid:params:grant-type:ciba',
    rfc: 'OpenID Connect CIBA Core 1.0 · FAPI-CIBA · RFC 9396 RAR',
    userPresence: 'Decoupled on User’s Auth Device (Push Notification)',
    clientType: 'Confidential only',
    tokensIssued: 'Access Token, ID Token, optional Refresh Token',
    primaryUse: 'Call-center verification, POS payment terminals, Open Banking SCA (PSD2), voice/IoT assistants with known user ID.',
    art: 'assets/analogy-decoupled.jpg',
    artCaption: 'Bank Agent / POS Pushes Matching Code TXN-8492 to FaceID Phone',
    atAGlance:
      'A decoupled push-based flow where a server-side client that already knows who the user is triggers an out-of-band biometric approval directly on their smartphone—with zero browser, URL, or QR code.',
    bridge:
      'Flip the direction: when the system already knows who the user is (bank call center or POS terminal), PUSH a FaceID approval straight to their phone.',
    analogy:
      'Calling your bank’s telephone support line. You give the agent your customer ID (login_hint). Your banking app pings your smartphone: "Approve Agent #42? Confirm matching code: TXN-8492." You hear the agent read TXN-8492, approve with FaceID, and the agent’s screen unlocks automatically.',
    whenYes: [
      'Call-center customer verification before discussing private account details.',
      'Point-of-Sale (POS) retail / fuel-pump terminals and Open Banking PSD2 Strong Customer Authentication (SCA).',
      'Smart speakers or AI agents triggering high-stakes approval on a known user’s trusted smartphone.'
    ],
    whenNo: [
      'Standard web/mobile login where the user is sitting at their own browser (use Flow 1).',
      'Anonymous/public devices like hotel Smart TVs that don’t know login_hint (use Flow 7: Device Authorization).'
    ],
    interactiveLab: 'ciba-modes',
    modes: [
      { id: 'ping', label: 'Ping Mode (FAPI Best)', type: 'normal' },
      { id: 'poll', label: 'Poll Mode (Firewall-Safe)', type: 'alt' },
      { id: 'push', label: 'Push Mode (Banned in FAPI)', type: 'attack' }
    ],
    actors: [
      { id: 'c', label: 'POS / Call Center', sub: 'Confidential Client', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'OpenID Provider', sub: '/bc-authorize & /token', icon: 'as', color: '#10b981' },
      { id: 'ad', label: 'User Auth Device', sub: 'Mobile Banking App', icon: 'phone', color: '#a855f7' }
    ],
    scenarios: {
      ping: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /bc-authorize',
          title: 'Step 1 — Client Initiates Backchannel Auth with binding_message=TXN-8492',
          beginner: 'The POS/call-center backend authenticates strongly, gives Alice’s email (login_hint), invents a fresh visual code (TXN-8492), and supplies a one-time webhook secret (client_notification_token).',
          expert: 'POST /bc-authorize with private_key_jwt/mTLS, scope=openid payments:initiate, login_hint, binding_message=TXN-8492, requested_expiry=120, and fresh ≥128-bit client_notification_token.',
          packet: 'login_hint + TXN-8492',
          wire: `POST /oauth2/bc-authorize HTTP/1.1\nHost: auth.bank.example.com\nContent-Type: application/x-www-form-urlencoded\n\nscope=openid%20payments%3Ainitiate&login_hint=alice.chen%40example.com&binding_message=TXN-8492&requested_expiry=120&client_notification_token=cnt_8f2a9c4e1b7d0a3f6e5c2b9a4d8e1f0a&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=<SIGNED_JWT>\n\n--- RESPONSE 200 OK ---\n{"auth_req_id": "1c266114-a1be-4252-8ad1-04986c5b9ac1", "expires_in": 120, "interval": 5}`
        },
        {
          from: 'as', to: 'ad', channel: 'oob',
          short: 'Push FaceID [TXN-8492]',
          title: 'Step 2 — Bank Pushes Biometric Prompt Directly to Alice’s Phone',
          beginner: 'Alice’s phone lights up: "Approve $250 payment? Match code: TXN-8492." She sees TXN-8492 on the terminal, verifies it matches, and approves with FaceID.',
          expert: 'Out-of-band push to registered Authentication Device; dynamic linking via binding_message (+ RFC 9396 authorization_details) defeats MFA push fatigue.',
          packet: 'Push Alert [TXN-8492]',
          wire: `# Mobile Banking App Push Notification:\n"Approve $250.00 payment at Merchant POS?\nVerify matching code on terminal: TXN-8492"\n[ FaceID Approve ]   [ Deny ]`
        },
        {
          from: 'ad', to: 'as', channel: 'oob',
          short: 'Signed FaceID Approval',
          title: 'Step 3 — Mobile App Sends Cryptographic Biometric Approval to Bank Auth Server (OP)',
          beginner: 'Alice’s phone signs her FaceID confirmation using its built-in hardware security chip and sends it back to the bank’s Authorization Server (called an OpenID Provider, or OP).',
          expert: 'Hardware-backed biometric assertion fulfills PSD2 Strong Customer Authentication (amr: ["hwk", "face", "mfa"]).',
          packet: 'Signed Approval [hwk+face]',
          wire: `# Auth Device -> Bank OP:\n{"auth_req_id": "1c266114-a1be-4252-8ad1-04986c5b9ac1", "decision": "approve", "amr": ["hwk", "face", "mfa"]}`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: 'PING Webhook (ID Only!)',
          title: 'Step 4 (Ping Mode) — Bank Sends Lightweight Ping Containing ONLY auth_req_id',
          beginner: 'No polling waste AND no tokens exposed on an inbound webhook! The bank simply taps the POS on the shoulder saying "auth_req_id is ready—come pick up the tokens."',
          expert: 'Ping webhook sends Authorization: Bearer <client_notification_token> with ONLY {"auth_req_id": "..."}. Client verifies token in constant time and replies 204 No Content.',
          packet: 'Ping: {auth_req_id only}',
          wire: `POST /ciba/callback HTTP/1.1\nHost: pos-backend.merchant.example.com\nAuthorization: Bearer cnt_8f2a9c4e1b7d0a3f6e5c2b9a4d8e1f0a\nContent-Type: application/json\n\n{\n  "auth_req_id": "1c266114-a1be-4252-8ad1-04986c5b9ac1"\n}`
        },
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /token -> 200 OK',
          title: 'Step 5 — Client Authenticates via private_key_jwt & Fetches Tokens!',
          beginner: 'The POS backend calls the bank’s private /token vault window with its cryptographic key and receives Alice’s Access Token + ID Token.',
          expert: 'POST /token with grant_type=urn:openid:params:grant-type:ciba, auth_req_id, and private_key_jwt/mTLS -> 200 OK (FAPI-CIBA compliant!).',
          packet: 'access_token + id_token',
          wire: `POST /oauth2/token HTTP/1.1\nHost: auth.bank.example.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn%3Aopenid%3Aparams%3Agrant-type%3Aciba&auth_req_id=1c266114-a1be-4252-8ad1-04986c5b9ac1&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=<SIGNED_JWT>`
        }
      ],
      poll: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /bc-authorize',
          title: 'Poll Mode Step 1 — Initiate Backchannel Auth (No Webhook Needed!)',
          beginner: 'Great for clients behind strict corporate firewalls: omit client_notification_token and simply get auth_req_id back.',
          expert: 'POST /bc-authorize without client_notification_token -> returns auth_req_id, expires_in=120, interval=5.',
          packet: 'login_hint + TXN-8492',
          wire: `POST /oauth2/bc-authorize HTTP/1.1\nHost: auth.bank.example.com\n\nscope=openid%20payments%3Ainitiate&login_hint=alice.chen%40example.com&binding_message=TXN-8492`
        },
        {
          from: 'as', to: 'ad', channel: 'oob',
          short: 'Push FaceID [TXN-8492]',
          title: 'Poll Mode Step 2 — User Approves on Smartphone While Client Polls /token',
          beginner: 'While Alice checks TXN-8492 and taps FaceID, the POS polls /token every 5 seconds receiving authorization_pending.',
          expert: 'Polling follows RFC 8628 semantics: authorization_pending, slow_down (+5s), expired_token, access_denied.',
          packet: 'Polling + FaceID Approve',
          wire: `POST /oauth2/token HTTP/1.1\n\ngrant_type=urn%3Aopenid%3Aparams%3Agrant-type%3Aciba&auth_req_id=1c266114-a1be-4252-8ad1-04986c5b9ac1\n# -> 400 authorization_pending until Alice taps Approve`
        },
        {
          from: 'as', to: 'c', channel: 'back',
          short: '200 OK Tokens',
          title: 'Poll Mode Step 3 — Next Poll Succeeds & Delivers Tokens Over Client-Initiated TLS',
          beginner: 'Zero inbound firewall ports required, and tokens stay strictly on the client-initiated encrypted connection (FAPI-CIBA Approved!).',
          expert: '200 OK returns access_token + id_token with urn:openid:params:jwt:claim:auth_req_id.',
          packet: 'access_token + id_token',
          wire: `HTTP/1.1 200 OK\n{\n  "access_token": "eyJhbGciOiJQUzI1NiIsInR5cCI6ImF0K2p3dCJ9.BANK_AT.SIG",\n  "token_type": "Bearer",\n  "expires_in": 300,\n  "id_token": "eyJhbGciOiJQUzI1NiIsInR5cCI6IkpXVCJ9.BANK_IDT.SIG"\n}`
        }
      ],
      push: [
        {
          from: 'c', to: 'as', channel: 'back',
          short: 'POST /bc-authorize',
          title: 'Push Mode Step 1 — Client Registers client_notification_token',
          beginner: 'Same start as Ping Mode—POS displays TXN-8492 and waits for Alice’s phone approval.',
          expert: 'Client sends fresh client_notification_token in /bc-authorize.',
          packet: 'login_hint + cnt_token',
          wire: `POST /oauth2/bc-authorize HTTP/1.1\n\nscope=openid%20payments%3Ainitiate&login_hint=alice.chen%40example.com&binding_message=TXN-8492&client_notification_token=cnt_8f2a9c4e...`
        },
        {
          from: 'as', to: 'ad', channel: 'oob',
          short: 'FaceID Approved',
          title: 'Push Mode Step 2 — Alice Approves Prompt on Smartphone',
          beginner: 'Alice matches TXN-8492 and taps FaceID Approve.',
          expert: 'OP generates access_token and id_token (including mandatory auth_req_id / at_hash claims per CIBA Core §10.3.1).',
          packet: 'FaceID Approval',
          wire: `# Alice approves auth_req_id 1c266114-a1be-4252-8ad1-04986c5b9ac1`
        },
        {
          from: 'as', to: 'c', channel: 'attack',
          shockwave: 'c',
          short: 'PUSHES RAW TOKENS! (Risk)',
          title: 'Push Mode Step 3 — OP Pushes Raw Tokens Directly Over Inbound Webhook!',
          beginner: 'No /token call at all! Because raw tokens are pushed straight into the client’s public callback URL relying only on a bearer webhook token, FAPI-CIBA BANS Push Mode for high-security banking—prefer Ping or Poll!',
          expert: 'Push Mode delivers access_token & id_token directly in POST /ciba/callback; prohibited in FAPI-CIBA due to lack of client authentication at token delivery.',
          packet: 'RAW TOKENS ON WEBHOOK!',
          wire: `POST /ciba/callback HTTP/1.1\nHost: pos-backend.merchant.example.com\nAuthorization: Bearer cnt_8f2a9c4e1b7d0a3f6e5c2b9a4d8e1f0a\nContent-Type: application/json\n\n{\n  "auth_req_id": "1c266114-a1be-4252-8ad1-04986c5b9ac1",\n  "access_token": "eyJhbGciOiJQUzI1NiIsInR5cCI6ImF0K2p3dCJ9.RAW_AT.SIG",\n  "token_type": "Bearer",\n  "expires_in": 300,\n  "id_token": "eyJhbGciOiJQUzI1NiIsInR5cCI6IkpXVCJ9.RAW_IDT.SIG"\n}`
        }
      ]
    },
    xrayArtifacts: [
      {
        label: 'CIBA ID Token (SCA + auth_req_id)',
        header: { alg: 'PS256', typ: 'JWT', kid: 'bank-as-2026' },
        payload: {
          iss: 'https://auth.bank.example.com',
          sub: 'usr_alice_9f82a1',
          aud: 'pos-terminal-backend',
          exp: 1795069526,
          iat: 1795069226,
          auth_time: 1795069224,
          acr: 'urn:openid:policies:sca',
          amr: ['hwk', 'face', 'mfa'],
          'urn:openid:params:jwt:claim:auth_req_id': '1c266114-a1be-4252-8ad1-04986c5b9ac1'
        }
      }
    ],
    threats: [
      {
        name: 'MFA Push Fatigue / Session Unbinding',
        mechanism: 'Attacker spams CIBA push notifications to a victim’s phone hoping they blindly tap Approve.',
        mitigation: 'Require a fresh visual binding_message shown on BOTH devices (TXN-8492), optional user_code PIN, Rich Authorization Requests (RFC 9396 RAR showing exact amount & payee), and strict per-user rate limits.'
      },
      {
        name: 'Spoofed Ping/Push Webhook Injection',
        mechanism: 'Attacker POSTs forged callbacks to client_notification_endpoint.',
        mitigation: 'Mint a fresh single-use ≥128-bit client_notification_token per request, verify in constant time, and prefer Ping over Push.'
      },
      {
        name: 'User Enumeration via login_hint',
        mechanism: 'Probing /bc-authorize with candidate emails to detect valid bank accounts via unknown_user_id.',
        mitigation: 'Require strong confidential client authentication (mTLS / private_key_jwt + signed JAR) and velocity throttling.'
      }
    ],
    pitfalls: [
      {
        name: 'Static binding_message ("Please Approve Login")',
        detail: 'Completely breaks visual correlation and fails PSD2 SCA dynamic-linking audits. Always generate a fresh per-transaction visual code.'
      },
      {
        name: 'Using Push Mode in Regulated / Financial Systems',
        detail: 'Push Mode sends raw bearer tokens over inbound callbacks and is disallowed in FAPI-CIBA. Default to Ping Mode (scalable) or Poll Mode (firewall-friendly).'
      },
      {
        name: 'Reusing client_notification_token Across Transactions',
        detail: 'Mint a brand-new UUID/256-bit token per /bc-authorize call and discard it immediately upon callback.'
      }
    ]
  }
];
