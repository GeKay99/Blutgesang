// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Default password: "BlutgesangAdmin"
// To change: run sha256("newpassword") in console, update DEFAULT_HASH below.
const DEFAULT_HASH = 'f31bf4da0acc65f245b2c5c918fe4d4e193305c4198a669b5031508e305601f5';

const CONTENT_FILES = {
    slider:   'content/slider.json',
    misa:     'content/portfolio-misa.json',
    jeydem:   'content/portfolio-jeydem.json',
    news:     'content/news.json'
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
    authenticated: false,
    github: { token: '', owner: '', repo: '', branch: 'main' },
    data: { slider: null, misa: null, jeydem: null, news: null },
    sha: { slider: null, misa: null, jeydem: null, news: null },
    editingPostId: null
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadGitHubConfig();

    const stored = sessionStorage.getItem('cms_auth');
    if (stored === 'ok') {
        showAdmin();
    } else {
        showLogin();
    }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-layout').style.display = 'none';
}

function showAdmin() {
    state.authenticated = true;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'grid';
    navigateTo('dashboard');
    loadAllData();
}

document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('pw-input').value;
    const hash = await sha256(pw);
    const storedHash = localStorage.getItem('cms_pw_hash') || DEFAULT_HASH;

    if (hash === storedHash) {
        sessionStorage.setItem('cms_auth', 'ok');
        showAdmin();
    } else {
        showAlert('login-alert', 'Falsches Passwort.', 'error');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('cms_auth');
    showLogin();
});

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigateTo(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));

    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.add('active');

    const navItem = document.querySelector(`[data-section="${section}"]`);
    if (navItem) navItem.closest('li').classList.add('active');
}

document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(el.dataset.section);
    });
});

// ─── GITHUB CONFIG ────────────────────────────────────────────────────────────
function loadGitHubConfig() {
    const cfg = JSON.parse(localStorage.getItem('cms_github') || '{}');
    state.github = {
        token:  cfg.token  || '',
        owner:  cfg.owner  || '',
        repo:   cfg.repo   || '',
        branch: cfg.branch || 'main'
    };
    document.getElementById('gh-token').value  = state.github.token;
    document.getElementById('gh-owner').value  = state.github.owner;
    document.getElementById('gh-repo').value   = state.github.repo;
    document.getElementById('gh-branch').value = state.github.branch;
}

document.getElementById('settings-github-form').addEventListener('submit', e => {
    e.preventDefault();
    state.github = {
        token:  document.getElementById('gh-token').value.trim(),
        owner:  document.getElementById('gh-owner').value.trim(),
        repo:   document.getElementById('gh-repo').value.trim(),
        branch: document.getElementById('gh-branch').value.trim() || 'main'
    };
    localStorage.setItem('cms_github', JSON.stringify(state.github));
    showAlert('settings-alert', 'GitHub-Einstellungen gespeichert.', 'success');
});

document.getElementById('settings-pw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('new-pw').value;
    const pw2 = document.getElementById('new-pw2').value;
    if (pw !== pw2) { showAlert('pw-alert', 'Passwörter stimmen nicht überein.', 'error'); return; }
    if (pw.length < 8) { showAlert('pw-alert', 'Mindestens 8 Zeichen erforderlich.', 'error'); return; }
    const hash = await sha256(pw);
    localStorage.setItem('cms_pw_hash', hash);
    showAlert('pw-alert', 'Passwort erfolgreich geändert.', 'success');
    document.getElementById('new-pw').value = '';
    document.getElementById('new-pw2').value = '';
});

// ─── GITHUB API ───────────────────────────────────────────────────────────────
async function readGitHubFile(path) {
    const { token, owner, repo, branch } = state.github;
    if (!token || !owner || !repo) throw new Error('GitHub-Konfiguration unvollständig. Bitte unter Einstellungen ausfüllen.');

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
    }

    const fileData = await res.json();
    const content = JSON.parse(decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, '')))));
    return { content, sha: fileData.sha };
}

async function writeGitHubFile(path, content, sha) {
    const { token, owner, repo, branch } = state.github;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({ message: `CMS: Update ${path}`, content: encoded, sha, branch })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    return (await res.json()).content.sha;
}

// ─── LOAD ALL DATA ────────────────────────────────────────────────────────────
async function loadAllData() {
    for (const [key, path] of Object.entries(CONTENT_FILES)) {
        try {
            const { content, sha } = await readGitHubFile(path);
            state.data[key] = content;
            state.sha[key]  = sha;
        } catch {
            // Fall back to fetching from the local site for display-only
            try {
                const res = await fetch('../' + path);
                state.data[key] = await res.json();
            } catch { /* no-op */ }
        }
    }
    renderDashboard();
    renderSlider();
    renderPortfolio('misa');
    renderPortfolio('jeydem');
    renderNewsList();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
    const slides   = state.data.slider?.slides?.length  ?? '–';
    const misaImgs = state.data.misa?.gallery?.length   ?? '–';
    const jeyImgs  = state.data.jeydem?.gallery?.length ?? '–';
    const posts    = (state.data.news?.posts || []).filter(p => p.published).length;

    document.getElementById('stat-slides').textContent = slides;
    document.getElementById('stat-misa').textContent   = misaImgs;
    document.getElementById('stat-jeydem').textContent = jeyImgs;
    document.getElementById('stat-posts').textContent  = posts;
}

