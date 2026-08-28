// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
    authenticated: false,
    data: { slider: null, news: null, artists: null, 'ueber-uns': null, impressum: null, portfolios: {} },
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

// ─── MOBILE HAMBURGER ─────────────────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const sidebarEl    = document.querySelector('.sidebar');
const overlayEl    = document.getElementById('sidebar-overlay');

function closeSidebar() {
    sidebarEl.classList.remove('open');
    overlayEl.classList.remove('visible');
    hamburgerBtn.classList.remove('open');
    hamburgerBtn.setAttribute('aria-label', 'Navigation öffnen');
}

hamburgerBtn.addEventListener('click', () => {
    if (sidebarEl.classList.contains('open')) {
        closeSidebar();
    } else {
        sidebarEl.classList.add('open');
        overlayEl.classList.add('visible');
        hamburgerBtn.classList.add('open');
        hamburgerBtn.setAttribute('aria-label', 'Navigation schließen');
    }
});

overlayEl.addEventListener('click', closeSidebar);

// Close drawer when a nav item is tapped on mobile
document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
});

document.getElementById('mobile-logout-btn').addEventListener('click', async () => {
    await api('api/auth.php', { action: 'logout' });
    closeSidebar();
    showLogin();
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

// ─── DROP ZONES (static targets: slider, news, über-uns) ─────────────────────
function initDropZones() {
    // Slider drop zone — upload + add to slides + auto-save
    initDropZone('drop-slider', 'slider', 'status-slider', (res) => {
        if (!state.data.slider) state.data.slider = { slides: [], interval: 5000 };
        const alt  = res.filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        const type = /\.(mp4|webm|ogv)$/i.test(res.src) ? 'video' : 'image';
        state.data.slider.slides.push({ src: res.src, alt, type });
        renderSlider();
        saveSection('slider', 'slider-save-alert');
    });

    // News title image drop zone — upload only, sets input value
    initDropZone('drop-news-img', 'news', 'status-news-img', (res) => {
        document.getElementById('post-image').value = res.src;
    }, true); // single-file mode

    // Über-uns image drop zones
    initDropZone('drop-uu-story', 'ueber-uns', 'status-uu-story', (res) => {
        ensureUU();
        state.data['ueber-uns'].story.image = res.src;
        const img = document.getElementById('preview-uu-story');
        if (img) { img.src = '../' + res.src; img.style.display = ''; }
        saveSection('ueber-uns', 'ueber-uns-save-alert');
    }, true);

    initDropZone('drop-uu-studio', 'ueber-uns', 'status-uu-studio', (res) => {
        ensureUU();
        state.data['ueber-uns'].studio.image = res.src;
        const img = document.getElementById('preview-uu-studio');
        if (img) { img.src = '../' + res.src; img.style.display = ''; }
        saveSection('ueber-uns', 'ueber-uns-save-alert');
    }, true);
}

// Re-bound every time the artist tabs are (re-)rendered, since the drop zones
// themselves are recreated (one portfolio zone + one profile-image zone per artist).
function initArtistDropZones() {
    artistSlugs().forEach(slug => {
        initDropZone(`drop-portfolio-${slug}`, `portfolio:${slug}`, `status-portfolio-${slug}`, (res) => {
            if (!state.data.portfolios[slug]) state.data.portfolios[slug] = { artist: slug, gallery: [] };
            state.data.portfolios[slug].gallery.push({ src: res.src, alt: (state.data.artists[slug]?.name || slug) + ' Tattoo' });
            renderPortfolioList(slug);
            renderDashboard();
            saveSection(`portfolio:${slug}`, `portfolio-${slug}-save-alert`);
        });

        initDropZone(`drop-artist-${slug}`, 'artists', `status-artist-${slug}`, (res) => {
            state.data.artists[slug].image = res.src;
            const img = document.getElementById(`preview-artist-${slug}`);
            if (img) { img.src = '../' + res.src; img.style.display = ''; }
            saveSection('artists', 'artists-save-alert');
        }, true);
    });
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
    const media = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (media.length === 0) {
        setStatus(statusEl, 'Nur Bild- oder Videodateien erlaubt.', 'err');
        return;
    }

    const toUpload = single ? [media[0]] : media;

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
    state.data = res.data;
    if (!state.data.artists) state.data.artists = {};
    if (!state.data.portfolios) state.data.portfolios = {};

    renderDashboard();
    renderSlider();
    renderPortfolioTabs();
    renderNewsList();
    renderArtistTabs();
    renderUeberUns();
    renderImpressum();
    initArtistDropZones();
}

// ─── SAVE TO SERVER ───────────────────────────────────────────────────────────
async function saveSection(key, alertId) {
    const btn = document.getElementById(`save-${key}-btn`);
    if (btn) btn.disabled = true;

    const content = key.startsWith('portfolio:') ? state.data.portfolios[key.slice('portfolio:'.length)] : state.data[key];
    const res = await api('api/save.php', { key, content });
    if (res.ok) {
        showAlert(alertId, 'Erfolgreich gespeichert!', 'success');
    } else {
        showAlert(alertId, `Fehler: ${res.error}`, 'error');
    }
    if (btn) btn.disabled = false;
}

// ─── SMALL HTML HELPER ────────────────────────────────────────────────────────
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function artistSlugs() {
    return Object.keys(state.data.artists || {});
}

// ─── TAB SWITCHING (delegated so it also works for dynamically added tabs) ───
document.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const parent = btn.closest('.tabs').parentElement;
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = parent.querySelector('#' + CSS.escape(btn.dataset.tab));
    if (panel) panel.classList.add('active');
});

