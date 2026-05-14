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

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
$src  = $data['src'] ?? '';

// Only allow image files within managed folders — no path traversal
if (!preg_match('/^img\/(portfolio\/[a-z0-9_-]+|slider|news|artists)\/[^\/\\\\]+\.(jpg|jpeg|png|gif|webp|avif)$/i', $src)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ungültiger Dateipfad']);
    exit;
}

$rootDir  = dirname(dirname(__DIR__));
$fullPath = realpath($rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $src));
$rootReal = realpath($rootDir);

// Double-check path is inside project root (guards against symlink tricks)
if (!$fullPath || strpos($fullPath, $rootReal) !== 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ungültiger Dateipfad']);
    exit;
}

if (!file_exists($fullPath)) {
    // Already gone — treat as success
    echo json_encode(['ok' => true]);
    exit;
}

if (!unlink($fullPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Datei konnte nicht gelöscht werden – Schreibrechte prüfen']);
    exit;
}

echo json_encode(['ok' => true]);