// ─── SLIDER MANAGER ───────────────────────────────────────────────────────────
function renderSlider() {
    const list = document.getElementById('slider-list');
    const slides = state.data.slider?.slides || [];

    if (slides.length === 0) {
        list.innerHTML = '<li class="item-list-entry"><span class="item-label" style="color:var(--text-muted)">Keine Slides vorhanden.</span></li>';
        return;
    }

    list.innerHTML = slides.map((s, i) => `
        <li class="item-list-entry">
            <img class="item-thumb" src="../${s.src}" alt="${s.alt}" onerror="this.style.display='none'">
            <span class="item-label">${s.src}</span>
            <div class="item-actions">
                ${i > 0 ? `<button class="btn btn-secondary btn-sm" onclick="moveSlide(${i},-1)">↑</button>` : ''}
                ${i < slides.length - 1 ? `<button class="btn btn-secondary btn-sm" onclick="moveSlide(${i},1)">↓</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="removeSlide(${i})">×</button>
            </div>
        </li>`).join('');
}

document.getElementById('add-slide-form').addEventListener('submit', e => {
    e.preventDefault();
    const src = document.getElementById('slide-src').value.trim();
    const alt = document.getElementById('slide-alt').value.trim();
    if (!src) return;

    if (!state.data.slider) state.data.slider = { slides: [], interval: 5000 };
    state.data.slider.slides.push({ src, alt });
    document.getElementById('slide-src').value = '';
    document.getElementById('slide-alt').value = '';
    renderSlider();
});

function moveSlide(i, dir) {
    const slides = state.data.slider.slides;
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    [slides[i], slides[j]] = [slides[j], slides[i]];
    renderSlider();
}

function removeSlide(i) {
    if (!confirm('Slide entfernen?')) return;
    state.data.slider.slides.splice(i, 1);
    renderSlider();
}

document.getElementById('save-slider-btn').addEventListener('click', () =>
    saveSection('slider', 'slider-save-alert'));

// ─── PORTFOLIO MANAGER ────────────────────────────────────────────────────────
function renderPortfolio(artist) {
    const list   = document.getElementById(`portfolio-list-${artist}`);
    const images = state.data[artist]?.gallery || [];

    if (images.length === 0) {
        list.innerHTML = '<li class="item-list-entry"><span class="item-label" style="color:var(--text-muted)">Keine Bilder vorhanden.</span></li>';
        return;
    }

    list.innerHTML = images.map((img, i) => `
        <li class="item-list-entry">
            <img class="item-thumb" src="../${img.src}" alt="${img.alt}" onerror="this.style.display='none'">
            <span class="item-label">${img.src}</span>
            <div class="item-actions">
                ${i > 0 ? `<button class="btn btn-secondary btn-sm" onclick="movePortfolioImg('${artist}',${i},-1)">↑</button>` : ''}
                ${i < images.length - 1 ? `<button class="btn btn-secondary btn-sm" onclick="movePortfolioImg('${artist}',${i},1)">↓</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="removePortfolioImg('${artist}',${i})">×</button>
            </div>
        </li>`).join('');
}

document.getElementById('add-misa-form').addEventListener('submit', e => addPortfolioImg(e, 'misa'));
document.getElementById('add-jeydem-form').addEventListener('submit', e => addPortfolioImg(e, 'jeydem'));

function addPortfolioImg(e, artist) {
    e.preventDefault();
    const src = document.getElementById(`${artist}-img-src`).value.trim();
    const alt = document.getElementById(`${artist}-img-alt`).value.trim();
    if (!src) return;
    if (!state.data[artist]) state.data[artist] = { artist, gallery: [] };
    state.data[artist].gallery.push({ src, alt });
    document.getElementById(`${artist}-img-src`).value = '';
    document.getElementById(`${artist}-img-alt`).value = '';
    renderPortfolio(artist);
}

function movePortfolioImg(artist, i, dir) {
    const gallery = state.data[artist].gallery;
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
    renderPortfolio(artist);
}

function removePortfolioImg(artist, i) {
    if (!confirm('Bild entfernen?')) return;
    state.data[artist].gallery.splice(i, 1);
    renderPortfolio(artist);
}

document.getElementById('save-misa-btn').addEventListener('click', () =>
    saveSection('misa', 'misa-save-alert'));
document.getElementById('save-jeydem-btn').addEventListener('click', () =>
    saveSection('jeydem', 'jeydem-save-alert'));

// Portfolio tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.closest('.tabs').parentElement;
        parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        parent.querySelector(`#${btn.dataset.tab}`).classList.add('active');
    });
});

