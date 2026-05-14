<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');

$artist = $_GET['artist'] ?? '';

// Only allow lowercase alphanumeric artist slugs (no path traversal)
if (!preg_match('/^[a-z0-9_-]+$/', $artist) || $artist === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid artist name']);
    exit;
}

$rootDir = dirname(__DIR__);
$relDir  = 'img/portfolio/' . $artist . '/';
$absDir  = $rootDir . DIRECTORY_SEPARATOR . 'img' . DIRECTORY_SEPARATOR . 'portfolio' . DIRECTORY_SEPARATOR . $artist . DIRECTORY_SEPARATOR;

if (!is_dir($absDir)) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Portfolio folder not found: ' . $relDir]);
    exit;
}

$allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
$images  = [];

$items = scandir($absDir);
if ($items === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not read portfolio directory']);
    exit;
}

natsort($items); // natural sort: 1, 2, 3 ... 10, 11

foreach ($items as $file) {
    if ($file === '.' || $file === '..') continue;
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed, true)) continue;
    $images[] = [
        'src' => $relDir . $file,
        'alt' => ucfirst($artist) . ' Tattoo',
    ];
}

$result = array_values($images);

// Keep the static JSON fallback in sync so non-PHP environments stay current
$jsonPath = $rootDir . DIRECTORY_SEPARATOR . 'content' . DIRECTORY_SEPARATOR . 'portfolio-' . $artist . '.json';
$fallback = json_encode(
    ['artist' => ucfirst($artist), 'gallery' => $result],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
@file_put_contents($jsonPath, $fallback);

echo json_encode(['ok' => true, 'images' => $result]);
