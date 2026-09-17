# majorcomputing.ca — Company Website

Static website for **Major Computing Systems Ltd.**, deployed via the **`majorcomputing-ca` Cloudflare Worker** (static assets) from this public git repo. Must serve both `majorcomputing.ca` and `www.majorcomputing.ca`.

Read `handoff.md` first for session context and the current state of DNS/hosting.

## Deployment architecture

- Hosting: `majorcomputing-ca` Worker with static assets (Cloudflare's current model; Pages projects are now Workers). Git-connected to this repo — pushes to `main` auto-deploy.
- Build: plain static site (HTML/CSS/JS) — no build command, output directory `/`.
- DNS: managed in Cloudflare (nameservers `ashley/dale.ns.cloudflare.com`). Pages custom-domain setup auto-creates the needed records (CNAME flattening at apex).
- SSL: Cloudflare Universal SSL (edge) + SSL/TLS mode **Full** (not Flexible, not Full Strict — the old GoDaddy origin cert is expired and irrelevant once cut over).

## Hard constraints

- **Do NOT touch DNS records unrelated to web hosting.** The zone carries Microsoft 365 mail: MX (`majorcomputing-ca.mail.protection.outlook.com`), SRV records, and mail CNAMEs (`autodiscover`, `email`, `lyncdiscover`, `msoid`, `sip`) plus SPF/DMARC/MS-verification TXT records. These must stay untouched and unproxied.
- `batcave.majorcomputing.ca` is a Cloudflare Tunnel CNAME (`cfargotunnel.com`, proxied) — leave it alone.
- `sands.majorcomputing.ca` is an existing Cloudflare Pages site — do not disturb it.
- Both `majorcomputing.ca` AND `www.majorcomputing.ca` must work. Pick one canonical address and 301-redirect the other (current behavior redirects www → apex).

## Hosting (live since 2026-09-17)

The site is served by the **`majorcomputing-ca` Worker** (Workers static assets — Cloudflare's successor to Pages), git-connected to this repo; pushes to `main` auto-deploy. The old GoDaddy A records and `www` CNAME were deleted at cutover; `majorcomputing.ca` and `www.majorcomputing.ca` are custom domains on the Worker.

**Done:** www → apex 301 redirect rule is live (Redirect Rules: `https://www.majorcomputing.ca/*` → apex). Verified: www root and paths 301 to `https://majorcomputing.ca/`; apex serves 200. (Note: rule as configured preserves query string but drops the path — target lacks `${1}`. Harmless for a single-page site; to preserve paths too, change the action target to `https://majorcomputing.ca/${1}`.)
