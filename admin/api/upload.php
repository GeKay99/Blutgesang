<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once dirname(__DIR__) . '/config.php';

session_name('blutgesang_cms');
session_start();

if (empty($_SESSION['authenticated'])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Nicht angemeldet']);
    exit;
}

$target = $_POST['target'] ?? '';

$targets = [
    'misa'      => 'img/portfolio/misa/',
    'jaydem'    => 'img/portfolio/jaydem/',
    'slider'    => 'img/slider/',
    'news'      => 'img/news/',
    'artists'   => 'img/artists/',
    'ueber-uns' => 'img/ueber-uns/',
];

if (!array_key_exists($target, $targets)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ungültiges Upload-Ziel']);
    exit;
}

$file = $_FILES['file'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    $codes = [
        UPLOAD_ERR_INI_SIZE   => 'Datei zu groß (php.ini limit)',
        UPLOAD_ERR_FORM_SIZE  => 'Datei zu groß',
        UPLOAD_ERR_PARTIAL    => 'Datei nur teilweise hochgeladen',
        UPLOAD_ERR_NO_FILE    => 'Keine Datei empfangen',
    ];
    $msg = $codes[$file['error'] ?? -1] ?? 'Upload-Fehler';
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

// Validate MIME type via file content (not trusting the client)
$finfo    = new finfo(FILEINFO_MIME_TYPE);
$mime     = $finfo->file($file['tmp_name']);
$mimeMap  = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
    'image/avif' => 'avif',
];
$videoMimeMap = [
    'video/mp4'  => 'mp4',
    'video/webm' => 'webm',
    'video/ogg'  => 'ogv',
];

$isImage = array_key_exists($mime, $mimeMap);
$isVideo = $target === 'slider' && array_key_exists($mime, $videoMimeMap);

if (!$isImage && !$isVideo) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Nur Bilder erlaubt (JPG, PNG, GIF, WebP, AVIF); für Slider auch MP4, WebM']);
    exit;
}

$mimeMap = array_merge($mimeMap, $isVideo ? $videoMimeMap : []);

$ext          = $mimeMap[$mime];
$baseName     = pathinfo($file['name'], PATHINFO_FILENAME);
$safeName     = preg_replace('/[^a-zA-Z0-9_-]/', '-', $baseName);
$safeName     = trim($safeName, '-') ?: 'upload';
$filename     = $safeName . '.' . $ext;

$rootDir      = dirname(dirname(__DIR__));
$relDir       = $targets[$target];
$absDir       = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relDir);

if (!is_dir($absDir) && !mkdir($absDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Zielordner konnte nicht erstellt werden']);
    exit;
}

// Avoid overwriting existing files
$destPath = $absDir . $filename;
$counter  = 1;
while (file_exists($destPath)) {
    $filename = $safeName . '-' . $counter . '.' . $ext;
    $destPath = $absDir . $filename;
    $counter++;
}

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Datei konnte nicht gespeichert werden – Schreibrechte prüfen']);
    exit;
}

$src = $relDir . $filename;
echo json_encode(['ok' => true, 'src' => $src, 'filename' => $filename]);
