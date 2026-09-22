/** Company credentials stay ERP/issuer-owned. Tawsel checks reserved subjects
 * and revokes their issuer sessions after local disable; no password API. */
export interface IssuerAdministration {
  verifySubject(subject: string): Promise<boolean>;
  revokeSessions(subject: string): Promise<void>;
}
export function keycloakAdministration(config: { issuer: string; clientId: string; clientSecret: string }): IssuerAdministration {
  const issuer = new URL(config.issuer);
  if (issuer.username || issuer.password || issuer.search || issuer.hash ||
    (issuer.protocol !== 'https:' && !(issuer.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(issuer.hostname)))) throw new Error('Unsafe issuer configuration');
  if (!/\/realms\/[^/]+$/.test(issuer.pathname)) throw new Error('Keycloak realm issuer required');
  const users = config.issuer.replace('/realms/', '/admin/realms/') + '/users';
  async function request(url: string, init: RequestInit = {}) {
    const result = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!result.ok) throw new Error('Issuer unavailable');
    return result;
  }
  async function token() {
    const response = await request(`${config.issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: config.clientId, client_secret: config.clientSecret }) });
    const data = await response.json() as { access_token?: string };
    if (!data.access_token) throw new Error('Issuer token unavailable');
    return data.access_token;
  }
  return {
    async verifySubject(subject) {
      const response = await request(`${users}/${encodeURIComponent(subject)}`, { headers: { authorization: `Bearer ${await token()}` } });
      const user = await response.json() as { id?: string; enabled?: boolean };
      return user.id === subject && user.enabled === true;
    },
    async revokeSessions(subject) {
      await request(`${users}/${encodeURIComponent(subject)}/logout`, { method: 'POST', headers: { authorization: `Bearer ${await token()}` } });
    }
  };
}
