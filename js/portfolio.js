// Called from artist detail pages: initPortfolio('misa') or initPortfolio('jeydem')
async function initPortfolio(artist) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    let data = { gallery: [] };
    try {
        const res = await fetch(`content/portfolio-${artist}.json`);
        if (!res.ok) throw new Error('fetch failed');
        data = await res.json();
    } catch {
        return; // Keep hardcoded HTML as fallback
    }

    const { gallery = [] } = data;
    if (gallery.length === 0) return;

    grid.innerHTML = gallery
        .map(img =>
            `<div class="gallery-item">
                <img src="${img.src}" alt="${img.alt || ''}" loading="lazy">
            </div>`
        )
        .join('');
}