// Export JSON as fallback (delegated — export buttons are created dynamically
// for portfolio/artist panels too)
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-export]');
    if (!btn) return;
    const key = btn.dataset.export;
    let data, filename;
    if (key.startsWith('portfolio:')) {
        const slug = key.slice('portfolio:'.length);
        data = state.data.portfolios[slug];
        filename = `portfolio-${slug}.json`;
    } else {
        data = state.data[key];
        filename = { slider: 'slider.json', news: 'news.json', artists: 'artists.json' }[key] || `${key}.json`;
    }
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
});

// Save buttons for dynamically created portfolio panels
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-save-portfolio]');
    if (!btn) return;
    const slug = btn.dataset.savePortfolio;
    saveSection(`portfolio:${slug}`, `portfolio-${slug}-save-alert`);
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
    const slides = state.data.slider?.slides?.length ?? '–';
    const posts  = (state.data.news?.posts || []).filter(p => p.published).length;

    document.getElementById('stat-slides').textContent = slides;
    document.getElementById('stat-posts').textContent  = posts;

    const container = document.getElementById('artist-stat-cards');
    if (container) {
        container.innerHTML = artistSlugs().map(slug => {
            const count = state.data.portfolios[slug]?.gallery?.length ?? 0;
            const name  = esc(state.data.artists[slug]?.name || slug);
            return `<div class="stat-card"><div class="stat-num">${count}</div><div class="stat-label">Portfolio ${name}</div></div>`;
        }).join('');
    }
}

