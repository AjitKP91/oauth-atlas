# OAuth Atlas — Interactive OAuth 2.0 / 2.1 Protocol Observatory

**Live Site:** https://ajitkp91.github.io/oauth-atlas/

An interactive, visual architectural reference that demystifies OAuth 2.0 and OAuth 2.1—from everyday mental models up to wire-level HTTP exchanges, RFC specifications, and real-world enterprise clouds.

## What's Inside

- **Chapter 1 · First Principles:** The Valet Key mental model, the 4 OAuth roles, Front-Channel vs. Back-Channel, and Identity (OIDC Passport) vs. Permission (OAuth Keycard).
- **8 Animated Grant Flows (4 Switchable Diagram Views):**
  - Switch live from the header between **Trust Zones**, **Crypto Ledger**, **User + Wire POV**, and **Sequence Ladder**.
  - Toggle depth between **Beginner**, **Both**, and **Architect** lenses at any time.
  - Covers Authorization Code + PKCE, Client Credentials, Refresh Token Rotation & Reuse Detection, JWT Bearer, SAML 2.0 Bearer, Token Exchange (`act` delegation vs. impersonation), Device Authorization, and CIBA (Ping / Poll / Push).
- **8 Hands-On Interactive Labs:** Real Web Crypto `SHA-256` PKCE forge, M2M Token Cache simulator, 3-Tab Refresh Token Rotation race simulator, Redis `jti` replay guard, SAML XML Signature Wrapping (XSW) inspector, nested RFC 8693 `act` chain builder, Smart TV Device Flow loop, and CIBA `binding_message` simulator.
- **Enterprise Protocol Rosetta Stone & Multi-Hop Deep-Dives:** 15 vendor profile mappings across SAP BTP, Microsoft Entra ID, Salesforce, Google Cloud, AWS, and MuleSoft, plus animated multi-hop walkthroughs.
- **Mastery Toolkit:** 30-second interactive Decision Wizard, Master Comparison Matrix, OAuth 2.1 rules & Deprecated Graveyard, and an exportable 23-point Production Hardening Audit checklist.

## Run Locally

Zero build step required—serve the folder with any static HTTP server:

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8766/`.
