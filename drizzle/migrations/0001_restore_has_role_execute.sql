-- RLS policies (user_roles etc.) call private.has_role; the hardening pass revoked EXECUTE from
-- authenticated, which made every has_role()-based policy fail with 'permission denied for function has_role'.
-- has_role is a read-only boolean helper (returns boolean), safe for authenticated to execute.
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO service_role;