// ─── SLIDER MANAGER ───────────────────────────────────────────────────────────
function renderSlider() {
    const list   = document.getElementById('slider-list');
    const slides = state.data.slider?.slides || [];

    if (slides.length === 0) {
        list.innerHTML = '<li class="item-list-entry"><span class="item-label" style="color:var(--text-muted)">Keine Slides vorhanden.</span></li>';
        return;
    }

    list.innerHTML = slides.map((s, i) => {
        const thumb = s.type === 'video'
            ? `<span class="item-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg-light-dark);font-size:1.4rem">▶</span>`
            : `<img class="item-thumb" src="../${s.src}" alt="${s.alt}" onerror="this.style.display='none'">`;
        return `
        <li class="item-list-entry">
            ${thumb}
            <span class="item-label">${s.src}</span>
            <div class="item-actions">
                ${i > 0 ? `<button class="btn btn-secondary btn-sm" onclick="moveSlide(${i},-1)">↑</button>` : ''}
                ${i < slides.length - 1 ? `<button class="btn btn-secondary btn-sm" onclick="moveSlide(${i},1)">↓</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="removeSlide(${i})">×</button>
            </div>
        </li>`;
    }).join('');
}


function moveSlide(i, dir) {
    const slides = state.data.slider.slides;
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    [slides[i], slides[j]] = [slides[j], slides[i]];
    renderSlider();
}

async function removeSlide(i) {
    const slide = state.data.slider.slides[i];
    if (!slide) return;
    if (!confirm(`Slide entfernen?\nDie Datei wird dauerhaft vom Server entfernt.`)) return;
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = true);
    if (slide.src) {
        const res = await deleteFile(slide.src);
        if (!res.ok) {
            showAlert('slider-save-alert', `Datei konnte nicht gelöscht werden: ${res.error}`, 'error');
            document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
            return;
        }
    }
    state.data.slider.slides.splice(i, 1);
    renderSlider();
    renderDashboard();
    await saveSection('slider', 'slider-save-alert');
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
}

document.getElementById('save-slider-btn').addEventListener('click', () =>
    saveSection('slider', 'slider-save-alert'));

// ─── PORTFOLIO MANAGER ────────────────────────────────────────────────────────
function renderPortfolioTabs() {
    const tabsEl   = document.getElementById('portfolio-tabs');
    const panelsEl = document.getElementById('portfolio-panels');
    const slugs    = artistSlugs();

    if (slugs.length === 0) {
        tabsEl.innerHTML   = '';
        panelsEl.innerHTML = '<p style="color:var(--text-muted)">Noch keine Artists angelegt. Lege zuerst einen Artist im Bereich "Artists" an.</p>';
        return;
    }

    tabsEl.innerHTML = slugs.map((slug, i) => {
        const name = esc(state.data.artists[slug]?.name || slug);
        return `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="tab-portfolio-${slug}">${name}</button>`;
    }).join('');

    panelsEl.innerHTML = slugs.map((slug, i) => {
        const name = esc(state.data.artists[slug]?.name || slug);
        return `
        <div id="tab-portfolio-${slug}" class="tab-panel${i === 0 ? ' active' : ''}">
            <div id="portfolio-${slug}-save-alert" class="alert" style="display:none"></div>
            <ul id="portfolio-list-${slug}" class="item-list"></ul>

            <div class="drop-zone" id="drop-portfolio-${slug}" data-target="portfolio:${slug}">
                <input type="file" accept="image/*" multiple hidden id="file-portfolio-${slug}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <p><strong>Bilder hierher ziehen</strong> oder klicken zum Auswählen</p>
                <p style="margin-top:4px;font-size:0.75rem">Dateien werden direkt in den ${name}-Portfolio-Ordner hochgeladen</p>
                <div class="upload-status" id="status-portfolio-${slug}"></div>
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" data-save-portfolio="${slug}">Speichern</button>
                <button class="btn btn-secondary" data-export="portfolio:${slug}">JSON herunterladen</button>
            </div>
        </div>`;
    }).join('');

    slugs.forEach(renderPortfolioList);
}

function renderPortfolioList(slug) {
    const list   = document.getElementById(`portfolio-list-${slug}`);
    if (!list) return;
    const images = state.data.portfolios[slug]?.gallery || [];

    if (images.length === 0) {
        list.innerHTML = '<li class="item-list-entry"><span class="item-label" style="color:var(--text-muted)">Keine Bilder vorhanden.</span></li>';
        return;
    }

    list.innerHTML = images.map((img, i) => `
        <li class="item-list-entry">
            <img class="item-thumb" src="../${img.src}" alt="${esc(img.alt)}" onerror="this.style.display='none'">
            <span class="item-label">${img.src}</span>
            <div class="item-actions">
                ${i > 0 ? `<button class="btn btn-secondary btn-sm" onclick="movePortfolioImg('${slug}',${i},-1)">↑</button>` : ''}
                ${i < images.length - 1 ? `<button class="btn btn-secondary btn-sm" onclick="movePortfolioImg('${slug}',${i},1)">↓</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="removePortfolioImg('${slug}',${i})">Löschen</button>
            </div>
        </li>`).join('');
}

async function removePortfolioImg(slug, i) {
    const img = state.data.portfolios[slug]?.gallery?.[i];
    if (!img) return;
    if (!confirm(`Bild "${img.src}" wirklich löschen?\nDie Datei wird dauerhaft vom Server entfernt.`)) return;

    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = true);

    const res = await deleteFile(img.src);
    if (!res.ok) {
        showAlert(`portfolio-${slug}-save-alert`, `Datei konnte nicht gelöscht werden: ${res.error}`, 'error');
        document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
        return;
    }

    state.data.portfolios[slug].gallery.splice(i, 1);
    renderPortfolioList(slug);
    renderDashboard();
    await saveSection(`portfolio:${slug}`, `portfolio-${slug}-save-alert`);
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
}

function movePortfolioImg(slug, i, dir) {
    const gallery = state.data.portfolios[slug].gallery;
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
    renderPortfolioList(slug);
}

// ─── ARTISTS MANAGER ──────────────────────────────────────────────────────────
function renderArtistTabs() {
    const tabsEl   = document.getElementById('artist-tabs');
    const panelsEl = document.getElementById('artist-panels');
    const slugs    = artistSlugs();

    if (slugs.length === 0) {
        tabsEl.innerHTML   = '';
        panelsEl.innerHTML = '<p style="color:var(--text-muted)">Noch keine Artists angelegt.</p>';
        return;
    }

    tabsEl.innerHTML = slugs.map((slug, i) => {
        const name = esc(state.data.artists[slug]?.name || slug);
        return `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="tab-artist-${slug}">${name}</button>`;
    }).join('');

    panelsEl.innerHTML = slugs.map((slug, i) => {
        const a = state.data.artists[slug] || {};
        return `
        <div id="tab-artist-${slug}" class="tab-panel${i === 0 ? ' active' : ''}" style="max-width:560px">
            <div class="form-group">
                <label>Profilbild</label>
                <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
                    <img id="preview-artist-${slug}" src="${a.image ? '../' + esc(a.image) : ''}" alt="${esc(a.name || slug)}"
                         style="width:80px;height:80px;object-fit:cover;border:1px solid var(--border);${a.image ? '' : 'display:none;'}"
                         onerror="this.style.display='none'">
                    <span style="color:var(--text-muted);font-size:0.8rem">Aktuelles Bild</span>
                </div>
                <div class="drop-zone drop-zone-sm" id="drop-artist-${slug}">
                    <input type="file" accept="image/*" hidden id="file-artist-${slug}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    <p>Neues Bild hochladen (ersetzt aktuelles)</p>
                    <div class="upload-status" id="status-artist-${slug}"></div>
                </div>
            </div>
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="artist-${slug}-name" value="${esc(a.name)}" placeholder="z.B. Misa Tattoo">
            </div>
            <div class="form-group">
                <label>Spezialisierung (erscheint auf der Artist-Seite)</label>
                <input type="text" id="artist-${slug}-spec" value="${esc(a.specializedIn)}" placeholder="z.B. Fineline & Blackwork">
            </div>
            <div class="form-group">
                <label>Kurztext auf der Artists-Übersichtsseite</label>
                <textarea id="artist-${slug}-bio" rows="3" placeholder="Kurze Beschreibung für die Übersichtsseite (artists.html)">${esc(a.bio)}</textarea>
            </div>
            <div class="form-group">
                <label>Detailtext auf der Portfolio-Seite</label>
                <textarea id="artist-${slug}-bio-detail" rows="4" placeholder="Ausführlichere Beschreibung für die individuelle Portfolio-Seite">${esc(a.bioDetail)}</textarea>
            </div>
            <div class="form-group">
                <label>Instagram-Profil (für den Footer-Link)</label>
                <input type="url" id="artist-${slug}-instagram" value="${esc(a.instagram)}" placeholder="https://www.instagram.com/benutzername/">
            </div>
            <div class="form-group">
                <label>Instagram DM-Link</label>
                <input type="url" id="artist-${slug}-ig-dm" value="${esc(a.instagramDm)}" placeholder="https://ig.me/m/benutzername">
            </div>
            <div class="form-group">
                <label>WhatsApp-Nummer (nur Ziffern, mit Ländervorwahl)</label>
                <input type="text" id="artist-${slug}-whatsapp" value="${esc(a.whatsapp)}" placeholder="491701234567">
            </div>
            <button class="btn btn-danger btn-sm" data-remove-artist="${slug}" style="margin-top:8px">Artist entfernen</button>
        </div>`;
    }).join('');
}

function collectArtistFields() {
    const read = id => (document.getElementById(id)?.value || '').trim();
    artistSlugs().forEach(slug => {
        const a = state.data.artists[slug];
        if (!a) return;
        a.name          = read(`artist-${slug}-name`)        || a.name;
        a.specializedIn = read(`artist-${slug}-spec`)        || a.specializedIn;
        a.bio           = read(`artist-${slug}-bio`)         || a.bio;
        a.bioDetail     = read(`artist-${slug}-bio-detail`)  || a.bioDetail;
        a.instagram     = read(`artist-${slug}-instagram`)   || a.instagram;
        a.instagramDm   = read(`artist-${slug}-ig-dm`)       || a.instagramDm;
        a.whatsapp      = read(`artist-${slug}-whatsapp`)    || a.whatsapp;
    });
}

document.getElementById('save-artists-btn').addEventListener('click', () => {
    collectArtistFields();
    saveSection('artists', 'artists-save-alert');
});

document.getElementById('add-artist-btn').addEventListener('click', async () => {
    const name = (prompt('Name des neuen Artists:') || '').trim();
    if (!name) return;

    let slug = slugify(name);
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        showAlert('artists-save-alert', 'Ungültiger Name für die Slug-Erzeugung.', 'error');
        return;
    }
    if (state.data.artists[slug]) {
        showAlert('artists-save-alert', `Ein Artist mit dem Kürzel "${slug}" existiert bereits.`, 'error');
        return;
    }

    state.data.artists[slug] = {
        name, specializedIn: '', image: '', instagram: '', instagramDm: '', whatsapp: '', bio: '', bioDetail: ''
    };
    state.data.portfolios[slug] = { artist: name, gallery: [] };

    renderArtistTabs();
    renderPortfolioTabs();
    renderDashboard();
    initArtistDropZones();

    await saveSection('artists', 'artists-save-alert');
    await saveSection(`portfolio:${slug}`, `portfolio-${slug}-save-alert`);
});

