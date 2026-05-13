document.addEventListener('DOMContentLoaded', initNews);

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function initNews() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    let data = { posts: [] };
    try {
        const res = await fetch('content/news.json');
        if (!res.ok) throw new Error('fetch failed');
        data = await res.json();
    } catch {
        grid.innerHTML = '<p class="news-empty">Beiträge konnten nicht geladen werden.</p>';
        return;
    }

    const published = (data.posts || []).filter(p => p.published);

    if (published.length === 0) {
        grid.innerHTML = '<p class="news-empty">Noch keine Beiträge vorhanden.</p>';
        return;
    }

    grid.innerHTML = published.map(renderCard).join('');

    // Attach read-more click handlers
    grid.querySelectorAll('.news-read-more').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const slug = btn.dataset.slug;
            const post = published.find(p => p.id === slug);
            if (post) openModal(post);
        });
    });

    // Close modal bindings
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });

    // Open post directly if URL contains hash on load
    if (window.location.hash) {
        const slug = window.location.hash.slice(1);
        const post = published.find(p => p.id === slug);
        if (post) openModal(post);
    }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderCard(post) {
    const date = formatDate(post.date);
    const tags = (post.tags || []).map(t => `<span class="news-tag">${t}</span>`).join('');
    const img = post.image
        ? `<div class="news-card-image"><img src="${post.image}" alt="${post.title}" loading="lazy"></div>`
        : `<div class="news-card-image news-card-no-image"></div>`;

    return `
        <article class="news-card">
            ${img}
            <div class="news-card-body">
                <div class="news-meta">
                    <time datetime="${post.date}">${date}</time>
                    ${tags}
                </div>
                <h2 class="news-card-title">${post.title}</h2>
                <p class="news-card-excerpt">${post.excerpt}</p>
                <button class="portfolio-btn news-read-more" data-slug="${post.id}">Mehr lesen</button>
            </div>
        </article>`;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function openModal(post) {
    const modal = document.getElementById('post-modal');
    const content = document.getElementById('post-modal-content');
    const date = formatDate(post.date);
    const tags = (post.tags || []).map(t => `<span class="news-tag">${t}</span>`).join('');

    content.innerHTML = `
        <div class="modal-meta">
            <time datetime="${post.date}">${date}</time>
            ${tags}
        </div>
        <h1 class="modal-title">${post.title}</h1>
        <div class="modal-body">${post.content}</div>`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Update URL hash for shareable link
    history.pushState(null, '', `#${post.id}`);
}

function closeModal() {
    const modal = document.getElementById('post-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    history.pushState(null, '', window.location.pathname);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}
