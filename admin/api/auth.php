<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once dirname(__DIR__) . '/config.php';

session_name('blutgesang_cms');
session_start();

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ungültige Anfrage']);
    exit;
}

$action = $data['action'] ?? '';

switch ($action) {

    case 'login':
        $hash = $data['hash'] ?? '';
        if (hash_equals(ADMIN_PASSWORD_HASH, $hash)) {
            session_regenerate_id(true);
            $_SESSION['authenticated'] = true;
            echo json_encode(['ok' => true]);
        } else {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Falsches Passwort']);
        }
        break;

    case 'logout':
        $_SESSION = [];
        session_destroy();
        echo json_encode(['ok' => true]);
        break;

    case 'check':
        echo json_encode(['ok' => !empty($_SESSION['authenticated'])]);
        break;

    case 'change_password':
        if (empty($_SESSION['authenticated'])) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'Nicht angemeldet']);
            exit;
        }
        $newHash = $data['hash'] ?? '';
        if (!preg_match('/^[a-f0-9]{64}$/', $newHash)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Ungültiger Hash-Wert']);
            exit;
        }
        $configPath = dirname(__DIR__) . '/config.php';
        $content    = file_get_contents($configPath);
        $updated    = preg_replace(
            "/define\('ADMIN_PASSWORD_HASH',\s*'[a-f0-9]{64}'\)/",
            "define('ADMIN_PASSWORD_HASH', '" . $newHash . "')",
            $content
        );
        if ($updated === null || file_put_contents($configPath, $updated) === false) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Datei konnte nicht geschrieben werden. Bitte Schreibrechte der Datei admin/config.php prüfen.']);
            exit;
        }
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Unbekannte Aktion']);
}
