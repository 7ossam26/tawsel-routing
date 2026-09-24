CREATE TABLE mock_erp.login_attempts (
 state_hash text PRIMARY KEY, browser_hash text NOT NULL, verifier_cipher text NOT NULL,
 nonce text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE mock_erp.native_sessions (
 session_hash text PRIMARY KEY, subject text NOT NULL, token_cipher text NOT NULL,
 expires_at timestamptz NOT NULL, csrf text NOT NULL
);
CREATE TABLE mock_erp.native_rate_limits (bucket text PRIMARY KEY,hits integer NOT NULL,expires_at timestamptz NOT NULL);
