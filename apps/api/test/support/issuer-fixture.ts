/** Protocol fault fixture only. Actual Keycloak/browser evidence is separate. */
import Fastify from 'fastify';
import { generateKeyPairSync, createSign, createHash, randomUUID } from 'node:crypto';
export async function issuerFixture() {
  const server = Fastify();
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'RS256', use: 'sig' };
  const codes = new Map<string, URLSearchParams>();
  const refreshes = new Map<string, { kind: string; sub: string }>();
  const issued = new Map<string, { kind: string; sub: string }>();
  const state = { subject: 'driver', nonce: '', audience: '', claimIssuer: '', verified: true, active: true, unavailable: false, introspectionUnavailable: false, refreshCount: 0, badSignature: false, invalidGrant: false };
  let origin = '';
  server.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_r, body, done) => done(null, new URLSearchParams(String(body))));
  server.get('/:kind/.well-known/openid-configuration', async request => {
    const { kind } = request.params as { kind: string };
    const issuer = `${origin}/${kind}`;
    return { issuer, authorization_endpoint: `${issuer}/auth`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`, introspection_endpoint: `${issuer}/introspect`, revocation_endpoint: `${issuer}/revoke`, response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'], code_challenge_methods_supported: ['S256'] };
  });
  server.get('/:kind/jwks', async () => ({ keys: [jwk] }));
  server.get('/:kind/auth', async (request, reply) => {
    const params = new URL(request.url, origin).searchParams;
    const code = randomUUID(); codes.set(code, params);
    const callback = new URL(params.get('redirect_uri')!);
    callback.searchParams.set('state', params.get('state')!); callback.searchParams.set('code', code);
    return reply.redirect(callback.href);
  });
  server.post('/:kind/token', async (request, reply) => {
    const { kind } = request.params as { kind: string };
    const body = request.body as URLSearchParams;
    if (body.get('client_secret') !== 'fixture-secret') return reply.code(401).send({ error: 'invalid_client' });
    if (state.unavailable) return reply.code(503).send({ error: 'temporarily_unavailable' });
    let sub = state.subject, nonce = '';
    if (body.get('grant_type') === 'authorization_code') {
      const params = codes.get(body.get('code')!); codes.delete(body.get('code')!);
      if (!params || params.get('redirect_uri') !== body.get('redirect_uri') || params.get('code_challenge') !== createHash('sha256').update(body.get('code_verifier') ?? '').digest('base64url')) return reply.code(400).send({ error: 'invalid_grant' });
      nonce = state.nonce || params.get('nonce')!;
    } else if (body.get('grant_type') === 'refresh_token') {
      const saved = refreshes.get(body.get('refresh_token')!); refreshes.delete(body.get('refresh_token')!);
      if (!saved || state.invalidGrant) return reply.code(400).send({ error: 'invalid_grant' });
      sub = saved.sub; state.refreshCount++;
    } else return reply.code(400).send({ error: 'unsupported_grant_type' });
    const seconds = Math.floor(Date.now() / 1000);
    const claims = { iss: state.claimIssuer || `${origin}/${kind}`, sub, aud: state.audience || 'tawsel-web', iat: seconds, exp: seconds + 120, ...(nonce ? { nonce } : {}), email_verified: state.verified, email: 'same@example.test', preferred_username: '+201000000000' };
    const input = [Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fixture' })).toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url')].join('.');
    const signature = createSign('RSA-SHA256').update(input).sign(keys.privateKey).toString('base64url');
    const access = randomUUID(), refresh = randomUUID();
    refreshes.set(refresh, { kind, sub }); issued.set(access, { kind, sub });
    return { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 120, id_token: `${input}.${state.badSignature ? 'invalid' : signature}` };
  });
  server.post('/:kind/introspect', async (request, reply) => {
    if (state.unavailable || state.introspectionUnavailable) return reply.code(503).send({ error: 'temporarily_unavailable' });
    const token = issued.get((request.body as URLSearchParams).get('token')!);
    return { active: Boolean(token) && state.active, sub: token?.sub, client_id: 'tawsel-web' };
  });
  server.post('/:kind/revoke', async (request, reply) => { refreshes.delete((request.body as URLSearchParams).get('token')!); return reply.code(200).send(); });
  origin = await server.listen({ host: '127.0.0.1', port: 0 });
  return { origin, state, close: () => server.close() };
}
