<?php
// SHA-256 hash of the admin password.
// Default password: BlutgesangAdmin
// To generate a new hash after a manual reset:
//   php -r "echo hash('sha256', 'YourNewPassword');"
// Then paste the result below and redeploy.
define('ADMIN_PASSWORD_HASH', '15e2b0d3c33891ebb0f1ef609ec419420c20e320ce94c65fbc8c3312448eb225');
define('CONTENT_BASE', realpath(dirname(__DIR__) . '/content') . DIRECTORY_SEPARATOR);
