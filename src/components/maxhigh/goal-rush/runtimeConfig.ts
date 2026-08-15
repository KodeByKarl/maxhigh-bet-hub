import {
  DEFAULT_GOAL_RUSH_CONFIG,
  normalizeGoalRushConfig,
  type GoalRushConfig,
} from "@/lib/goal-rush-config";

let current: GoalRushConfig = structuredClone(DEFAULT_GOAL_RUSH_CONFIG);

export function getGoalRushConfig(): GoalRushConfig {
  return current;
}

export function setGoalRushConfig(raw: unknown) {
  current = normalizeGoalRushConfig(raw);
  return current;
}
