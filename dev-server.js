/**
 * Local development server for Blutgesang Tattoo.
 * Replicates api/portfolio.php and all admin/api/*.php endpoints
 * so the full site (including admin panel) works without PHP.
 * Start with: node dev-server.js
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const PORT       = 8080;
const ROOT       = __dirname;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css' : 'text/css',
    '.js'  : 'application/javascript',
    '.json': 'application/json',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif' : 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico' : 'image/x-icon',
    '.svg' : 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf' : 'font/ttf',
};

// ── In-memory sessions (reset on server restart, fine for local dev) ─────────
const sessions = new Map();

function makeSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getSession(req) {
    const m = (req.headers.cookie || '').match(/blutgesang_dev=([a-f0-9]{64})/);
    return m ? sessions.get(m[1]) : null;
}

function requireAuth(req, res) {
    if (getSession(req)?.authenticated) return true;
    sendJson(res, 403, { ok: false, error: 'Nicht angemeldet' });
    return false;
}

// ── Read the password hash out of admin/config.php ───────────────────────────
function readPasswordHash() {
    try {
        const src = fs.readFileSync(path.join(ROOT, 'admin', 'config.php'), 'utf8');
        const m   = src.match(/ADMIN_PASSWORD_HASH',\s*'([a-f0-9]{64})'/);
        return m ? m[1] : null;
    } catch { return null; }
}

function writePasswordHash(hash) {
    const file = path.join(ROOT, 'admin', 'config.php');
    const src  = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file,
        src.replace(/(ADMIN_PASSWORD_HASH',\s*')[a-f0-9]{64}(')/, `$1${hash}$2`),
        'utf8');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sendJson(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', c => raw += c);
        req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
        });
    });
}

// ── Admin API: auth.php ───────────────────────────────────────────────────────
async function handleAuth(req, res) {
    const body   = await readBody(req);
    const action = body.action;

    if (action === 'check') {
        return getSession(req)?.authenticated
            ? sendJson(res, 200, { ok: true })
            : sendJson(res, 403, { ok: false, error: 'Nicht angemeldet' });
    }

    if (action === 'login') {
        const stored = readPasswordHash();
        if (!stored || body.hash !== stored) {
            return sendJson(res, 403, { ok: false, error: 'Falsches Passwort' });
        }
        const sid = makeSessionId();
        sessions.set(sid, { authenticated: true });
        res.setHeader('Set-Cookie', `blutgesang_dev=${sid}; HttpOnly; Path=/; SameSite=Strict`);
        return sendJson(res, 200, { ok: true });
    }

    if (action === 'logout') {
        const m = (req.headers.cookie || '').match(/blutgesang_dev=([a-f0-9]{64})/);
        if (m) sessions.delete(m[1]);
        res.setHeader('Set-Cookie', 'blutgesang_dev=; Max-Age=0; Path=/');
        return sendJson(res, 200, { ok: true });
    }

    if (action === 'change_password') {
        if (!requireAuth(req, res)) return;
        const hash = body.hash || '';
        if (!/^[a-f0-9]{64}$/.test(hash))
            return sendJson(res, 400, { ok: false, error: 'Ungültiger Hash' });
        try {
            writePasswordHash(hash);
            return sendJson(res, 200, { ok: true });
        } catch (err) {
            return sendJson(res, 500, { ok: false, error: err.message });
        }
    }

    sendJson(res, 400, { ok: false, error: 'Unbekannte Aktion' });
}

// ── Admin API: load.php ───────────────────────────────────────────────────────
async function handleLoad(req, res) {
    if (!requireAuth(req, res)) return;

    const files = {
        slider      : 'slider.json',
        misa        : 'portfolio-misa.json',
        jaydem      : 'portfolio-jaydem.json',
        news        : 'news.json',
        artists     : 'artists.json',
        'ueber-uns' : 'ueber-uns.json',
        impressum   : 'impressum.json',
    };

    const data = {};
    for (const [key, name] of Object.entries(files)) {
        const p = path.join(ROOT, 'content', name);
        try { data[key] = JSON.parse(fs.readFileSync(p, 'utf8')); }
        catch { data[key] = null; }
    }

    sendJson(res, 200, { ok: true, data });
}

// ── Multipart parser (for file uploads) ──────────────────────────────────────
function readRawBody(req) {
    return new Promise(resolve => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

function parseMultipart(body, boundary) {
    const parts      = {};
    const startDelim = Buffer.from('--' + boundary + '\r\n');
    const midDelim   = Buffer.from('\r\n--' + boundary);

    let pos = body.indexOf(startDelim);
    if (pos === -1) return parts;
    pos += startDelim.length;

    while (pos < body.length) {
        const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos);
        if (headerEnd === -1) break;

        const headerStr  = body.slice(pos, headerEnd).toString('latin1');
        const dataStart  = headerEnd + 4;
        const dataEnd    = body.indexOf(midDelim, dataStart);
        if (dataEnd === -1) break;

        const data       = body.slice(dataStart, dataEnd);
        const dispMatch  = headerStr.match(/Content-Disposition:\s*form-data;([^\r\n]+)/i);

        if (dispMatch) {
            const disp      = dispMatch[1];
            const nameMatch = disp.match(/\bname="([^"]+)"/);
            const fileMatch = disp.match(/\bfilename="([^"]+)"/);
            const ctMatch   = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
            if (nameMatch) {
                if (fileMatch) {
                    parts[nameMatch[1]] = {
                        filename:    fileMatch[1],
                        contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
                        data,
                    };
                } else {
                    parts[nameMatch[1]] = data.toString('utf8');
                }
            }
        }

        pos = dataEnd + midDelim.length;
        if (pos + 1 < body.length && body[pos] === 0x0d && body[pos + 1] === 0x0a) pos += 2;
        else break;
    }
    return parts;
}

// ── Admin API: upload.php ─────────────────────────────────────────────────────
const UPLOAD_TARGETS = {
    misa        : 'img/portfolio/misa/',
    jaydem      : 'img/portfolio/jaydem/',
    slider      : 'img/slider/',
    news        : 'img/news/',
    artists     : 'img/artists/',
    'ueber-uns' : 'img/ueber-uns/',
};
const IMAGE_MIME = new Set(['image/jpeg','image/png','image/gif','image/webp','image/avif']);
const VIDEO_MIME = new Set(['video/mp4','video/webm','video/ogg']);
const MIME_EXT   = { 'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif','video/mp4':'mp4','video/webm':'webm','video/ogg':'ogv' };

async function handleUpload(req, res) {
    if (!requireAuth(req, res)) return;

    const ct       = req.headers['content-type'] || '';
    const bMatch   = ct.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
    if (!bMatch) return sendJson(res, 400, { ok: false, error: 'Kein multipart boundary gefunden' });

    const boundary = bMatch[1] || bMatch[2];
    const rawBody  = await readRawBody(req);
    const parts    = parseMultipart(rawBody, boundary);

    const target   = parts['target'];
    const filePart = parts['file'];

    if (!UPLOAD_TARGETS[target]) return sendJson(res, 400, { ok: false, error: 'Ungültiges Upload-Ziel' });
    if (!filePart || !filePart.data) return sendJson(res, 400, { ok: false, error: 'Keine Datei empfangen' });
    const isVideo = VIDEO_MIME.has(filePart.contentType) && target === 'slider';
    if (!IMAGE_MIME.has(filePart.contentType) && !isVideo) return sendJson(res, 400, { ok: false, error: 'Nur Bilder erlaubt; für Slider auch MP4, WebM' });

    const ext      = MIME_EXT[filePart.contentType] || 'jpg';
    const baseName = path.basename(filePart.filename, path.extname(filePart.filename));
    const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'upload';
    let   filename = safeName + '.' + ext;

    const relDir   = UPLOAD_TARGETS[target];
    const absDir   = path.join(ROOT, relDir);
    if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });

    let destPath = path.join(absDir, filename);
    let counter  = 1;
    while (fs.existsSync(destPath)) {
        filename = safeName + '-' + counter + '.' + ext;
        destPath = path.join(absDir, filename);
        counter++;
    }

    fs.writeFileSync(destPath, filePart.data);
    sendJson(res, 200, { ok: true, src: relDir + filename, filename });
}

// ── Admin API: delete.php ─────────────────────────────────────────────────────
async function handleDelete(req, res) {
    if (!requireAuth(req, res)) return;

    const body = await readBody(req);
    const src  = body.src || '';

    if (!/^img\/(portfolio\/[a-z0-9_-]+|slider|news|artists)\/[^/\\]+\.(jpg|jpeg|png|gif|webp|avif|mp4|webm|ogv)$/i.test(src))
        return sendJson(res, 400, { ok: false, error: 'Ungültiger Dateipfad' });

    const fullPath = path.join(ROOT, src);
    if (!fullPath.startsWith(ROOT + path.sep))
        return sendJson(res, 400, { ok: false, error: 'Ungültiger Dateipfad' });

    if (!fs.existsSync(fullPath)) return sendJson(res, 200, { ok: true }); // already gone
    fs.unlinkSync(fullPath);
    sendJson(res, 200, { ok: true });
}

// ── Admin API: save.php ───────────────────────────────────────────────────────
async function handleSave(req, res) {
    if (!requireAuth(req, res)) return;

    const body    = await readBody(req);
    const allowed = {
        slider      : 'slider.json',
        misa        : 'portfolio-misa.json',
        jaydem      : 'portfolio-jaydem.json',
        news        : 'news.json',
        artists     : 'artists.json',
        'ueber-uns' : 'ueber-uns.json',
        impressum   : 'impressum.json',
    };

    if (!allowed[body.key] || body.content == null)
        return sendJson(res, 400, { ok: false, error: 'Ungültiger Schlüssel oder fehlender Inhalt' });

    try {
        fs.writeFileSync(
            path.join(ROOT, 'content', allowed[body.key]),
            JSON.stringify(body.content, null, 2),
            'utf8');
        sendJson(res, 200, { ok: true });
    } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
    }
}

// ── Public API: portfolio.php ─────────────────────────────────────────────────
function handlePortfolio(parsed, res) {
    const artist = (parsed.searchParams.get('artist') || '').toLowerCase();

    if (!artist || !/^[a-z0-9_-]+$/.test(artist))
        return sendJson(res, 400, { ok: false, error: 'Invalid artist name' });

    const folderAbs = path.join(ROOT, 'img', 'portfolio', artist);
    const folderRel = `img/portfolio/${artist}/`;

    if (!fs.existsSync(folderAbs) || !fs.statSync(folderAbs).isDirectory())
        return sendJson(res, 404, { ok: false, error: 'Portfolio folder not found' });

    const files  = fs.readdirSync(folderAbs)
        .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const title  = artist.charAt(0).toUpperCase() + artist.slice(1);
    const images = files.map(f => ({ src: folderRel + f, alt: title + ' Tattoo' }));

    // Keep static JSON fallback in sync
    try {
        fs.writeFileSync(
            path.join(ROOT, 'content', `portfolio-${artist}.json`),
            JSON.stringify({ artist: title, gallery: images }, null, 2),
            'utf8');
    } catch (_) { /* non-fatal */ }

    sendJson(res, 200, { ok: true, images });
}

// ── Static file server ────────────────────────────────────────────────────────
function serveStatic(pathname, res) {
    if (pathname === '/') pathname = '/index.html';

    let filePath;
    try { filePath = path.join(ROOT, decodeURIComponent(pathname)); }
    catch { res.writeHead(400); return res.end('Bad request'); }

    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
        res.writeHead(403); return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found: ' + pathname); }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsed   = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsed.pathname;

    if (pathname === '/api/portfolio.php')        return handlePortfolio(parsed, res);
    if (pathname === '/admin/api/auth.php')        return handleAuth(req, res);
    if (pathname === '/admin/api/load.php')        return handleLoad(req, res);
    if (pathname === '/admin/api/save.php')        return handleSave(req, res);
    if (pathname === '/admin/api/upload.php')      return handleUpload(req, res);
    if (pathname === '/admin/api/delete.php')      return handleDelete(req, res);

    serveStatic(pathname, res);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('\n  Blutgesang Tattoo – Dev Server');
    console.log('  ──────────────────────────────');
    console.log(`  Site:   http://localhost:${PORT}`);
    console.log(`  Admin:  http://localhost:${PORT}/admin/`);
    console.log('\n  Ctrl+C to stop\n');
});
