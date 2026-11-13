-- Session ids are now sha256(cookie token) instead of the raw token.
-- Existing rows hold raw tokens and can never match, so remove them
-- (users simply sign in again).
DELETE FROM "sessions";
