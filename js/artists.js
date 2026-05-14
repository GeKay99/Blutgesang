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
    }

    window.applyAllArtists = function () {
        loadArtists().then(function (data) {
            if (!data) return;
            Object.keys(data).forEach(function (k) { applyArtist(k, data); });
        });
    };
})();