// ─── NEWS MANAGER ─────────────────────────────────────────────────────────────
function renderNewsList() {
    const list  = document.getElementById('news-post-list');
    const posts = state.data.news?.posts || [];

    if (posts.length === 0) {
        list.innerHTML = '<div class="post-entry"><span style="color:var(--text-muted)">Noch keine Beiträge vorhanden.</span></div>';
        return;
    }

    list.innerHTML = posts.map(post => `
        <div class="post-entry">
            <div class="post-entry-title">${post.title}</div>
            <div class="post-entry-date">${post.date}</div>
            <span class="badge ${post.published ? 'badge-published' : 'badge-draft'}">${post.published ? 'Live' : 'Entwurf'}</span>
            <div class="item-actions">
                <button class="btn btn-secondary btn-sm" onclick="editPost('${post.id}')">Bearbeiten</button>
                <button class="btn btn-danger btn-sm" onclick="deletePost('${post.id}')">Löschen</button>
            </div>
        </div>`).join('');
}

document.getElementById('new-post-btn').addEventListener('click', () => {
    state.editingPostId = null;
    clearPostForm();
    document.getElementById('post-form-section').style.display = 'block';
    document.getElementById('post-form-section').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('cancel-post-btn').addEventListener('click', () => {
    document.getElementById('post-form-section').style.display = 'none';
    state.editingPostId = null;
});

document.getElementById('post-form').addEventListener('submit', e => {
    e.preventDefault();
    savePost();
});

function clearPostForm() {
    document.getElementById('post-title').value   = '';
    document.getElementById('post-date').value    = new Date().toISOString().split('T')[0];
    document.getElementById('post-excerpt').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-tags').value    = '';
    document.getElementById('post-image').value   = '';
    document.getElementById('post-published').checked = true;
    document.getElementById('post-form-title').textContent = 'Neuer Beitrag';
}

function editPost(id) {
    const post = state.data.news.posts.find(p => p.id === id);
    if (!post) return;
    state.editingPostId = id;
    document.getElementById('post-title').value   = post.title;
    document.getElementById('post-date').value    = post.date;
    document.getElementById('post-excerpt').value = post.excerpt;
    document.getElementById('post-content').value = post.content;
    document.getElementById('post-tags').value    = (post.tags || []).join(', ');
    document.getElementById('post-image').value   = post.image || '';
    document.getElementById('post-published').checked = post.published;
    document.getElementById('post-form-title').textContent = 'Beitrag bearbeiten';
    document.getElementById('post-form-section').style.display = 'block';
    document.getElementById('post-form-section').scrollIntoView({ behavior: 'smooth' });
}

function savePost() {
    const title     = document.getElementById('post-title').value.trim();
    const date      = document.getElementById('post-date').value;
    const excerpt   = document.getElementById('post-excerpt').value.trim();
    const content   = document.getElementById('post-content').value.trim();
    const tagsRaw   = document.getElementById('post-tags').value;
    const image     = document.getElementById('post-image').value.trim();
    const published = document.getElementById('post-published').checked;
    const tags      = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    if (!state.data.news) state.data.news = { posts: [] };

    if (state.editingPostId) {
        const idx = state.data.news.posts.findIndex(p => p.id === state.editingPostId);
        if (idx !== -1) {
            state.data.news.posts[idx] = { ...state.data.news.posts[idx], title, date, excerpt, content, tags, image, published };
        }
    } else {
        const id = slugify(title) + '-' + Date.now();
        state.data.news.posts.unshift({ id, title, slug: id, date, excerpt, content, image, tags, published });
    }

    renderNewsList();
    document.getElementById('post-form-section').style.display = 'none';
    state.editingPostId = null;
}

function deletePost(id) {
    if (!confirm('Beitrag wirklich löschen?')) return;
    state.data.news.posts = state.data.news.posts.filter(p => p.id !== id);
    renderNewsList();
}

document.getElementById('save-news-btn').addEventListener('click', () =>
    saveSection('news', 'news-save-alert'));

// ─── SAVE TO GITHUB ───────────────────────────────────────────────────────────
async function saveSection(key, alertId) {
    const btn = document.getElementById(`save-${key === 'misa' ? 'misa' : key === 'jeydem' ? 'jeydem' : key}-btn`);
    if (btn) btn.disabled = true;

    try {
        const newSha = await writeGitHubFile(CONTENT_FILES[key], state.data[key], state.sha[key]);
        state.sha[key] = newSha;
        showAlert(alertId, 'Erfolgreich gespeichert! GitHub Pages wird automatisch aktualisiert.', 'success');
    } catch (err) {
        showAlert(alertId, `Fehler: ${err.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Export JSON as fallback (no GitHub API needed)
document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
        const key  = btn.dataset.export;
        const data = state.data[key];
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = CONTENT_FILES[key].split('/').pop();
        a.click();
        URL.revokeObjectURL(a.href);
    });
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function sha256(str) {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function slugify(str) {
    return str.toLowerCase()
        .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function showAlert(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
}
