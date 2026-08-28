/**
 * Portfolio gallery loader.
 * Tries in order:
 *   1. api/portfolio.php?artist=X  (PHP server — auto-detects all image files)
 *   2. content/portfolio-X.json    (static fallback JSON)
 * If both fail, the hardcoded HTML in the page stays as-is.
 *
 * Called from artist detail pages:
 *   initPortfolio('misa') or initPortfolio(anySlugFromArtistsJson)
 *
 * On the artists overview page, initPortfolioPreview(artist, containerId)
 * renders a compact thumbnail strip.
 */

async function fetchPortfolioImages(artist) {
    // 1 — PHP directory scanner (works when hosted on PHP server)
    try {
        const res = await fetch(`api/portfolio.php?artist=${encodeURIComponent(artist)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.images)) return data.images;
        }
    } catch { /* fall through */ }

    // 2 — static JSON file (fallback for non-PHP environments)
    try {
        const res = await fetch(`content/portfolio-${artist}.json`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.gallery)) return data.gallery;
        }
    } catch { /* fall through */ }

    return null; // both failed; caller keeps hardcoded HTML
}

// Called when an image fails to load — removes it; if the container is now
// empty, replaces it with the "no images" message.
function _onImgError(img, emptyMsg) {
    var item = img.parentElement;
    var container = item && item.parentElement;
    if (item) item.remove();
    if (container && !container.querySelector('img')) {
        container.innerHTML = emptyMsg;
    }
}

// ─── Full portfolio gallery (artist detail page) ──────────────────────────────
async function initPortfolio(artist) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    const images = await fetchPortfolioImages(artist);

    if (!images || images.length === 0) {
        grid.innerHTML = '<p class="preview-empty" style="grid-column:1/-1;padding:40px 0;">Noch keine Portfolio-Bilder vorhanden.</p>';
        return;
    }

    const emptyMsg = '<p class="preview-empty" style="grid-column:1/-1;padding:40px 0;">Noch keine Portfolio-Bilder vorhanden.</p>';
    grid.innerHTML = images.map(img => `
        <div class="gallery-item">
            <img src="${img.src}"
                 alt="${img.alt || ''}"
                 loading="lazy"
                 onclick="openLightbox(this.src, this.alt)"
                 onerror="_onImgError(this, ${JSON.stringify(emptyMsg)})">
        </div>`).join('');
}

// ─── Thumbnail preview strip (artists overview page) ─────────────────────────
async function initPortfolioPreview(artist, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p class="preview-loading">Lade Vorschau…</p>';

    const images = await fetchPortfolioImages(artist);

    if (!images || images.length === 0) {
        container.innerHTML = '<p class="preview-empty">Noch keine Portfolio-Bilder vorhanden.</p>';
        return;
    }

    const emptyMsg = '<p class="preview-empty">Noch keine Portfolio-Bilder vorhanden.</p>';
    container.innerHTML = images.map(img => `
        <div class="preview-thumb">
            <img src="${img.src}"
                 alt="${img.alt || ''}"
                 loading="lazy"
                 onclick="openLightbox(this.src, this.alt)"
                 onerror="_onImgError(this, ${JSON.stringify(emptyMsg)})">
        </div>`).join('');
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
(function () {
    var overlay = null;

    function buildOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'lb-overlay';
        overlay.innerHTML = '<div id="lb-inner"><button id="lb-close" aria-label="Schließen">&times;</button><img id="lb-img" src="" alt=""><p id="lb-caption"></p></div>';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeLightbox();
        });
        document.getElementById('lb-close').addEventListener('click', closeLightbox);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeLightbox();
        });
    }

    window.openLightbox = function (src, alt) {
        buildOverlay();
        document.getElementById('lb-img').src = src;
        document.getElementById('lb-img').alt = alt || '';
        document.getElementById('lb-caption').textContent = alt || '';
        overlay.classList.add('lb-open');
        document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function () {
        if (overlay) overlay.classList.remove('lb-open');
        document.body.style.overflow = '';
    };
})();