document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-remove-artist]');
    if (!btn) return;
    const slug = btn.dataset.removeArtist;
    const a    = state.data.artists[slug];
    if (!a) return;

    if (!confirm(`Artist "${a.name || slug}" wirklich entfernen?\nAlle Portfolio-Bilder und das Profilbild werden dauerhaft vom Server gelöscht.`)) return;

    btn.disabled = true;

    const gallery = state.data.portfolios[slug]?.gallery || [];
    for (const img of gallery) {
        if (img.src) await deleteFile(img.src);
    }
    if (a.image) await deleteFile(a.image);

    // Empty the artist's portfolio file first: saveSection() reads the content
    // out of state, so this has to happen before the slug is removed from it.
    state.data.portfolios[slug] = { artist: a.name || slug, gallery: [] };
    await saveSection(`portfolio:${slug}`, 'artists-save-alert');

    delete state.data.artists[slug];
    delete state.data.portfolios[slug];

    renderArtistTabs();
    renderPortfolioTabs();
    renderDashboard();
    initArtistDropZones();

    // Saved last so its success message is the one left on screen.
    await saveSection('artists', 'artists-save-alert');
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

async function deletePost(id) {
    const post = state.data.news.posts.find(p => p.id === id);
    if (!post) return;
    if (!confirm('Beitrag wirklich löschen?')) return;
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = true);
    if (post.image) {
        const res = await deleteFile(post.image);
        if (!res.ok) {
            showAlert('news-save-alert', `Bilddatei konnte nicht gelöscht werden: ${res.error}`, 'error');
            document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
            return;
        }
    }
    state.data.news.posts = state.data.news.posts.filter(p => p.id !== id);
    renderNewsList();
    renderDashboard();
    await saveSection('news', 'news-save-alert');
    document.querySelectorAll('.btn-danger').forEach(b => b.disabled = false);
}

