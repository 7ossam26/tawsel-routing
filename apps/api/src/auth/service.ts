import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import * as oidc from 'openid-client';
import { withAccess, type AuthenticatedPrincipal } from '../access/service.js';
import { withTransaction } from '../db/transaction.js';
import type { AccountKind, AuthConfig } from './config.js';
import { hash, randomToken, seal, unseal, normalizePhone } from './crypto.js';
import { Issuers } from './issuer.js';

const messages = {
  invalid_request: 'راجع البيانات ثم حاول مرة أخرى.', csrf_invalid: 'انتهت صلاحية الصفحة. حدّث الصفحة ثم حاول مرة أخرى.',
  rate_limited: 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.', login_failed: 'تعذر إكمال الدخول. ابدأ محاولة جديدة.',
  company_unavailable: 'تعذر استخدام كود الشركة. راجعه مع مسؤول الشركة.', access_disabled: 'الوصول غير متاح لهذا الحساب. راجع مسؤول الشركة أو استعد حسابك.',
  session_expired: 'انتهت الجلسة. سجّل الدخول للحساب نفسه. بياناتك المحلية لم تُحذف.',
  issuer_unavailable: 'خدمة تسجيل الدخول غير متاحة الآن. حاول لاحقًا؛ بياناتك المحلية محفوظة.',
  same_account_required: 'استخدم الحساب نفسه لاستكمال العمل المحفوظ.', phone_invalid: 'اكتب رقم هاتف صحيحًا مع كود الدولة أو رقمًا مصريًا يبدأ بـ 01.'
};
export class AuthError extends Error {
  constructor(readonly code: keyof typeof messages, readonly statusCode = 400) { super(messages[code]); }
}
export interface LoginInput { kind: AccountKind; companyCode?: string; phone?: string; intent?: 'login' | 'register' | 'recover'; reauthenticate?: boolean }
interface Attempt { kind: AccountKind; tenant_id: string | null; company_code: string | null; verifier_cipher: string; nonce: string; expected_subject: string | null }
interface TokenData { access: string; refresh: string; emailVerified: boolean; loginIdentifier: string }
interface SessionRow { session_hash: string; kind: AccountKind; issuer: string; subject: string; company_code: string | null; token_cipher: string; token_expires_at: Date; expires_at: Date; reauth_until: Date; revoked: boolean }

