# DomainGen — Domain Name Generator

A modern, production-ready domain name generator and availability checker built for **Cloudflare Pages + Cloudflare Functions**.

## Features

- **50+ domain variants** generated algorithmically from any keyword
- **Real-time RDAP availability checks** via Cloudflare Functions
- **8 TLD categories** with 80+ extensions — fully customizable
- **localStorage persistence** for selected extensions
- Modern SaaS UI: glassmorphism, animations, dark mode, skeleton loading
- Zero dependencies — pure HTML, CSS, JavaScript
- SEO-optimized with structured data and Open Graph tags

## Project Structure

```
.
├── index.html              # Main page
├── style.css               # All styles (dark/light theme)
├── script.js               # Domain generation + UI logic
├── functions/
│   └── api/
│       └── check.js        # Cloudflare Function — RDAP availability check
├── favicon.svg
├── robots.txt
├── sitemap.xml
└── wrangler.toml
```

## Deploy to Cloudflare Pages

### Option A — Git deploy (recommended)

1. Push this repo to GitHub/GitLab
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create project
3. Connect your repo — no build command needed
4. Deploy ✓

### Option B — Wrangler CLI

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name domaingen
```

### Option C — Direct upload (drag & drop)

Upload the folder via the Cloudflare Pages dashboard.

## Local Development

```bash
npm install -g wrangler
wrangler pages dev . --port 8788
```

Then open `http://localhost:8788`.

## How it works

### Domain generation

The algorithm takes a keyword and produces combinations using:
- 30 prefixes (`get`, `go`, `my`, `pro`, `nova`…)
- 38 suffixes (`hub`, `lab`, `cloud`, `works`…)
- Numbers, hyphens, portmanteaus
- Creative transforms (`ify`, `ly`, `pal`…)

### Availability check

`GET /api/check?domain=example.com`

Queries the RDAP registry directly:
- `404` → **available**
- `200` → **taken**
- Other / timeout → **unknown**

Checks run 6 concurrent requests for speed without overloading registries.

## Customization

- Edit `TLD_CATEGORIES` in `script.js` to add/remove TLD groups
- Edit `PREFIXES` / `SUFFIXES` arrays to tune name generation
- Change `DEFAULT_TLDS` to adjust the default selection
- Adjust `CHECK_CONCURRENCY` (default: 6) for check speed vs. rate-limit tradeoff

## License

MIT