document.getElementById('save-news-btn').addEventListener('click', () =>
    saveSection('news', 'news-save-alert'));

// ─── ÜBER UNS MANAGER ─────────────────────────────────────────────────────────
function ensureUU() {
    if (!state.data['ueber-uns']) state.data['ueber-uns'] = {};
    const d = state.data['ueber-uns'];
    if (!d.hero)   d.hero   = {};
    if (!d.story)  d.story  = {};
    if (!d.values) d.values = { items: [] };
    if (!d.studio) d.studio = {};
}

function renderUeberUns() {
    const d      = state.data['ueber-uns'] || {};
    const hero   = d.hero   || {};
    const story  = d.story  || {};
    const values = d.values || {};
    const studio = d.studio || {};

    const setF = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    const setImg = (id, src) => {
        const el = document.getElementById(id);
        if (el && src) { el.src = '../' + src; el.style.display = ''; }
    };

    setF('uu-hero-subtitle', hero.subtitle);

    setF('uu-story-tag',     story.tag);
    setF('uu-story-heading', story.heading);
    setF('uu-story-text1',   story.text1);
    setF('uu-story-text2',   story.text2);
    setImg('preview-uu-story', story.image);

    setF('uu-values-title', values.sectionTitle);
    (values.items || []).forEach((item, i) => {
        setF('uu-value-' + i + '-heading', item.heading);
        setF('uu-value-' + i + '-text',    item.text);
    });

    setF('uu-studio-tag',     studio.tag);
    setF('uu-studio-heading', studio.heading);
    setF('uu-studio-text1',   studio.text1);
    setF('uu-studio-text2',   studio.text2);
    setImg('preview-uu-studio', studio.image);
}

