# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static tattoo studio website (Blutgesang Tattoo, Tuttlingen, Germany) targeting **Strato shared hosting** (Apache + PHP 7.4+). The site is static HTML/CSS/JS at runtime but uses a PHP-backed CMS admin panel for content management.

## Development Server

PHP is not installed locally. Use the Node.js dev server to test the full site including the admin panel:

```bash
node dev-server.js
# or double-click start-dev-server.bat
```

- Site: `http://localhost:8080`
- Admin: `http://localhost:8080/admin/`
- Default admin password: `BlutgesangAdmin`
- Sessions are in-memory and reset on every restart — you must log in again after each restart
- The dev server replicates all PHP endpoints; **restart it whenever `dev-server.js` is changed**

There are no build steps, linters, or test suites.

## Architecture

### Dual-Environment Content Loading

All dynamic content uses a **three-level fallback chain** so the site works both on Strato (PHP) and locally (Node.js dev server):

1. **PHP endpoint** (`api/portfolio.php?artist=X`) — scans the actual folder, auto-writes the JSON fallback
2. **Static JSON** (`content/*.json`) — written by PHP on every scan; used as fallback when PHP is absent
3. **Hardcoded HTML** — last resort if both fail

This means the JSON files in `content/` are auto-generated artifacts when PHP is running, but become the source of truth locally.

### Content Files (`content/`)

| File | Managed by |
|---|---|
| `slider.json` | Admin → Slider section |
| `portfolio-<slug>.json` | Auto-written by `api/portfolio.php` + Admin, one per artist slug in `artists.json` |
| `news.json` | Admin → News section |
| `artists.json` | Admin → Artists section |

### Admin Panel (`admin/`)

- `admin/index.html` + `admin/admin.js` + `admin/admin.css` — single-page CMS
- Auth: SHA-256 password hash stored in `admin/config.php`. The hash is compared via `hash_equals()` in PHP and via the dev server's `readPasswordHash()` in Node.js.
- Session cookie: `blutgesang_cms` (PHP) / `blutgesang_dev` (dev server)
- All admin API endpoints live in `admin/api/`: `auth.php`, `load.php`, `save.php`, `upload.php`, `delete.php`
- `admin/.htaccess` blocks direct web access to `config.php` and disables directory listing

### Artists are fully dynamic — no hardcoded names in code

`content/artists.json` is an object keyed by an arbitrary slug (e.g. `misa`), in display order. Each entry has `name`, `specializedIn`, `image`, `instagram`, `instagramDm`, `whatsapp`, `bio`, `bioDetail`. The admin's Artists/Portfolios sections render one tab per key in this object (`admin/admin.js`: `renderArtistTabs()`/`renderPortfolioTabs()`) — adding or removing an artist is done entirely through the admin UI ("+ Neuen Artist hinzufügen" / "Artist entfernen" buttons), never by editing code.

- `js/artists.js` fetches `artists.json` once and exposes:
  - `applyAllArtists()` — legacy path, updates any static element with `data-artist-img/spec/ig/bio/bio-detail="<slug>"` (still used by `artist-misa.html`, which keeps its own hand-tuned SEO page).
  - `renderArtistCards(containerId, variant)` — builds N artist `<article>` cards from scratch (`variant` is `'preview'`, `'preview-contact'`, or `'detail'`); used by `index.html`, `artists.html`, `ueber-uns.html` so the artist grid automatically reflects however many artists exist (the CSS grid, e.g. `.artist-grid { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }`, already flows for any count).
  - `renderFooterSocialLinks(containerId)` — builds the footer "Folge uns" Instagram links from `artists.json`; used on every page's footer.
  - `getArtistsData()` — exposes the cached fetch for other scripts (used by `js/artist-page.js`).
- **Portfolio detail pages**: `artist-misa.html` is Misa's own static, hand-optimized SEO page (unchanged). Every other artist (including any added later) uses the generic **`artist.html?slug=<slug>`** template, populated at runtime by `js/artist-page.js` (title/meta/image/bio/contact row + calls `initPortfolio(slug)` from `js/portfolio.js`). `renderArtistCards()`'s `portfolioHref()` picks the right link automatically. If you ever want a new artist to get their own fully custom static SEO page instead, that's a manual step (copy `artist-misa.html`, add a `sitemap.xml` entry) — it does not happen automatically.
- JSON-LD structured data (`employee`/`sameAs` in `index.html`'s `<head>`, `sameAs` in `anfahrt.html`) is **not** dynamic and must be updated by hand when an artist is added or removed.

### Upload & Save Targets

Fixed targets: `slider` → `img/slider/`, `news` → `img/news/`, `artists` → `img/artists/`, `ueber-uns` → `img/ueber-uns/`. Portfolio uploads/saves use a `"portfolio:<slug>"` convention instead of one hardcoded key per artist:
- Upload `target: "portfolio:<slug>"` → uploads into `img/portfolio/<slug>/` (auto-created if missing).
- Save `key: "portfolio:<slug>"` → writes `content/portfolio-<slug>.json`.

`<slug>` is validated against `^[a-z0-9-]+$` wherever it's parsed. This mapping is implemented in `admin/api/upload.php`, `admin/api/save.php`, `admin/api/load.php` (PHP) and their `dev-server.js` equivalents (`resolveUploadDir()`, `handleSave`, `handleLoad`) — keep those in sync when changing it. `admin/api/delete.php` / `handleDelete` and `api/portfolio.php` / `handlePortfolio` already validate/scan by arbitrary slug and need no changes when artists are added.



### Cookie Consent (`js/cookie-consent.js`)

DSGVO-compliant banner. Consent stored in `localStorage['blutgesang_consent']` = `'all'` or `'necessary'`. Google Maps (on `anfahrt.html`) only loads after explicit `'all'` consent. `window.blutgesangOpenConsent()` reopens the banner from the footer.

## Deployment (Strato)

- Upload all files via FTP; no build step required
- Ensure `content/` directory is writable (CHMOD 755) so PHP can write JSON files
- Change the admin password after first deploy via the Settings section in the admin panel
- The `.github/workflows/static.yml` workflow was removed — deployment is manual FTP

## Fonts

Uses **Bunny Fonts** CDN (`fonts.bunny.net`) instead of Google Fonts for GDPR compliance.
