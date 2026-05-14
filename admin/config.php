<?php
// SHA-256 hash of the admin password.
// Default password: BlutgesangAdmin
// To generate a new hash after a manual reset:
//   php -r "echo hash('sha256', 'YourNewPassword');"
// Then paste the result below and redeploy.
define('ADMIN_PASSWORD_HASH', 'f31bf4da0acc65f245b2c5c918fe4d4e193305c4198a669b5031508e305601f5');
define('CONTENT_BASE', realpath(dirname(__DIR__) . '/content') . DIRECTORY_SEPARATOR);
