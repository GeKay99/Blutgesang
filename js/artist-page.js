/**
 * Populates the generic artist.html detail page (?slug=<artist>) from
 * content/artists.json, for any artist that doesn't have its own dedicated
 * static SEO page (like artist-misa.html does).
 */
(function () {
    function qs(name) {
        return new URLSearchParams(location.search).get(name);
    }

    function showNotFound() {
        const header = document.querySelector('.artist-detail-header');
        const portfolio = document.querySelector('.portfolio-section');
        if (header) {
            header.innerHTML = '<div class="container" style="padding:60px 0;text-align:center">' +
                '<p>Dieser Artist wurde nicht gefunden.</p>' +
                '<a href="artists.html" class="portfolio-btn">Zurück zur Künstlerübersicht</a>' +
                '</div>';
        }
        if (portfolio) portfolio.style.display = 'none';
    }

    function buildContactRow(a) {
        const icons = window._artistIcons || { ig: '', wa: '' };
        const parts = [];
        if (a.instagramDm) {
            parts.push('<a href="' + a.instagramDm + '" class="contact-btn contact-btn--ig" target="_blank" rel="noopener">' +
                icons.ig.replace('{W}', 18) + '<span>Instagram DM</span></a>');
        }
        if (a.whatsapp) {
            parts.push('<a href="https://wa.me/' + a.whatsapp + '" class="contact-btn contact-btn--wa" target="_blank" rel="noopener">' +
                icons.wa.replace('{W}', 18) + '<span>WhatsApp</span></a>');
        }
        return parts.join('');
    }

    document.addEventListener('DOMContentLoaded', function () {
        const slug = (qs('slug') || '').toLowerCase();

        if (!slug || typeof window.getArtistsData !== 'function') {
            showNotFound();
            return;
        }

        window.getArtistsData().then(function (data) {
            const a = data && data[slug];
            if (!a) { showNotFound(); return; }

            const name = a.name || slug;
            const spec = a.specializedIn || '';

            document.title = name + (spec ? ' – ' + spec : '') + ' Tattoo Tuttlingen | Blutgesang';
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', name + (spec ? ' – Spezialist/in für ' + spec : '') +
                    ' Tattoos in Tuttlingen. Portfolio ansehen und Termin vereinbaren.');
            }

            const nameEl    = document.getElementById('artist-name');
            const specEl    = document.getElementById('artist-spec');
            const bioEl     = document.getElementById('artist-bio-detail');
            const imgEl     = document.getElementById('artist-photo');
            const contactEl = document.getElementById('artist-contact-row');

            if (nameEl) nameEl.textContent = name;
            if (specEl) specEl.textContent = spec;
            if (bioEl) bioEl.textContent = a.bioDetail || a.bio || '';
            if (imgEl && a.image) {
                imgEl.src = a.image;
                imgEl.alt = name + (spec ? ' – ' + spec + ' Tätowierer/in in Tuttlingen' : '');
                imgEl.style.display = '';
            }
            if (contactEl) contactEl.innerHTML = buildContactRow(a);

            if (typeof window.initPortfolio === 'function') window.initPortfolio(slug);
        });
    });
})();
