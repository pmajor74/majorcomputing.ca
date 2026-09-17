# majorcomputing.ca — Company Website

Static website for **Major Computing Systems Ltd.**, deployed via **Cloudflare Pages** from this public git repo. Must serve both `majorcomputing.ca` and `www.majorcomputing.ca`.

Read `handoff.md` first for session context and the current state of DNS/hosting.

## Deployment architecture

- Hosting: Cloudflare Pages (connect this repo via dashboard → Workers & Pages → Create → Pages → Connect to Git).
- Build: plain static site (HTML/CSS/JS) unless the project evolves — framework preset "None", output directory `/` (or the folder containing the built files).
- DNS: managed in Cloudflare (nameservers `ashley/dale.ns.cloudflare.com`). Pages custom-domain setup auto-creates the needed records (CNAME flattening at apex).
- SSL: Cloudflare Universal SSL (edge) + SSL/TLS mode **Full** (not Flexible, not Full Strict — the old GoDaddy origin cert is expired and irrelevant once cut over).

## Hard constraints

- **Do NOT touch DNS records unrelated to web hosting.** The zone carries Microsoft 365 mail: MX (`majorcomputing-ca.mail.protection.outlook.com`), SRV records, and mail CNAMEs (`autodiscover`, `email`, `lyncdiscover`, `msoid`, `sip`) plus SPF/DMARC/MS-verification TXT records. These must stay untouched and unproxied.
- `batcave.majorcomputing.ca` is a Cloudflare Tunnel CNAME (`cfargotunnel.com`, proxied) — leave it alone.
- `sands.majorcomputing.ca` is an existing Cloudflare Pages site — do not disturb it.
- Both `majorcomputing.ca` AND `www.majorcomputing.ca` must work. Pick one canonical address and 301-redirect the other (current behavior redirects www → apex).

## Pending cutover step (do this only when the new site is ready to go live)

The apex currently points at a GoDaddy Website Builder site via two A records (`76.223.105.230`, `13.248.243.5`, both proxied) plus a `www` CNAME to the apex. Before attaching the Pages custom domain, delete those three records in Cloudflare DNS — this takes the old GoDaddy site offline permanently. Then add `majorcomputing.ca` and `www.majorcomputing.ca` as custom domains in the Pages project.
