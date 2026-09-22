import type { components } from './schema.js';
type Schemas = components['schemas'];
export type ProvisioningCommand = Schemas['BindSourceCommand'] | Schemas['RotateCredentialCommand'] | Schemas['DisableSourceCommand'] |
  Schemas['BranchCommand'] | Schemas['DisableBranchCommand'] | Schemas['RoleCommand'] | Schemas['UserCommand'] |
  Schemas['UserRoleCommand'] | Schemas['UserExceptionsCommand'] | Schemas['UserBranchesCommand'] | Schemas['DisableUserCommand'] | Schemas['DriverCommand'];

/** Public HTTP consumer: no database, auth implementation or domain imports. */
export function provisioningClient(baseUrl: string, credential: string) {
  const base = new URL(baseUrl);
  if (base.username || base.password || base.search || base.hash ||
    (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname)))) throw new Error('HTTPS required outside loopback');
  async function request(path: string, body?: unknown) {
    const response = await fetch(new URL(path, base), { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { authorization: `Bearer ${credential}`, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() as unknown };
  }
  return {
    async command(command: ProvisioningCommand) {
      const result = await request(`/api/v1/provisioning/commands/${command.operationId}`, command);
      return result as { status: number; body: Schemas['ActionResult'] | Schemas['Problem'] };
    },
    async configuration() { return request('/api/v1/provisioning/configuration') as Promise<{ status: number; body: Schemas['SourceConfiguration'] | Schemas['Problem'] }>; },
    async status(entity: Schemas['ProvisioningStatus']['entity'], externalId: string) {
      return request(`/api/v1/provisioning/status?${new URLSearchParams({ entity, externalId })}`) as Promise<{ status: number; body: Schemas['ProvisioningStatus'] | Schemas['Problem'] }>;
    }
  };
}
