(function () {
    'use strict';

    var STORAGE_KEY = 'blutgesang_consent';

    function getConsent() { return localStorage.getItem(STORAGE_KEY); }
    function setConsent(v) { localStorage.setItem(STORAGE_KEY, v); }

    function applyConsent(accepted) {
        document.querySelectorAll('.map-consent-wrapper').forEach(function (wrapper) {
            var src = wrapper.dataset.mapSrc;
            if (!src) return;
            if (accepted) {
                wrapper.innerHTML = '<iframe src="' + src + '" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
            } else {
                wrapper.innerHTML = '<div class="map-blocked">'
                    + '<svg viewBox="0 0 24 24" width="48" fill="none" stroke="currentColor" stroke-width="1.5">'
                    + '<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>'
                    + '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>'
                    + '</svg>'
                    + '<p>Google Maps ist deaktiviert.</p>'
                    + '<p>Bitte akzeptieren Sie Cookies, um die Karte zu laden.</p>'
                    + '<button class="cookie-revoke-btn" onclick="blutgesangOpenConsent()">Einstellungen ändern</button>'
                    + '</div>';
            }
        });
    }

    function lockScroll()   { document.documentElement.style.overflow = 'hidden'; }
    function unlockScroll() { document.documentElement.style.overflow = '';       }

    function showBanner() {
        if (document.getElementById('cookie-banner')) return;
        lockScroll();
        var banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie-Einstellungen');
        banner.innerHTML = '<div class="cookie-banner-inner">'
            + '<div class="cookie-text">'
            + '<strong>Datenschutzhinweis</strong>'
            + '<p>Diese Website verwendet <strong>Google Maps</strong> auf der Anfahrtsseite. Dabei werden Daten (u.a. Ihre IP-Adresse) an Google LLC, USA übertragen. Mit „Alle akzeptieren" erteilen Sie Ihre Einwilligung gemäß Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO. Die Einwilligung ist freiwillig und kann jederzeit widerrufen werden. '
            + '<a href="datenschutz.html">Datenschutzerklärung</a>'
            + '</p>'
            + '</div>'
            + '<div class="cookie-actions">'
            + '<button id="cookie-accept-all" class="cookie-btn cookie-btn-accept">Alle akzeptieren</button>'
            + '<button id="cookie-reject" class="cookie-btn cookie-btn-reject">Nur notwendige</button>'
            + '</div>'
            + '</div>';
        document.body.appendChild(banner);

        document.getElementById('cookie-accept-all').addEventListener('click', function () {
            setConsent('all');
            unlockScroll();
            banner.remove();
            applyConsent(true);
        });
        document.getElementById('cookie-reject').addEventListener('click', function () {
            setConsent('necessary');
            unlockScroll();
            banner.remove();
            applyConsent(false);
        });
    }

    window.blutgesangOpenConsent = function () {
        localStorage.removeItem(STORAGE_KEY);
        document.querySelectorAll('.map-consent-wrapper').forEach(function (w) { w.innerHTML = ''; });
        showBanner();
    };

    function init() {
        var consent = getConsent();
        if (consent === null) {
            showBanner();
        } else {
            applyConsent(consent === 'all');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
