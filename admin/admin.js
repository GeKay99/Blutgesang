// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CONTENT_KEYS = ['slider', 'misa', 'jaydem', 'news', 'artists'];

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
    authenticated: false,
    data: { slider: null, misa: null, jaydem: null, news: null },
    editingPostId: null
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const res = await api('api/auth.php', { action: 'check' });
    if (res.ok) {
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
    initDropZones();
}

document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw   = document.getElementById('pw-input').value;
    const hash = await sha256(pw);
    const res  = await api('api/auth.php', { action: 'login', hash });
    if (res.ok) {
        showAdmin();
    } else {
        showAlert('login-alert', res.error || 'Falsches Passwort.', 'error');
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('api/auth.php', { action: 'logout' });
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

// ─── PASSWORD CHANGE ──────────────────────────────────────────────────────────
document.getElementById('settings-pw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw  = document.getElementById('new-pw').value;
    const pw2 = document.getElementById('new-pw2').value;
    if (pw !== pw2) { showAlert('pw-alert', 'Passwörter stimmen nicht überein.', 'error'); return; }
    if (pw.length < 8) { showAlert('pw-alert', 'Mindestens 8 Zeichen erforderlich.', 'error'); return; }
    const hash = await sha256(pw);
    const res  = await api('api/auth.php', { action: 'change_password', hash });
    if (res.ok) {
        showAlert('pw-alert', 'Passwort erfolgreich geändert.', 'success');
        document.getElementById('new-pw').value  = '';
        document.getElementById('new-pw2').value = '';
    } else {
        showAlert('pw-alert', res.error || 'Fehler beim Speichern.', 'error');
    }
});

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function api(endpoint, body) {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'same-origin'
        });
        if (res.status === 401) return { ok: false, error: 'Sitzung abgelaufen – bitte neu anmelden.' };
        return await res.json();
    } catch {
        return { ok: false, error: 'Netzwerkfehler – ist der Server erreichbar?' };
    }
}

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
async function uploadFile(file, target) {
    const form = new FormData();
    form.append('target', target);
    form.append('file', file);
    try {
        const res = await fetch('api/upload.php', {
            method: 'POST',
            body: form,
            credentials: 'same-origin'
        });
        return await res.json();
    } catch {
        return { ok: false, error: 'Upload fehlgeschlagen' };
    }
}

// ─── FILE DELETE ──────────────────────────────────────────────────────────────
async function deleteFile(src) {
    return api('api/delete.php', { src });
}

// ─── DROP ZONES ───────────────────────────────────────────────────────────────
function initDropZones() {
    // Portfolio drop zones — upload + add to gallery + auto-save
    initDropZone('drop-misa',   'misa',   'status-misa',   (res) => {
        if (!state.data.misa) state.data.misa = { artist: 'Misa', gallery: [] };
        state.data.misa.gallery.push({ src: res.src, alt: 'Misa Tattoo' });
        renderPortfolio('misa');
        saveSection('misa', 'misa-save-alert');
    });
    initDropZone('drop-jaydem', 'jaydem', 'status-jaydem', (res) => {
        if (!state.data.jaydem) state.data.jaydem = { artist: 'Jaydem', gallery: [] };
        state.data.jaydem.gallery.push({ src: res.src, alt: 'Jaydem Tattoo' });
        renderPortfolio('jaydem');
        saveSection('jaydem', 'jaydem-save-alert');
    });

    // Slider drop zone — upload + add to slides + auto-save
    initDropZone('drop-slider', 'slider', 'status-slider', (res) => {
        if (!state.data.slider) state.data.slider = { slides: [], interval: 5000 };
        const alt = res.filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        state.data.slider.slides.push({ src: res.src, alt });
        renderSlider();
        saveSection('slider', 'slider-save-alert');
    });

    // News title image drop zone — upload only, sets input value
    initDropZone('drop-news-img', 'news', 'status-news-img', (res) => {
        document.getElementById('post-image').value = res.src;
    }, true); // single-file mode

    // Artist profile image drop zones — single file, updates artists.json
    initDropZone('drop-artist-misa', 'artists', 'status-artist-misa', (res) => {
        if (!state.data.artists) state.data.artists = {};
        if (!state.data.artists.misa) state.data.artists.misa = {};
        state.data.artists.misa.image = res.src;
        const img = document.getElementById('preview-artist-misa');
        if (img) { img.src = '../' + res.src; img.style.display = ''; }
        saveSection('artists', 'artists-save-alert');
    }, true);

    initDropZone('drop-artist-jaydem', 'artists', 'status-artist-jaydem', (res) => {
        if (!state.data.artists) state.data.artists = {};
        if (!state.data.artists.jaydem) state.data.artists.jaydem = {};
        state.data.artists.jaydem.image = res.src;
        const img = document.getElementById('preview-artist-jaydem');
        if (img) { img.src = '../' + res.src; img.style.display = ''; }
        saveSection('artists', 'artists-save-alert');
    }, true);
}

