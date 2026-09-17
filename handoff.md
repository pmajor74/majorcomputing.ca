# Handoff — majorcomputing.ca website project

Date: 2026-09-17

## Where we are

This repo is freshly synced and **empty**. The task: design and build the company website for **Major Computing Systems Ltd.** as a static site, then deploy it via Cloudflare Pages so it serves `majorcomputing.ca` and `www.majorcomputing.ca`. The site has not been designed yet — that's the next step.

## What happened in the previous session (working dir was `C:\Users\patri`)

1. **Problem diagnosed:** `www.majorcomputing.ca` showed "connection is not private". Cause: the GoDaddy-origin certificate expired 2026-07-21, and Cloudflare DNS records were "DNS only" (grey cloud), so visitors hit GoDaddy directly and saw the expired cert.
2. **Fix applied (user did this in Cloudflare dashboard):** enabled proxying (orange cloud) on the two apex A records (`76.223.105.230`, `13.248.243.5`) and the `www` CNAME, and set SSL/TLS mode to **Full**. Warning resolved.
3. **Key discovery:** the current live site is **GoDaddy Website Builder** ("Websites + Marketing") — a closed platform with no file access / no host folder. The page title mentions "codingwithoutbugs.ca" and describes Major Computing Ltd's AI business solutions.
4. **Decision:** replace the builder site with a custom static site on **Cloudflare Pages**, same pattern as the existing `sands.majorcomputing.ca` Pages site (git-connected, auto-deploy on push). Public repo, not GitHub Pages.
5. Full zone state and constraints are documented in `AGENTS.md` — read it before touching anything DNS-related.

## Next steps

1. **Gather requirements for the site design** — ask the user about:
   - What Major Computing Systems Ltd. does / what the site should say (services, about, contact). The old site mentioned AI business solutions and business technology services.
   - Content: pages needed (home, services, about, contact?), branding (logo, colors), contact details to publish.
   - Style preferences.
2. **Build the static site** in this repo (`index.html` at root, plus assets). Plain HTML/CSS/JS is fine unless the user wants a framework.
3. **Local sanity check** the site renders correctly.
4. **Commit and push** to the connected public repo.
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