export class Sessions {
  readonly issuers: Issuers;
  constructor(readonly pool: Pool, readonly config: AuthConfig) { this.issuers = new Issuers(config); }
  get callback() { return `${this.config.origin}/api/session/callback`; }
  async rate(ip: string, action: string, limit = 20) {
    const bucket = hash(`${ip}:${action}:${Math.floor(Date.now() / 60_000)}`);
    const result = await this.pool.query(`INSERT INTO tawsel.auth_rate_limits VALUES ($1,1,now()+interval '2 minutes')
      ON CONFLICT (bucket) DO UPDATE SET hits=tawsel.auth_rate_limits.hits+1 RETURNING hits`, [bucket]);
    await this.pool.query('DELETE FROM tawsel.auth_rate_limits WHERE expires_at < now()');
    if (result.rows[0].hits > limit) throw new AuthError('rate_limited', 429);
  }
  async company(code: string) {
    const result = await this.pool.query(`SELECT c.code,c.display_name,c.tenant_id FROM tawsel.company_login_codes c
      JOIN tawsel.tenants t USING (tenant_id) WHERE c.code=$1 AND t.kind='company' AND t.enabled`, [code.toUpperCase()]);
    if (!result.rowCount) throw new AuthError('company_unavailable', 404);
    return result.rows[0] as { code: string; display_name: string; tenant_id: string };
  }
  async begin(input: LoginInput, browser: string, previous?: string) {
    const { kind } = input;
    let code = input.companyCode;
    let expected: string | null = null;
    if (input.reauthenticate) {
      const old = await this.pool.query<SessionRow>('SELECT * FROM tawsel.web_sessions WHERE session_hash=$1 AND kind=$2 AND reauth_until>now()', [hash(previous ?? ''), kind]);
      if (!old.rows[0]) throw new AuthError('session_expired', 401);
      expected = old.rows[0].subject;
      code = old.rows[0].company_code ?? undefined;
    } else if (previous) {
      // Explicit logout precedes switching within the same account path.
      const old = await this.pool.query('SELECT 1 FROM tawsel.web_sessions WHERE session_hash=$1 AND kind=$2 AND NOT revoked AND expires_at>now()', [hash(previous), kind]);
      if (old.rowCount) throw new AuthError('same_account_required', 409);
    }
    if (kind === 'company' && (!code || input.intent === 'register')) throw new AuthError('invalid_request');
    if (kind === 'personal' && code) throw new AuthError('invalid_request');
    const company = kind === 'company' ? await this.company(code!) : null;
    let phone: string | undefined;
    try { if (input.phone) phone = normalizePhone(input.phone); } catch { throw new AuthError('phone_invalid'); }
    const client = await this.issuers.client(kind).catch(() => { throw new AuthError('issuer_unavailable', 503); });
    const state = randomToken(), nonce = randomToken(), verifier = oidc.randomPKCECodeVerifier();
    const parameters: Record<string, string> = { redirect_uri: this.callback, scope: 'openid profile email', state, nonce, prompt: 'login', code_challenge_method: 'S256', code_challenge: await oidc.calculatePKCECodeChallenge(verifier), ui_locales: 'ar' };
    if (phone) parameters.login_hint = phone;
    if (input.intent === 'recover') parameters.tawsel_recovery = '1';
    const url = oidc.buildAuthorizationUrl(client, parameters);
    if (input.intent === 'register') url.pathname = url.pathname.replace(/\/auth$/, '/registrations');
    await this.pool.query('DELETE FROM tawsel.login_attempts WHERE expires_at<now()');
    await this.pool.query(`INSERT INTO tawsel.login_attempts VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '10 minutes')`,
      [hash(state), hash(browser), kind, company?.tenant_id ?? null, company?.code ?? null, seal(verifier, this.config.encryptionKey), nonce, expected]);
    return { authorizationUrl: url.href };
  }
  async complete(url: URL, browser: string) {
    if (`${url.origin}${url.pathname}` !== this.callback) throw new AuthError('login_failed');
    // Commit one-use consumption BEFORE any issuer IO. Failed exchanges cannot replay.
    const result = await this.pool.query<Attempt>(`DELETE FROM tawsel.login_attempts WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>now() RETURNING *`, [hash(url.searchParams.get('state') ?? ''), hash(browser)]);
    const attempt = result.rows[0];
    if (!attempt) throw new AuthError('login_failed');
    const client = await this.issuers.client(attempt.kind).catch(() => { throw new AuthError('issuer_unavailable', 503); });
    let tokens;
    try {
      tokens = await oidc.authorizationCodeGrant(client, url, { pkceCodeVerifier: unseal(attempt.verifier_cipher, this.config.encryptionKey), expectedState: url.searchParams.get('state')!, expectedNonce: attempt.nonce, idTokenExpected: true });
    } catch { throw new AuthError('login_failed'); }
    const claims = tokens.claims();
    if (!claims?.sub || !tokens.refresh_token || !tokens.expires_in) throw new AuthError('login_failed');
    if (attempt.expected_subject && attempt.expected_subject !== claims.sub) throw new AuthError('same_account_required', 403);
    const issuer = this.config.issuers[attempt.kind].issuer;
    const principal: AuthenticatedPrincipal = { kind: 'account', issuer, subject: claims.sub };
    if (attempt.kind === 'personal') {
      if (claims.email_verified !== true || typeof claims.preferred_username !== 'string' || !/^\+[1-9]\d{7,14}$/.test(claims.preferred_username)) throw new AuthError('access_disabled', 403);
      await this.activatePersonal(issuer, claims.sub);
    }
    const access = await withAccess(this.pool, principal, async access => access.context).catch(() => { throw new AuthError('access_disabled', 403); });
    if (access.tenantKind !== attempt.kind || (attempt.tenant_id && access.tenantId !== attempt.tenant_id)) throw new AuthError('access_disabled', 403);
    const cookie = randomToken();
    const tokenData: TokenData = { access: tokens.access_token, refresh: tokens.refresh_token, emailVerified: claims.email_verified === true, loginIdentifier: typeof claims.preferred_username === 'string' ? claims.preferred_username : 'حسابك' };
    await this.pool.query(`INSERT INTO tawsel.web_sessions VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)`,
      [hash(cookie), attempt.kind, issuer, claims.sub, attempt.company_code, seal(JSON.stringify(tokenData), this.config.encryptionKey),
        new Date(Date.now() + tokens.expires_in * 1000), new Date(Date.now() + this.config.sessionSeconds * 1000), new Date(Date.now() + 30 * 86400_000)]);
    return { kind: attempt.kind, cookie };
  }
  private async activatePersonal(issuer: string, subject: string) {
    await withTransaction(this.pool, async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${issuer}:${subject}`]);
      if ((await tx.query('SELECT 1 FROM tawsel.identity_subjects WHERE issuer=$1 AND subject=$2', [issuer, subject])).rowCount) return;
      const tenant = randomUUID(), account = randomUUID(), driver = randomUUID();
      await tx.query('INSERT INTO tawsel.tenant_keys VALUES ($1)', [tenant]);
      await tx.query("INSERT INTO tawsel.tenants (tenant_id,kind) VALUES ($1,'personal')", [tenant]);
      await tx.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account')", [tenant, account]);
      await tx.query("INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'personal')", [tenant, account]);
      await tx.query('INSERT INTO tawsel.identity_subjects (issuer,subject,tenant_id,account_id) VALUES ($1,$2,$3,$4)', [issuer, subject, tenant, account]);
      await tx.query("INSERT INTO tawsel.memberships (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'personal')", [tenant, account]);
      await tx.query('INSERT INTO tawsel.drivers (tenant_id,driver_id,account_id) VALUES ($1,$2,$3)', [tenant, driver, account]);
    });
  }
  /** Session row lock serializes rotation/logout and stays held through the supplied
   * server operation. Membership/domain transactions still use P06 guards. This
   * session-only transaction permits bounded issuer IO; never add it to P05 writes. */
  async use<T>(kind: AccountKind, cookie: string | undefined, work: (principal: AuthenticatedPrincipal, session: { expiresAt: string; recoveryEmailVerified: boolean; loginIdentifier: string }) => Promise<T>, forceRefresh = false): Promise<T> {
    if (!cookie) throw new AuthError('session_expired', 401);
    const connection = await this.pool.connect();
    let rotated = false;
    try {
      await connection.query('BEGIN');
      await connection.query("SET LOCAL lock_timeout='6s'; SET LOCAL idle_in_transaction_session_timeout='20s'; SET LOCAL transaction_timeout='30s'");
      const row = (await connection.query<SessionRow>('SELECT * FROM tawsel.web_sessions WHERE session_hash=$1 AND kind=$2 FOR UPDATE', [hash(cookie), kind])).rows[0];
      if (!row || row.revoked || row.expires_at.getTime() <= Date.now()) throw new AuthError('session_expired', 401);
      const client = await this.issuers.client(kind).catch(() => { throw new AuthError('issuer_unavailable', 503); });
      const tokenData = JSON.parse(unseal(row.token_cipher, this.config.encryptionKey)) as TokenData;
      if (forceRefresh || row.token_expires_at.getTime() <= Date.now() + 15_000) {
        try {
          const next = await oidc.refreshTokenGrant(client, tokenData.refresh);
          if (!next.expires_in || (next.claims() && next.claims()!.sub !== row.subject)) throw new Error('Bad refresh');
          tokenData.access = next.access_token;
          tokenData.refresh = next.refresh_token ?? tokenData.refresh;
          await connection.query('UPDATE tawsel.web_sessions SET token_cipher=$2,token_expires_at=$3 WHERE session_hash=$1', [row.session_hash, seal(JSON.stringify(tokenData), this.config.encryptionKey), new Date(Date.now() + next.expires_in * 1000)]);
          rotated = true;
        } catch (error) {
          if (error instanceof oidc.ResponseBodyError && error.error === 'invalid_grant') {
            await connection.query('UPDATE tawsel.web_sessions SET revoked=true WHERE session_hash=$1', [row.session_hash]);
            await connection.query('COMMIT');
            throw new AuthError('session_expired', 401);
          }
          throw new AuthError('issuer_unavailable', 503);
        }
      }
      let active;
      try { active = await oidc.tokenIntrospection(client, tokenData.access); }
      catch { throw new AuthError('issuer_unavailable', 503); }
      if (!active.active || active.sub !== row.subject || active.client_id !== this.config.issuers[kind].clientId) {
        await connection.query('UPDATE tawsel.web_sessions SET revoked=true WHERE session_hash=$1', [row.session_hash]);
        await connection.query('COMMIT');
        throw new AuthError('session_expired', 401);
      }
      // Persist successful rotation even when membership or later domain work denies.
      // Keep lock during work; commit rotated tokens in the catch below as well.
      try {
        const result = await work({ kind: 'account', issuer: row.issuer, subject: row.subject }, { expiresAt: row.expires_at.toISOString(), recoveryEmailVerified: tokenData.emailVerified, loginIdentifier: tokenData.loginIdentifier ?? 'حسابك' });
        await connection.query('COMMIT');
        return result;
      } catch (error) { await connection.query('COMMIT'); throw error; }
    } catch (error) {
      // A one-use refresh token has already changed at the issuer. Preserve its
      // replacement even if a later introspection/read fails, or retry would use
      // a revoked predecessor and strand an otherwise recoverable session.
      await connection.query(rotated ? 'COMMIT' : 'ROLLBACK');
      throw error;
    }
    finally { connection.release(); }
  }
  async context(kind: AccountKind, cookie?: string, refresh = false) {
    return this.use(kind, cookie, async (principal, session) => {
      const access = await withAccess(this.pool, principal, async a => a.context).catch(() => { throw new AuthError('access_disabled', 403); });
      if (access.tenantKind !== kind) throw new AuthError('access_disabled', 403);
      return { kind, access, ...session, phoneOwnershipVerified: false as const };
    }, refresh);
  }
  async logout(kind: AccountKind, cookie?: string) {
    // Local revocation commits even if the issuer is unavailable. ERP client stays independent.
    const result = await this.pool.query<SessionRow>('UPDATE tawsel.web_sessions SET revoked=true WHERE session_hash=$1 AND kind=$2 RETURNING *', [hash(cookie ?? ''), kind]);
    const row = result.rows[0];
    if (row) {
      try {
        const tokens = JSON.parse(unseal(row.token_cipher, this.config.encryptionKey)) as TokenData;
        await oidc.tokenRevocation(await this.issuers.client(kind), tokens.refresh, { token_type_hint: 'refresh_token' });
      } catch { /* Local logout remains effective; no remote/global logout assertion. */ }
    }
  }
}
