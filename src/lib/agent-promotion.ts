/**
 * Agent → Master Agent promotion rules (client requirement):
 * - Auto-promote when an Agent creates another Agent under their domain.
 * - Superadmin may still upgrade role manually.
 * - Creating players alone does NOT promote.
 */
export const AGENT_MASTER_PROMOTE_HINT =
  "Create another Agent under your domain to earn Master Agent.";
