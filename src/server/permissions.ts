import type { Role } from "@prisma/client";
import { forbidden } from "./errors";

export const PERMISSIONS = {
  "order.view": ["OWNER", "MANAGER", "OPERATOR"],
  "order.create": ["OWNER", "MANAGER", "OPERATOR"],
  "order.edit": ["OWNER", "MANAGER", "OPERATOR"],
  "order.approve": ["OWNER", "MANAGER"],
  "order.reject": ["OWNER", "MANAGER"],
  "catalogue.view": ["OWNER", "MANAGER", "OPERATOR"],
  "catalogue.manage": ["OWNER", "MANAGER"],
  "customer.view": ["OWNER", "MANAGER", "OPERATOR"],
  "customer.manage": ["OWNER", "MANAGER"],
  "settings.view": ["OWNER", "MANAGER", "OPERATOR"],
  "settings.manage": ["OWNER"],
  "team.manage": ["OWNER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function assertCan(role: Role, permission: Permission) {
  if (!can(role, permission)) throw forbidden();
}

export const ROLE_LABEL: Record<Role, string> = { OWNER: "Owner", MANAGER: "Manager", OPERATOR: "Operator" };
export const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER: "Manages business settings, team and everything below",
  MANAGER: "Manages catalogue, customers and approves orders",
  OPERATOR: "Creates and edits draft orders for review",
};
