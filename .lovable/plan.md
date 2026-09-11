# Fix Google OAuth session return

## Changes
- Send Google OAuth back to the public `/auth` page instead of `/`, so callback parameters are not discarded by the root redirect.
- Make `/auth` wait for the authentication client’s initial session/callback event and redirect authenticated users to the intended in-app destination.
- Preserve only a safe same-origin `next` path across the Google round trip.
- Keep credentials, database rules, and all non-authentication behavior unchanged.

## Verification
- Run the project build check.
- Exercise the `/auth` callback/session path and confirm an existing session reaches the dashboard rather than showing the login form.
