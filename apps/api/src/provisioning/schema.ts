import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';

const ajv = new Ajv2020({ strict: true, allErrors: true });
(addFormats as unknown as (a: Ajv2020) => void)(ajv);
const base = new URL('../../../../contracts/', import.meta.url);
for (const name of ['common.schema.json', 'provisioning.schema.json']) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(name, base), 'utf8')));
}
export const operations = {
  'integration.bindSource': 'BindSource', 'integration.rotateCredential': 'RotateCredential',
  'integration.disableSource': 'DisableSource', 'branch.provision': 'Branch', 'branch.disable': 'DisableBranch',
  'role.defineCapabilities': 'Role', 'user.provision': 'User', 'user.setRole': 'UserRole',
  'user.setCapabilityExceptions': 'UserExceptions', 'user.setBranchMemberships': 'UserBranches',
  'user.disable': 'DisableUser', 'driver.provisionReference': 'Driver'
} as const;
export type ProvisioningOperation = keyof typeof operations;
export class ProvisioningError extends Error {
  constructor(readonly code: components['schemas']['ErrorCode'], readonly statusCode: number, message: string) { super(message); }
}
export function conforms(name: string, value: unknown): boolean {
  return ajv.validate(`https://schemas.tawsel.invalid/v1/provisioning.schema.json#/$defs/${name}`, value) as boolean;
}
export function validateCommand(operation: ProvisioningOperation, value: unknown): void {
  if (!conforms(`${operations[operation]}Command`, value)) throw new ProvisioningError('validation_failed', 400, 'Invalid provisioning command');
}
