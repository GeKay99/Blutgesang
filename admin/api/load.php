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

$files = [
    'slider'   => 'slider.json',
    'misa'     => 'portfolio-misa.json',
    'jaydem'   => 'portfolio-jaydem.json',
    'news'     => 'news.json',
    'artists'  => 'artists.json',
];

$result = [];
foreach ($files as $key => $filename) {
    $path = CONTENT_BASE . $filename;
    if (file_exists($path)) {
        $decoded = json_decode(file_get_contents($path), true);
        $result[$key] = ($decoded !== null) ? $decoded : null;
    } else {
        $result[$key] = null;
    }
}

echo json_encode(['ok' => true, 'data' => $result]);
