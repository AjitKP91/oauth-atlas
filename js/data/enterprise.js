// ==========================================================================
// OAUTH ATLAS — Enterprise Vendor Wrappers & Multi-Hop Deep-Dives
// ==========================================================================

export const VENDOR_MAPPINGS = [
  {
    vendor: 'SAP BTP',
    profile: 'OAuth2ClientCredentials',
    rfc: 'RFC 6749 §4.4 (client_credentials)',
    flowId: 'client-credentials',
    mechanics: 'Pure server-to-server token fetch with no human user; authenticates via client secret, mutual TLS certificate (client_x509), or private_key_jwt configured on the BTP Destination.'
  },
  {
    vendor: 'SAP BTP',
    profile: 'OAuth2UserTokenExchange',
    rfc: 'RFC 8693 (token-exchange) / Legacy XSUAA user_token',
    flowId: 'token-exchange',
    mechanics: 'Swaps an incoming logged-in user’s JWT for a downstream API token while keeping her identity intact. Modern SAP Cloud Identity Services (IAS) uses standard RFC 8693 token-exchange; legacy XSUAA chained grant_type=user_token + refresh_token.'
  },
  {
    vendor: 'SAP BTP',
    profile: 'OAuth2SAMLBearerAssertion',
    rfc: 'RFC 7522 (saml2-bearer)',
    flowId: 'saml2-bearer',
    mechanics: 'Bridges modern cloud apps to SAP ERP: BTP Destination Service takes the user’s cloud JWT, dynamically mints & XML-signs a SAML 2.0 Assertion with the subaccount key, and runs RFC 7522 against S/4HANA, SuccessFactors, or Ariba.'
  },
  {
    vendor: 'SAP BTP',
    profile: 'OAuth2JWTBearer',
    rfc: 'RFC 7523 §2.1 (jwt-bearer)',
    flowId: 'jwt-bearer',
    mechanics: 'Submits an incoming Identity Provider or BTP user JWT directly as the assertion parameter in an RFC 7523 §2.1 grant to a downstream Authorization Server that trusts the issuer’s JWKS.'
  },
  {
    vendor: 'SAP BTP',
    profile: 'OAuth2RefreshToken',
    rfc: 'RFC 6749 §6 (refresh_token)',
    flowId: 'refresh-token',
    mechanics: 'Holds an initial pre-consented refresh token inside BTP Destination Service and silently renews short-lived access tokens in the background without user re-login.'
  },
  {
    vendor: 'SAP BTP',
    profile: 'OAuth2TechnicalUserPropagation',
    rfc: 'RFC 7523 §2.1 (jwt-bearer) / IAS Technical Exchange',
    flowId: 'jwt-bearer',
    mechanics: 'Propagates a machine/technical caller’s identity across BTP services (unlike OAuth2UserTokenExchange, which requires a human user), preserving the calling tenant and technical principal.'
  },
  {
    vendor: 'Microsoft Entra ID',
    profile: 'On-Behalf-Of (OBO) Flow',
    rfc: 'Goal: RFC 8693 | Wire: RFC 7523 §2.1 (jwt-bearer)',
    flowId: 'token-exchange',
    mechanics: 'Achieves microservice user delegation just like RFC 8693, but on the HTTP wire sends grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer + assertion=<Token_A> + requested_token_use=on_behalf_of.'
  },
  {
    vendor: 'Microsoft Entra ID',
    profile: 'Client Credentials + Certificate / Federated Identity',
    rfc: 'RFC 6749 §4.4 + RFC 7523 §2.2 (client_assertion)',
    flowId: 'client-credentials',
    mechanics: 'Machine-to-machine grant_type=client_credentials without static secrets—authenticates via client_assertion_type=jwt-bearer using either an X.509 certificate JWT (x5t) or an external GitHub Actions / Kubernetes OIDC JWT.'
  },
  {
    vendor: 'Salesforce',
    profile: 'OAuth 2.0 JWT Bearer Flow',
    rfc: 'RFC 7523 §2.1 (jwt-bearer)',
    flowId: 'jwt-bearer',
    mechanics: 'Headless server-to-server integration acting as an admin pre-authorized Salesforce user; the Connected App verifies the RSA signature against an uploaded X.509 certificate (aud=https://login.salesforce.com).'
  },
  {
    vendor: 'Salesforce',
    profile: 'OAuth 2.0 SAML Bearer Assertion Flow',
    rfc: 'RFC 7522 (saml2-bearer)',
    flowId: 'saml2-bearer',
    mechanics: 'Trades an enterprise Identity Provider’s signed SAML 2.0 XML Assertion for a Salesforce REST/SOAP API access token at POST /services/oauth2/token.'
  },
  {
    vendor: 'Salesforce',
    profile: 'OAuth 2.0 Asset Token Flow',
    rfc: 'RFC 8693 (token-exchange)',
    flowId: 'token-exchange',
    mechanics: 'Connected-product / IoT wrapper that exchanges a user’s subject_token plus a device-signed actor_token for a scoped Salesforce Asset Token (urn:salesforce:params:oauth:token-type:asset-token).'
  },
  {
    vendor: 'Google Cloud',
    profile: 'Service Account 2-Legged OAuth',
    rfc: 'RFC 7523 §2.1 (jwt-bearer)',
    flowId: 'jwt-bearer',
    mechanics: 'Backend workload signs a short-lived JWT locally with its Service Account RSA key (aud=https://oauth2.googleapis.com/token, plus optional sub for Workspace Domain-Wide Delegation) to obtain a Google access token.'
  },
  {
    vendor: 'Google Cloud',
    profile: 'Workload Identity Federation (Google STS)',
    rfc: 'RFC 8693 (token-exchange)',
    flowId: 'token-exchange',
    mechanics: 'Zero-secret cloud federation: POST https://sts.googleapis.com/v1/token natively swaps an AWS, Azure, GitHub Actions, or Kubernetes OIDC/SAML subject_token for a short-lived GCP token.'
  },
  {
    vendor: 'AWS',
    profile: 'STS AssumeRoleWithWebIdentity & AssumeRoleWithSAML',
    rfc: 'Semantic: RFC 8693 / 7523 / 7522 | Wire: AWS STS API',
    flowId: 'token-exchange',
    mechanics: 'Swaps an external OIDC JWT or SAML assertion for temporary AWS SigV4 credentials (AccessKeyId, SecretAccessKey, SessionToken) valid from 15 min up to the IAM Role’s MaxSessionDuration (up to 12 hours).'
  },
  {
    vendor: 'MuleSoft',
    profile: 'Anypoint OAuth 2.0 Enforcement & Connector Profiles',
    rfc: 'RS Enforcement (RFC 7662 / 9068) + Client Grants',
    flowId: 'client-credentials',
    mechanics: 'Gateway Resource Server policies validate incoming JWTs (via JWKS) or opaque tokens (via RFC 7662 introspection) from Entra, Okta, or PingFederate, while outbound Mule connectors automate token caching & refresh.'
  }
];