function collectUeberUnsFields() {
    const read = id => (document.getElementById(id)?.value || '').trim();
    ensureUU();
    const d = state.data['ueber-uns'];

    d.hero.subtitle    = read('uu-hero-subtitle')  || d.hero.subtitle;

    d.story.tag        = read('uu-story-tag')      || d.story.tag;
    d.story.heading    = read('uu-story-heading')  || d.story.heading;
    d.story.text1      = read('uu-story-text1')    || d.story.text1;
    d.story.text2      = read('uu-story-text2')    || d.story.text2;

    d.values.sectionTitle = read('uu-values-title') || d.values.sectionTitle;
    [0, 1, 2].forEach(i => {
        if (!d.values.items[i]) d.values.items[i] = {};
        d.values.items[i].heading = read('uu-value-' + i + '-heading') || d.values.items[i].heading;
        d.values.items[i].text    = read('uu-value-' + i + '-text')    || d.values.items[i].text;
    });

    d.studio.tag        = read('uu-studio-tag')     || d.studio.tag;
    d.studio.heading    = read('uu-studio-heading') || d.studio.heading;
    d.studio.text1      = read('uu-studio-text1')   || d.studio.text1;
    d.studio.text2      = read('uu-studio-text2')   || d.studio.text2;
}

document.getElementById('save-ueber-uns-btn').addEventListener('click', () => {
    collectUeberUnsFields();
    saveSection('ueber-uns', 'ueber-uns-save-alert');
});

// ─── IMPRESSUM MANAGER ────────────────────────────────────────────────────────
const IMP_BLOCK_IDS = [
    'angaben', 'kontakt', 'ust', 'berufsbezeichnung', 'verantwortlich',
    'eu-streit', 'verbraucher-schlicht', 'haftung-inhalte', 'haftung-links', 'urheberrecht'
];

function renderImpressum() {
    const d = state.data.impressum || { blocks: [] };
    (d.blocks || []).forEach(block => {
        const headEl = document.getElementById('imp-' + block.id + '-heading');
        const contEl = document.getElementById('imp-' + block.id + '-content');
        if (headEl && block.heading != null) headEl.value = block.heading;
        if (contEl && block.content != null) contEl.value = block.content;
    });
}

function collectImpressumFields() {
    const read = id => document.getElementById(id)?.value ?? '';
    if (!state.data.impressum) state.data.impressum = { blocks: [] };
    state.data.impressum.blocks = IMP_BLOCK_IDS.map(id => ({
        id,
        heading: read('imp-' + id + '-heading'),
        content: read('imp-' + id + '-content'),
    }));
}

document.getElementById('save-impressum-btn').addEventListener('click', () => {
    collectImpressumFields();
    saveSection('impressum', 'impressum-save-alert');
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
