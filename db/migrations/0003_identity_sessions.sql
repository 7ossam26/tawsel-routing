-- Credentials remain solely at the issuer. Codes are locators, never grants.
CREATE TABLE tawsel.company_login_codes (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9-]{2,32}$'),
  tenant_id uuid NOT NULL REFERENCES tawsel.tenants,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120)
);
CREATE TABLE tawsel.login_attempts (
  state_hash text PRIMARY KEY,
  browser_hash text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('company','personal')),
  tenant_id uuid REFERENCES tawsel.tenants,
  company_code text,
  verifier_cipher text NOT NULL,
  nonce text NOT NULL,
  expected_subject text,
  expires_at timestamptz NOT NULL
);
CREATE TABLE tawsel.web_sessions (
  session_hash text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('company','personal')),
  issuer text NOT NULL,
  subject text NOT NULL,
  company_code text,
  token_cipher text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  reauth_until timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  FOREIGN KEY (issuer,subject) REFERENCES tawsel.identity_subjects,
  CHECK (reauth_until >= expires_at)
);
CREATE INDEX web_sessions_subject ON tawsel.web_sessions (issuer,subject);
-- Shared across application processes. Fixed-window counters store hashed IPs.
CREATE TABLE tawsel.auth_rate_limits (
  bucket text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
