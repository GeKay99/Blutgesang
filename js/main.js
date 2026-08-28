document.addEventListener('DOMContentLoaded', () => {
    initSlider();
    initMobileNavClose();
});

// ─── DYNAMIC SLIDER ──────────────────────────────────────────────────────────

async function initSlider() {
    const container = document.getElementById('slider-bg');
    if (!container) return;

    let config = { slides: [], interval: 5000 };
    try {
        const res = await fetch('content/slider.json');
        if (!res.ok) throw new Error('fetch failed');
        config = await res.json();
    } catch {
        // Keep whatever fallback HTML was already in the container
        return;
    }

    const { slides = [], interval = 5000 } = config;
    if (slides.length === 0) return;

    // Slides are built without their real image/video source (except slide 0) so
    // the browser doesn't fetch every slide at once — each slide's asset is only
    // requested one rotation ahead of when it's actually needed (see loadSlide()).
    container.innerHTML = slides.map((s, i) => {
        const active = i === 0 ? ' active' : '';
        if (s.type === 'video') {
            return `<div class="slide${active}">
                <video muted loop playsinline preload="none"></video>
            </div>`;
        }
        return `<div class="slide${active}" aria-label="${s.alt || ''}"></div>`;
    }).join('');

    const els = container.querySelectorAll('.slide');

    function loadSlide(i) {
        const el = els[i];
        if (!el || el.dataset.loaded) return;
        el.dataset.loaded = '1';
        const s = slides[i];
        if (s.type === 'video') {
            const video = el.querySelector('video');
            video.src = s.src;
            video.play().catch(() => {});
        } else {
            el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url('${s.src}')`;
        }
    }

    loadSlide(0);
    if (slides.length > 1) loadSlide(1);

    if (slides.length <= 1) return;

    let current = 0;
    setInterval(() => {
        els[current].classList.remove('active');
        current = (current + 1) % els.length;
        els[current].classList.add('active');
        loadSlide((current + 1) % els.length);
    }, interval);
}

// ─── MOBILE NAV: close on link click ─────────────────────────────────────────

function initMobileNavClose() {
    const toggle = document.getElementById('nav-toggle');
    if (!toggle) return;
    document.querySelectorAll('.mobile-menu a').forEach(a =>
        a.addEventListener('click', () => { toggle.checked = false; })
    );
}
