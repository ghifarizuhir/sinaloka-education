-- Disable must_change_password for admin accounts so tests can login directly
UPDATE users SET must_change_password = false WHERE email IN ('admin@cerdas.id', 'admin@prima.id');
