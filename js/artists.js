(function () {
    'use strict';

    var _promise = null;

    function loadArtists() {
        if (_promise) return _promise;
        _promise = fetch('content/artists.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
        return _promise;
    }

    function applyArtist(key, data) {
        if (!data || !data[key]) return;
        var a = data[key];

        document.querySelectorAll('[data-artist-spec="' + key + '"]').forEach(function (el) {
            if (a.specializedIn) el.textContent = a.specializedIn;
        });

        document.querySelectorAll('[data-artist-img="' + key + '"]').forEach(function (el) {
            if (a.image) el.src = a.image;
        });

        document.querySelectorAll('[data-artist-ig="' + key + '"]').forEach(function (el) {
            if (a.instagramDm) el.href = a.instagramDm;
        });

        document.querySelectorAll('[data-artist-bio="' + key + '"]').forEach(function (el) {
            if (a.bio) el.textContent = a.bio;
        });

        document.querySelectorAll('[data-artist-bio-detail="' + key + '"]').forEach(function (el) {
            if (a.bioDetail) el.textContent = a.bioDetail;
        });
    }

    window.applyAllArtists = function () {
        loadArtists().then(function (data) {
            if (!data) return;
            Object.keys(data).forEach(function (k) { applyArtist(k, data); });
        });
    };

    // ─── Shared helpers for dynamically rendering N artist cards ─────────────────

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Misa keeps her existing static SEO page; every other (incl. future) artist
    // gets the generic data-driven detail page.
    function portfolioHref(slug) {
        return slug === 'misa' ? 'artist-misa.html' : 'artist.html?slug=' + encodeURIComponent(slug);
    }

    var IG_SVG = '<svg viewBox="0 0 448 512" width="{W}" aria-hidden="true"><path fill="currentColor" d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>';
    var WA_SVG = '<svg viewBox="0 0 448 512" width="{W}" aria-hidden="true"><path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>';

    function buildContactRow(slug, a, iconWidth) {
        var parts = [];
        if (a.instagramDm) {
            parts.push('<a href="' + esc(a.instagramDm) + '" class="contact-btn contact-btn--ig" target="_blank" rel="noopener" data-artist-ig="' + slug + '">' +
                IG_SVG.replace('{W}', iconWidth) + '<span>Instagram</span></a>');
        }
        if (a.whatsapp) {
            parts.push('<a href="https://wa.me/' + esc(a.whatsapp) + '" class="contact-btn contact-btn--wa" target="_blank" rel="noopener">' +
                WA_SVG.replace('{W}', iconWidth) + '<span>WhatsApp</span></a>');
        }
        return parts.length ? '<div class="artist-contact-row">' + parts.join('') + '</div>' : '';
    }

    function buildPreviewCard(slug, a, withContact) {
        var alt = esc(a.name || slug) + (a.specializedIn ? ' – ' + esc(a.specializedIn) + ' Tätowierer/in in Tuttlingen' : '');
        return '<article class="artist-card">' +
                '<img src="' + esc(a.image || '') + '" alt="' + alt + '" data-artist-img="' + slug + '" loading="lazy">' +
                '<div class="artist-info">' +
                    '<span data-artist-spec="' + slug + '">' + esc(a.specializedIn || '') + '</span>' +
                    '<h3>' + esc(a.name || slug) + '</h3>' +
                    '<a href="' + portfolioHref(slug) + '" class="portfolio-btn">Portfolio</a>' +
                    (withContact ? buildContactRow(slug, a, 16) : '') +
                '</div>' +
            '</article>';
    }

    function buildDetailCard(slug, a, index) {
        var alt = esc(a.name || slug) + (a.specializedIn ? ' – ' + esc(a.specializedIn) + ' Tattoo Portfolio' : '');
        var reverse = index % 2 === 1 ? ' reverse' : '';
        return '<article class="artist-detail-card' + reverse + '">' +
                '<div class="artist-image">' +
                    '<img src="' + esc(a.image || '') + '" alt="' + alt + '" data-artist-img="' + slug + '" loading="lazy">' +
                '</div>' +
                '<div class="artist-text">' +
                    '<span data-artist-spec="' + slug + '">' + esc(a.specializedIn || '') + '</span>' +
                    '<h2>' + esc(a.name || slug) + '</h2>' +
                    '<p data-artist-bio="' + slug + '">' + esc(a.bio || '') + '</p>' +
                    '<div id="preview-' + slug + '" class="portfolio-preview"></div>' +
                    '<div class="artist-actions">' +
                        '<a href="' + portfolioHref(slug) + '" class="portfolio-btn">Zum Portfolio</a>' +
                        (a.instagramDm ? '<a href="' + esc(a.instagramDm) + '" class="ig-btn-secondary" data-artist-ig="' + slug + '" target="_blank" rel="noopener">' +
                            IG_SVG.replace('{W}', 14) + 'DM auf Instagram</a>' : '') +
                    '</div>' +
                '</div>' +
            '</article>';
    }

    // variant: 'preview' (no contact row, e.g. ueber-uns.html),
    //          'preview-contact' (with IG/WhatsApp row, e.g. index.html),
    //          'detail' (full bio + portfolio preview strip, artists.html)
    window.renderArtistCards = function (containerId, variant) {
        var container = document.getElementById(containerId);
        if (!container) return;
        loadArtists().then(function (data) {
            if (!data) return;
            var slugs = Object.keys(data);
            if (slugs.length === 0) { container.innerHTML = ''; return; }

            if (variant === 'detail') {
                container.innerHTML = slugs.map(function (slug, i) { return buildDetailCard(slug, data[slug], i); }).join('');
                slugs.forEach(function (slug) {
                    if (typeof window.initPortfolioPreview === 'function') {
                        window.initPortfolioPreview(slug, 'preview-' + slug);
                    }
                });
            } else {
                var withContact = variant === 'preview-contact';
                container.innerHTML = slugs.map(function (slug) { return buildPreviewCard(slug, data[slug], withContact); }).join('');
            }
        });
    };

    // Populates the footer "Folge uns" Instagram links from artists.json so a
    // newly added/removed artist doesn't need a manual footer edit on every page.
    window.renderFooterSocialLinks = function (containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        loadArtists().then(function (data) {
            if (!data) return;
            var slugs = Object.keys(data).filter(function (s) { return data[s].instagram; });
            container.innerHTML = slugs.map(function (slug) {
                var a = data[slug];
                return '<a href="' + esc(a.instagram) + '" target="_blank" class="social-link-item">' +
                    IG_SVG.replace('{W}', 20) + '<span>' + esc(a.name || slug) + '</span></a>';
            }).join('');
        });
    };

    // Exposed so the generic artist.html detail page can reuse the same fetch/cache
    // and icon markup instead of duplicating it.
    window.getArtistsData = loadArtists;
    window._artistIcons = { ig: IG_SVG, wa: WA_SVG };
})();
