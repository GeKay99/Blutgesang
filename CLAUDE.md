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
| `portfolio-misa.json` | Auto-written by `api/portfolio.php` + Admin |
| `portfolio-jaydem.json` | Same |
| `news.json` | Admin → News section |
| `artists.json` | Admin → Artists section |

### Admin Panel (`admin/`)

- `admin/index.html` + `admin/admin.js` + `admin/admin.css` — single-page CMS
- Auth: SHA-256 password hash stored in `admin/config.php`. The hash is compared via `hash_equals()` in PHP and via the dev server's `readPasswordHash()` in Node.js.
- Session cookie: `blutgesang_cms` (PHP) / `blutgesang_dev` (dev server)
- All admin API endpoints live in `admin/api/`: `auth.php`, `load.php`, `save.php`, `upload.php`, `delete.php`
- `admin/.htaccess` blocks direct web access to `config.php` and disables directory listing

### Dynamic Artist Profiles (`js/artists.js`)

`applyAllArtists()` fetches `content/artists.json` and updates any element with:
- `data-artist-img="misa|jaydem"` — sets `src`
- `data-artist-spec="misa|jaydem"` — sets text content (the "Specialized in" span)
- `data-artist-ig="misa|jaydem"` — sets `href` (Instagram DM link)

This is loaded on every public page. The admin Artists section writes changes back to `artists.json` via `admin/api/save.php`.

### Upload Targets

Files uploaded via the admin map to these directories:

| Target key | Directory |
|---|---|
| `misa` | `img/portfolio/misa/` |
| `jaydem` | `img/portfolio/jaydem/` |
| `slider` | `img/slider/` |
| `news` | `img/news/` |
| `artists` | `img/artists/` |

This mapping exists in four places and must be kept in sync: `admin/api/upload.php`, `admin/api/delete.php`, `dev-server.js` (`UPLOAD_TARGETS`), and the delete regex.

### Sticky Instagram Button

All public pages include a floating Instagram DM button (`.ig-sticky`). CSS hover reveals the options on desktop; `js/main.js::initInstagramSticky()` adds click-toggle for touch devices. Links are updated at runtime by `js/artists.js`.

### Cookie Consent (`js/cookie-consent.js`)

DSGVO-compliant banner. Consent stored in `localStorage['blutgesang_consent']` = `'all'` or `'necessary'`. Google Maps (on `anfahrt.html`) only loads after explicit `'all'` consent. `window.blutgesangOpenConsent()` reopens the banner from the footer.

## Deployment (Strato)

- Upload all files via FTP; no build step required
- Ensure `content/` directory is writable (CHMOD 755) so PHP can write JSON files
- Change the admin password after first deploy via the Settings section in the admin panel
- The `.github/workflows/static.yml` workflow was removed — deployment is manual FTP

## Fonts

Uses **Bunny Fonts** CDN (`fonts.bunny.net`) instead of Google Fonts for GDPR compliance.