function initDropZone(zoneId, target, statusId, onSuccess, single = false) {
    const zone   = document.getElementById(zoneId);
    const input  = document.getElementById(zoneId.replace('drop-', 'file-'));
    const status = document.getElementById(statusId);
    if (!zone || !input) return;

    // Click to open file picker
    zone.addEventListener('click', e => {
        if (e.target === input) return;
        input.click();
    });

    // Drag events
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        processFiles(Array.from(e.dataTransfer.files), target, status, onSuccess, single);
    });

    // File input change
    input.addEventListener('change', () => {
        processFiles(Array.from(input.files), target, status, onSuccess, single);
        input.value = '';
    });
}

async function processFiles(files, target, statusEl, onSuccess, single) {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) {
        setStatus(statusEl, 'Nur Bilddateien erlaubt.', 'err');
        return;
    }

    const toUpload = single ? [images[0]] : images;

    for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        setStatus(statusEl, `Lade hoch ${i + 1}/${toUpload.length}: ${file.name}…`);
        const res = await uploadFile(file, target);
        if (res.ok) {
            onSuccess(res);
        } else {
            setStatus(statusEl, `Fehler: ${res.error}`, 'err');
            return;
        }
    }

    setStatus(statusEl, `${toUpload.length} Datei${toUpload.length > 1 ? 'en' : ''} hochgeladen.`, 'ok');
    setTimeout(() => setStatus(statusEl, ''), 4000);
}

function setStatus(el, msg, cls = '') {
    if (!el) return;
    el.textContent = msg;
    el.className   = 'upload-status' + (cls ? ' ' + cls : '');
}

// ─── LOAD ALL DATA ────────────────────────────────────────────────────────────
async function loadAllData() {
    const res = await api('api/load.php', {});
    if (!res.ok) {
        showAlert('dashboard-alert', res.error || 'Fehler beim Laden der Inhalte.', 'error');
        return;
    }
    for (const key of CONTENT_KEYS) {
        state.data[key] = res.data[key];
    }
    renderDashboard();
    renderSlider();
    renderPortfolio('misa');
    renderPortfolio('jaydem');
    renderNewsList();
    renderArtists();
}

// ─── SAVE TO SERVER ───────────────────────────────────────────────────────────
async function saveSection(key, alertId) {
    const btn = document.getElementById(`save-${key}-btn`);
    if (btn) btn.disabled = true;

    const res = await api('api/save.php', { key, content: state.data[key] });
    if (res.ok) {
        showAlert(alertId, 'Erfolgreich gespeichert!', 'success');
    } else {
        showAlert(alertId, `Fehler: ${res.error}`, 'error');
    }
    if (btn) btn.disabled = false;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
    const slides   = state.data.slider?.slides?.length  ?? '–';
    const misaImgs = state.data.misa?.gallery?.length   ?? '–';
    const jeyImgs  = state.data.jaydem?.gallery?.length ?? '–';
    const posts    = (state.data.news?.posts || []).filter(p => p.published).length;

    document.getElementById('stat-slides').textContent = slides;
    document.getElementById('stat-misa').textContent   = misaImgs;
    document.getElementById('stat-jaydem').textContent = jeyImgs;
    document.getElementById('stat-posts').textContent  = posts;
}

