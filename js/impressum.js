(function () {
    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function applyImpressum(data) {
        (data.blocks || []).forEach(function (block) {
            var el = document.querySelector('[data-imp-block="' + block.id + '"]');
            if (!el) return;
            var heading = block.heading ? '<h2>' + escHtml(block.heading) + '</h2>' : '';
            el.innerHTML = heading + (block.content || '');
        });
    }

    function loadImpressum() {
        fetch('content/impressum.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) { if (data) applyImpressum(data); })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadImpressum);
    } else {
        loadImpressum();
    }
})();