export const ENTERPRISE_DEEPDIVES = [
  {
    id: 'sap-saml',
    title: 'SAP BTP OAuth2SAMLBearerAssertion',
    subtitle: 'Principal Propagation into S/4HANA ERP',
    problem:
      'Alice logs into a modern SAP BTP web app using OIDC (Flow 1). When she clicks "Create Sales Order", the cloud backend must call SAP S/4HANA strictly AS Alice (ERP user ACHEN)—so her personal permissions and audit trail apply—without the app developer ever touching XML or SAML keys.',
    actors: [
      { id: 'u', label: 'Alice', sub: 'Browser UI', icon: 'user', color: '#f59e0b' },
      { id: 'app', label: 'BTP App A', sub: 'AppRouter + CAP', icon: 'client', color: '#38bdf8' },
      { id: 'dest', label: 'BTP Destination', sub: 'Subaccount SAML Key', icon: 'vault', color: '#a855f7' },
      { id: 's4as', label: 'S/4HANA OAuth', sub: '/sap/bc/sec/oauth2', icon: 'as', color: '#10b981' },
      { id: 's4api', label: 'S/4HANA OData', sub: 'ABAP Context ACHEN', icon: 'rs', color: '#06b6d4' }
    ],
    steps: [
      {
        from: 'u', to: 'app', channel: 'front',
        short: 'OIDC Session',
        title: 'Step 1 — Alice Triggers an Action in BTP App A',
        beginner: 'Alice is already signed into the cloud portal. Her browser sends only a secure session cookie, and the portal gateway (AppRouter) attaches her cloud identity token (JWT) for the backend app.',
        expert: 'SAP AppRouter (BFF) validates Alice’s HttpOnly session cookie and forwards her SAP IAS / XSUAA User JWT in Authorization: Bearer to the CAP/Node/Java backend.',
        packet: 'Alice_BTP_JWT',
        wire: `GET /sales-orders HTTP/1.1\nHost: portal.cfapps.eu10.hana.ondemand.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiJ9.ALICE_IAS_JWT.SIG`
      },
      {
        from: 'app', to: 'dest', channel: 'back',
        short: 'Request Destination',
        title: 'Step 2 — App A Hands Alice’s JWT to BTP Destination Service',
        beginner: 'App A asks SAP’s managed Destination Service for connection credentials to "S4HANA_PROD", passing Alice’s cloud token along. App A itself holds zero SAML keys!',
        expert: 'SAP Cloud SDK calls Destination Configuration API authenticating as the BTP app while passing Alice’s incoming user JWT in the X-user-token header.',
        packet: 'X-user-token: Alice',
        wire: `GET /destination-configuration/v1/destinations/S4HANA_PROD HTTP/1.1\nHost: destination-configuration.cfapps.eu10.hana.ondemand.com\nAuthorization: Bearer <BTP_DEST_SERVICE_TOKEN>\nX-user-token: eyJhbGciOiJSUzI1NiJ9.ALICE_IAS_JWT.SIG`
      },
      {
        from: 'dest', to: 'dest', channel: 'local',
        short: 'Mint SAML XML',
        title: 'Step 3 — Destination Service Dynamically Signs a SAML 2.0 Assertion',
        beginner: 'Behind the scenes, Destination Service reads Alice’s email from her cloud JWT and stamps a fresh SAML 2.0 XML passport signed with the BTP subaccount’s private key.',
        expert: 'Destination Service validates X-user-token, extracts userIdSource (alice.chen@corp.com) into <saml:NameID>, and XMLDSig-signs a <saml:Assertion> using the subaccount X.509 key (pre-trusted in S/4HANA t-code SAML2).',
        packet: 'Signed <saml:Assertion>',
        wire: `<saml:Assertion ID="_btp_8f2a9c" Version="2.0">\n  <saml:Issuer>https://subaccount.hana.ondemand.com</saml:Issuer>\n  <ds:Signature><!-- Signed by BTP Subaccount X.509 Key --></ds:Signature>\n  <saml:Subject>\n    <saml:NameID Format="...emailAddress">alice.chen@corp.com</saml:NameID>\n  </saml:Subject>\n</saml:Assertion>`
      },
      {
        from: 'dest', to: 's4as', channel: 'back',
        short: 'RFC 7522 Exchange',
        title: 'Step 4 — Back-Channel SAML 2.0 Bearer Exchange at S/4HANA (Flow 5)',
        beginner: 'Destination Service sends that signed XML passport to S/4HANA’s OAuth token desk. S/4HANA verifies the signature and maps alice.chen@corp.com to her internal ERP username ACHEN.',
        expert: 'POST /sap/bc/sec/oauth2/token with grant_type=urn:ietf:params:oauth:grant-type:saml2-bearer (RFC 7522). S/4HANA validates XMLDSig, Audience, and Recipient, then resolves ABAP user ACHEN via table USREXTID.',
        packet: 'grant_type=saml2-bearer',
        wire: `POST /sap/bc/sec/oauth2/token HTTP/1.1\nHost: erp.corp.example.com\nAuthorization: Basic YnRwLWNsaWVudDpzZWNyZXQ=\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Asaml2-bearer&assertion=PHNhbWw6QXNzZXJ0aW9uLi4u&scope=API_SALES_ORDER_SRV_0001`
      },
      {
        from: 's4as', to: 'dest', channel: 'back',
        short: 'S/4 Token Cached',
        title: 'Step 5 — S/4HANA Issues User-Scoped OAuth Token (Cached & Returned to App A)',
        beginner: 'S/4HANA returns a standard OAuth Access Token for ACHEN. Destination Service caches it strictly for Alice (never shared across users!) and hands it back to App A.',
        expert: 'Destination Service caches the S/4HANA access_token partitioned by (Subaccount, Destination, User) until shortly before expires_in and returns authTokens[0].value to App A.',
        packet: 'S4_OAUTH_TOKEN (ACHEN)',
        wire: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiJ9.SUB_ACHEN_S4_TOKEN.SIG",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "API_SALES_ORDER_SRV_0001"\n}`
      },
      {
        from: 'app', to: 's4api', channel: 'back',
        short: 'ABAP OData Call',
        title: 'Step 6 — App A Calls S/4HANA REST/OData API Under Alice’s ERP Permissions',
        beginner: 'App A makes a clean, modern HTTP call with that Bearer token. S/4HANA runs the Sales Order inside Alice’s exact ERP permissions and records ACHEN in the audit log!',
        expert: 'S/4HANA OData gateway enforces Alice’s ABAP authorization objects (e.g., V_VBAK_VKO sales orgs, S_TABU_DIS) and stamps sy-uname = ACHEN on created documents.',
        packet: 'Bearer S4_OAUTH_TOKEN',
        wire: `POST /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder HTTP/1.1\nHost: erp.corp.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiJ9.SUB_ACHEN_S4_TOKEN.SIG\n\n{"SalesOrderType":"OR","SoldToParty":"10100001"}`
      }
    ],
    gotchas: [
      'audience vs. tokenServiceURL: The Destination’s audience property MUST match S/4HANA’s exact Local Provider Name (configured in transaction SAML2), whereas Recipient is set automatically to tokenServiceURL.',
      'User Mapping Mismatch (USREXTID): Ensure the attribute placed in SAML NameID (email vs. login_name) matches how users are mapped in S/4HANA transaction SAML2 / table USREXTID.',
      'Cloud Connector Distinction: When routing over an on-premise SAP Cloud Connector with PrincipalPropagation, the connector mints a short-lived X.509 client certificate for Alice rather than running RFC 7522 OAuth!'
    ]
  },
  {
    id: 'entra-obo-vs-sap',
    title: 'Microsoft Entra ID OBO vs. SAP BTP UserTokenExchange',
    subtitle: 'Same Microservice Goal, Two Different Wire Protocols',
    problem:
      'A frontend app calls Middle-Tier API A with Alice’s token (addressed only to API A). API A now needs a brand-new token to call Microsoft Graph or BTP Service B on Alice’s behalf. Both platforms solve microservice delegation—yet send completely different parameters on the HTTP wire!',
    actors: [
      { id: 'spa', label: 'SPA / Frontend', sub: 'User Alice', icon: 'user', color: '#f59e0b' },
      { id: 'apia', label: 'Middle-Tier API A', sub: 'Confidential Client', icon: 'client', color: '#38bdf8' },
      { id: 'as', label: 'Entra ID / SAP IAS', sub: 'Authorization Server', icon: 'as', color: '#10b981' },
      { id: 'apib', label: 'Graph / BTP API B', sub: 'Downstream RS', icon: 'rs', color: '#a855f7' }
    ],
    steps: [
      {
        from: 'spa', to: 'apia', channel: 'front',
        short: 'Incoming Token_A',
        title: 'Step 1 — Frontend Calls Middle-Tier API A with Token_A',
        beginner: 'Alice’s frontend calls API A carrying Token_A, which is stamped "Valid ONLY for API A". Because API B would rightly reject a token addressed to API A, API A must trade it for a new one.',
        expert: 'Token_A carries aud=api://middle-tier-a. API A verifies signature, exp, and aud, and refuses to forward Token_A raw (preventing Confused Deputy lateral replay).',
        packet: 'Token_A [aud=API_A]',
        wire: `GET /dashboard HTTP/1.1\nHost: api-a.corp.example.com\nAuthorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.AUD_API_A_SUB_ALICE.SIG`
      },
      {
        from: 'apia', to: 'as', channel: 'back',
        short: 'OBO / Exchange',
        title: 'Step 2 — API A Trades Token_A at the Auth Server (Compare the Wire!)',
        beginner: 'API A proves its own server identity, hands over Alice’s Token_A, and asks for a Calendar token for API B. Under the hood, Microsoft Entra uses a Flow 4 (JWT Bearer) dialect, whereas SAP IAS uses standard Flow 6 (Token Exchange)!',
        expert: 'Entra ID OBO uses RFC 7523 grant_type=jwt-bearer + requested_token_use=on_behalf_of (sending client_assertion for API A + assertion=Token_A). SAP Cloud Identity Services (IAS) uses native RFC 8693 grant_type=token-exchange + subject_token.',
        packet: 'OBO (7523) / Exchange (8693)',
        wire: `# --- MICROSOFT ENTRA ID OBO (RFC 7523 Wire Dialect) ---\nPOST /<tenant-id>/oauth2/v2.0/token HTTP/1.1\nHost: login.microsoftonline.com\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer\n&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer\n&client_assertion=<API_A_SIGNED_JWT>\n&assertion=<INCOMING_TOKEN_A>\n&scope=https%3A%2F%2Fgraph.microsoft.com%2FCalendars.Read\n&requested_token_use=on_behalf_of\n\n# --- SAP BTP IAS OAuth2UserTokenExchange (RFC 8693 Native) ---\nPOST /oauth2/token HTTP/1.1\nHost: tenant-abc.accounts.ondemand.com\n\ngrant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange\n&subject_token=<INCOMING_USER_JWT>\n&subject_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Ajwt\n&requested_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aaccess_token\n&resource=urn%3Asap%3Aidentity%3Aapplication%3Aprovider%3Aname%3Aservice-b`
      },
      {
        from: 'as', to: 'apia', channel: 'back',
        short: 'Token_B Issued',
        title: 'Step 3 — Authorization Server Returns Narrowly Scoped Token_B',
        beginner: 'After confirming API A has permission to call API B on Alice’s behalf, the Authorization Server returns a fresh Token_B addressed strictly to API B.',
        expert: 'AS verifies pre-authorized delegation policy (Entra knownClientApplications / delegated permission grants; SAP IAS dependency target) and issues Token_B with aud=API_B.',
        packet: 'Token_B [aud=API_B]',
        wire: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiJ9.AUD_GRAPH_SUB_ALICE.SIG",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "Calendars.Read"\n}`
      },
      {
        from: 'apia', to: 'apib', channel: 'back',
        short: 'Call Downstream',
        title: 'Step 4 — API A Calls Microsoft Graph / BTP Service B as Alice',
        beginner: 'API A calls the downstream Calendar API with Token_B, caches Token_B safely for Alice’s current session, and returns her calendar data.',
        expert: 'Downstream RS validates aud === API_B and scope === Calendars.Read. API A caches Token_B keyed by SHA256(Token_A) + target scope.',
        packet: 'Bearer Token_B',
        wire: `GET /v1.0/me/calendar HTTP/1.1\nHost: graph.microsoft.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiJ9.AUD_GRAPH_SUB_ALICE.SIG`
      }
    ],
    gotchas: [
      'AADSTS65001 Consent Trap: Because OBO happens server-to-server with no browser, Entra cannot pop up a consent screen mid-call! Either grant Admin Consent to API A or list the frontend app in API A’s knownClientApplications manifest.',
      'Conditional Access Step-Up MFA: If downstream API B requires fresh MFA, Entra returns interaction_required + a claims challenge—API A must propagate WWW-Authenticate back to the frontend to trigger interactive step-up.',
      'Legacy SAP XSUAA vs. Modern IAS: Older Cloud Foundry XSUAA destinations used a proprietary grant_type=user_token + refresh_token two-step dance; modern SAP IAS standardized on single-hop RFC 8693.'
    ]
  },
  {
    id: 'cloud-wif',
    title: 'Zero-Secret Cloud Federation (GCP WIF & AWS STS)',
    subtitle: 'Replacing Long-Lived Cloud API Keys with Ephemeral Tokens',
    problem:
      'A GitHub Actions build pipeline or Kubernetes Pod needs to deploy to Google Cloud or AWS. Storing static cloud secret keys in CI variables is a top breach vector—Workload Identity Federation eliminates stored secrets completely.',
    actors: [
      { id: 'ci', label: 'GitHub / K8s Pod', sub: 'Workload Runtime', icon: 'client', color: '#38bdf8' },
      { id: 'oidc', label: 'Workload OIDC IdP', sub: 'GitHub / EKS Issuer', icon: 'vault', color: '#a855f7' },
      { id: 'sts', label: 'GCP STS / AWS STS', sub: 'Token Exchange Engine', icon: 'as', color: '#10b981' },
      { id: 'cloud', label: 'Cloud APIs', sub: 'GCP IAM / AWS S3', icon: 'rs', color: '#06b6d4' }
    ],
    steps: [
      {
        from: 'ci', to: 'oidc', channel: 'back',
        short: 'Mint OIDC JWT',
        title: 'Step 1 — CI Runner / Pod Requests a Short-Lived Identity Badge (OIDC JWT)',
        beginner: 'When your deployment job starts, GitHub Actions (or Kubernetes) automatically gives the job a 5-minute signed digital badge proving which exact repository and branch is running.',
        expert: 'Workload queries local OIDC runtime endpoint (ACTIONS_ID_TOKEN_REQUEST_URL or K8s TokenRequest API) to mint an asymmetric JWT asserting iss, sub (repo + ref), and target cloud aud.',
        packet: 'OIDC JWT [repo:org/payments]',
        wire: `{\n  "iss": "https://token.actions.githubusercontent.com",\n  "sub": "repo:org/payments:ref:refs/heads/main",\n  "aud": "https://iam.googleapis.com/projects/123/.../gh-oidc",\n  "exp": 1795069500\n}`
      },
      {
        from: 'ci', to: 'sts', channel: 'back',
        short: 'STS Exchange',
        title: 'Step 2 — Swap Workload JWT at Google STS (RFC 8693) or AWS STS',
        beginner: 'The build runner hands that GitHub badge to Google Cloud or AWS. Because the cloud account was configured to trust GitHub’s public keys for your main branch, no secret password is needed!',
        expert: 'Google Cloud STS implements native RFC 8693 grant_type=token-exchange; AWS STS exposes the semantically identical Action=AssumeRoleWithWebIdentity endpoint.',
        packet: 'subject_token / WebIdentityToken',
        wire: `# --- GOOGLE CLOUD WIF (Native RFC 8693) ---\nPOST /v1/token HTTP/1.1\nHost: sts.googleapis.com\nContent-Type: application/json\n\n{\n  "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",\n  "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",\n  "requested_token_type": "urn:ietf:params:oauth:token-type:access_token",\n  "audience": "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/github/providers/gh-oidc",\n  "subject_token": "<GITHUB_OIDC_JWT>"\n}\n\n# --- AWS STS (Semantic Equivalent -> SigV4 Credentials) ---\nPOST / HTTP/1.1\nHost: sts.amazonaws.com\nContent-Type: application/x-www-form-urlencoded\n\nAction=AssumeRoleWithWebIdentity&Version=2011-06-15&RoleArn=arn:aws:iam::123456789012:role/deploy-prod&RoleSessionName=gh-deploy&WebIdentityToken=<GITHUB_OIDC_JWT>`
      },
      {
        from: 'sts', to: 'ci', channel: 'back',
        short: 'Ephemeral Creds',
        title: 'Step 3 — Cloud STS Issues Temporary Deployment Credentials',
        beginner: 'Google Cloud or AWS verifies the repository & branch claims and returns short-lived deployment credentials that self-destruct automatically within an hour.',
        expert: 'GCP STS returns a federated OAuth access_token (optionally exchanged for a Service Account token); AWS STS returns temporary SigV4 keys (15 min up to the role’s MaxSessionDuration, max 12h, default 1h).',
        packet: 'Short-Lived Cloud Token / SigV4',
        wire: `HTTP/1.1 200 OK\n\n{\n  "access_token": "ya29.c.c0AY_VpZ_FEDERATED_SHORT_LIVED",\n  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",\n  "token_type": "Bearer",\n  "expires_in": 3600\n}`
      },
      {
        from: 'ci', to: 'cloud', channel: 'back',
        short: 'Deploy Safely',
        title: 'Step 4 — Workload Deploys With Zero Stored Long-Lived Secrets',
        beginner: 'The job deploys cleanly. Zero static secrets were ever stored in GitHub or Kubernetes—and even if a build log leaked tomorrow, the temporary token is already expired!',
        expert: 'Cloud IAM audit logs (Cloud Audit Logs / CloudTrail) record both the assumed role AND the exact originating GitHub workflow/commit principal.',
        packet: 'Scoped Deploy Request',
        wire: `POST /v1/projects/prod-123/locations/us-central1/services HTTP/1.1\nAuthorization: Bearer ya29.c.c0AY_VpZ_FEDERATED_SHORT_LIVED`
      }
    ],
    gotchas: [
      'Attribute Condition Lock-Down (#1 WIF Vulnerability!): Always restrict trust conditions to your exact org/repo AND protected branch (sub == repo:org/payments:ref:refs/heads/main)—otherwise any untrusted fork PR or other GitHub customer could assume your production role!',
      'Bearer Token vs. AWS SigV4 Output: Google Cloud WIF outputs standard OAuth 2.0 Bearer tokens, whereas AWS STS AssumeRoleWithWebIdentity outputs temporary AWS AccessKeyId + SecretAccessKey + SessionToken used to sign requests with SigV4.'
    ]
  }
];