// ─── SLIDER MANAGER ───────────────────────────────────────────────────────────
function renderSlider() {
    const list   = document.getElementById('slider-list');
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
                <button class="btn btn-danger btn-sm" onclick="removePortfolioImg('${artist}',${i})">Löschen</button>
            </div>
        </li>`).join('');
}

async function removePortfolioImg(artist, i) {
    const img = state.data[artist]?.gallery?.[i];
    if (!img) return;
    if (!confirm(`Bild "${img.src}" wirklich löschen?\nDie Datei wird dauerhaft vom Server entfernt.`)) return;

    // Disable all delete buttons while working
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = true);

    const res = await deleteFile(img.src);
    if (!res.ok) {
        showAlert(`${artist}-save-alert`, `Datei konnte nicht gelöscht werden: ${res.error}`, 'error');
        document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
        return;
    }

    state.data[artist].gallery.splice(i, 1);
    renderPortfolio(artist);
    renderDashboard();
    await saveSection(artist, `${artist}-save-alert`);
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
}

function movePortfolioImg(artist, i, dir) {
    const gallery = state.data[artist].gallery;
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
    renderPortfolio(artist);
}

document.getElementById('save-misa-btn').addEventListener('click', () =>
    saveSection('misa', 'misa-save-alert'));
document.getElementById('save-jaydem-btn').addEventListener('click', () =>
    saveSection('jaydem', 'jaydem-save-alert'));

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

// ─── ARTISTS MANAGER ──────────────────────────────────────────────────────────
function renderArtists() {
    const misa   = state.data.artists?.misa   || {};
    const jaydem = state.data.artists?.jaydem || {};

    const setField = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    const setImg   = (id, src) => {
        const el = document.getElementById(id);
        if (el && src) { el.src = '../' + src; el.style.display = ''; }
    };

    setField('artist-misa-spec',   misa.specializedIn);
    setField('artist-misa-ig-dm',  misa.instagramDm);
    setImg  ('preview-artist-misa', misa.image);

    setField('artist-jaydem-spec',   jaydem.specializedIn);
    setField('artist-jaydem-ig-dm',  jaydem.instagramDm);
    setImg  ('preview-artist-jaydem', jaydem.image);
}

function collectArtistFields() {
    const read = id => (document.getElementById(id)?.value || '').trim();
    if (!state.data.artists) state.data.artists = {};
    const a = state.data.artists;

    if (!a.misa)   a.misa   = {};
    if (!a.jaydem) a.jaydem = {};

    a.misa.specializedIn  = read('artist-misa-spec')   || a.misa.specializedIn;
    a.misa.instagramDm    = read('artist-misa-ig-dm')  || a.misa.instagramDm;
    a.jaydem.specializedIn = read('artist-jaydem-spec') || a.jaydem.specializedIn;
    a.jaydem.instagramDm   = read('artist-jaydem-ig-dm')|| a.jaydem.instagramDm;
}

document.getElementById('save-artists-btn').addEventListener('click', () => {
    collectArtistFields();
    saveSection('artists', 'artists-save-alert');
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

document.getElementById('post-form').addEventListener('submit', async e => {
    e.preventDefault();
    await savePost();
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

async function savePost() {
    const title     = document.getElementById('post-title').value.trim();
    const date      = document.getElementById('post-date').value;
    const excerpt   = document.getElementById('post-excerpt').value.trim();
    const content   = document.getElementById('post-content').value.trim();
    const tagsRaw   = document.getElementById('post-tags').value;
    const image     = document.getElementById('post-image').value.trim();
    const published = document.getElementById('post-published').checked;
    const tags      = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    if (!title || !date || !excerpt || !content) {
        showAlert('news-save-alert', 'Bitte Titel, Datum, Kurzbeschreibung und Inhalt ausfüllen.', 'error');
        return;
    }

    if (!state.data.news) state.data.news = { posts: [] };

    if (state.editingPostId) {
        const idx = state.data.news.posts.findIndex(p => p.id === state.editingPostId);
        if (idx !== -1) {
            state.data.news.posts[idx] = {
                ...state.data.news.posts[idx],
                title, date, excerpt, content, tags, image, published
            };
        }
    } else {
        const id = slugify(title) + '-' + Date.now();
        state.data.news.posts.unshift({ id, title, slug: id, date, excerpt, content, image, tags, published });
    }

    document.getElementById('post-form-section').style.display = 'none';
    state.editingPostId = null;
    renderNewsList();
    renderDashboard();

    // Auto-save to server immediately
    await saveSection('news', 'news-save-alert');
}

function deletePost(id) {
    if (!confirm('Beitrag wirklich löschen?')) return;
    state.data.news.posts = state.data.news.posts.filter(p => p.id !== id);
    renderNewsList();
    renderDashboard();
    saveSection('news', 'news-save-alert');
}

document.getElementById('save-news-btn').addEventListener('click', () =>
    saveSection('news', 'news-save-alert'));

// Export JSON as fallback
document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
        const key  = btn.dataset.export;
        const data = state.data[key];
        if (!data) return;
        const filenames = { slider: 'slider.json', misa: 'portfolio-misa.json', jaydem: 'portfolio-jaydem.json', news: 'news.json' };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filenames[key] || `${key}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    });
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
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
    el.className      = `alert alert-${type}`;
    el.textContent    = msg;
    el.style.display  = 'flex';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.style.display = 'none'; }, 6000);
}
