# Handoff — majorcomputing.ca website project

Date: 2026-09-17 (updated: site built & pushed)

## Where we are

The site is **built and pushed** to `main` at `github.com/pmajor74/majorcomputing.ca` (commit acd6599). Single-page static site: `index.html` + `css/style.css` + `js/main.js` + `js/neural.js` (three.js r152 vendored in `js/vendor/` — no build step, output dir `/`).

Design: dark bold theme, brand palette cyan→blue→violet from the logo. Hero = 3D wireframe brain inside a neural cloud (shader glow nodes, pulsing pathways, flow particles + signal orbs riding every connection, cursor reach-out). Canvas is a fixed full-page backdrop that dims on scroll. Brand lockup in hero; header brand appears on scroll. Sections: Services (5 cards), About, Work (sands/clinkandmingle), Contact (sales@majorcomputing.ca). Scroll-spy nav, mobile hamburger, no-WebGL fallback, pauses when tab hidden.

**Remaining: DNS cutover (steps below).**

Note: Cloudflare's dashboard merged Pages into Workers — the project was created as a **Worker with static assets** (`majorcomputing-ca`, URL `majorcomputing-ca.codingwithoutbugs.workers.dev`), git-connected to `pmajor74/majorcomputing.ca`. Verified live: serves the full site incl. WebGL hero over HTTPS (Server: cloudflare). Custom domains are added under the Worker's "Domains and routes" panel (functionally identical to Pages custom domains). If pushes stop auto-deploying, check Settings → Builds on the Worker for the git connection.

## What happened in the previous session (working dir was `C:\Users\patri`)

1. **Problem diagnosed:** `www.majorcomputing.ca` showed "connection is not private". Cause: the GoDaddy-origin certificate expired 2026-07-21, and Cloudflare DNS records were "DNS only" (grey cloud), so visitors hit GoDaddy directly and saw the expired cert.
2. **Fix applied (user did this in Cloudflare dashboard):** enabled proxying (orange cloud) on the two apex A records (`76.223.105.230`, `13.248.243.5`) and the `www` CNAME, and set SSL/TLS mode to **Full**. Warning resolved.
3. **Key discovery:** the current live site is **GoDaddy Website Builder** ("Websites + Marketing") — a closed platform with no file access / no host folder. The page title mentions "codingwithoutbugs.ca" and describes Major Computing Ltd's AI business solutions.
4. **Decision:** replace the builder site with a custom static site on **Cloudflare Pages**, same pattern as the existing `sands.majorcomputing.ca` Pages site (git-connected, auto-deploy on push). Public repo, not GitHub Pages.
5. Full zone state and constraints are documented in `AGENTS.md` — read it before touching anything DNS-related.

## Next steps

1. ~~Gather requirements / design the site~~ — done.
2. ~~Build the static site~~ — done.
3. ~~Local sanity check~~ — done (rendered + interaction-tested via headless Edge CDP).
4. ~~Commit and push~~ — done.
5. **Create the Cloudflare Pages project** (user does this in the dashboard, guided): Workers & Pages → Create → Pages → Connect to Git → select this repo. Framework preset "None", no build command, output dir `/`.
6. **Verify** the `*.pages.dev` URL looks right.
7. **Cutover** (only when ready — kills the GoDaddy site): delete the two GoDaddy A records and the `www` CNAME in Cloudflare DNS, then add `majorcomputing.ca` and `www.majorcomputing.ca` as custom domains on the Pages project.
8. **Post-cutover verification from the CLI:** check both hostnames return 200 with `Server: cloudflare`, valid cert, and the expected content; confirm the www↔apex redirect behaves as chosen.

## Verification commands that worked before

```bash
curl -sI https://www.majorcomputing.ca
echo | openssl s_client -connect www.majorcomputing.ca:443 -servername www.majorcomputing.ca 2>/dev/null | openssl x509 -noout -subject -issuer -dates
nslookup www.majorcomputing.ca
```
