(function () {
    function applyUeberUns(data) {
        function setText(attr, val) {
            if (val == null) return;
            document.querySelectorAll('[data-uu="' + attr + '"]').forEach(function (el) {
                el.textContent = val;
            });
        }

        // Images: data-uu-img="story" or "studio" → sets src + alt
        document.querySelectorAll('[data-uu-img]').forEach(function (el) {
            var key = el.getAttribute('data-uu-img');
            var section = data[key];
            if (!section) return;
            if (section.image)    el.src = section.image;
            if (section.imageAlt) el.alt = section.imageAlt;
        });

        if (data.hero) {
            setText('hero-subtitle', data.hero.subtitle);
        }
        if (data.story) {
            setText('story-tag',     data.story.tag);
            setText('story-heading', data.story.heading);
            setText('story-text1',   data.story.text1);
            setText('story-text2',   data.story.text2);
        }
        if (data.values) {
            setText('values-sectionTitle', data.values.sectionTitle);
            (data.values.items || []).forEach(function (item, i) {
                setText('value-' + i + '-heading', item.heading);
                setText('value-' + i + '-text',    item.text);
            });
        }
        if (data.studio) {
            setText('studio-tag',     data.studio.tag);
            setText('studio-heading', data.studio.heading);
            setText('studio-text1',   data.studio.text1);
            setText('studio-text2',   data.studio.text2);
        }
    }

    function loadUeberUns() {
        fetch('content/ueber-uns.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) { if (data) applyUeberUns(data); })
            .catch(function () {});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUeberUns);
    } else {
        loadUeberUns();
    }
})();
