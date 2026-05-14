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

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ungültige Daten']);
    exit;
}

$allowed = [
    'slider'     => 'slider.json',
    'misa'       => 'portfolio-misa.json',
    'jaydem'     => 'portfolio-jaydem.json',
    'news'       => 'news.json',
    'artists'    => 'artists.json',
    'ueber-uns'  => 'ueber-uns.json',
    'impressum'  => 'impressum.json',
];

$key     = $data['key']     ?? '';
$content = $data['content'] ?? null;

if (!array_key_exists($key, $allowed) || $content === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ungültiger Schlüssel oder fehlender Inhalt']);
    exit;
}

$path = CONTENT_BASE . $allowed[$key];
$json = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($json === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'JSON-Kodierung fehlgeschlagen']);
    exit;
}

if (file_put_contents($path, $json) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Datei konnte nicht gespeichert werden. Bitte Schreibrechte des Ordners content/ prüfen (CHMOD 755).']);
    exit;
}

echo json_encode(['ok' => true]);
