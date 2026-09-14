export type RetentionPolicy = {
  enabled: boolean;
  days: number;
};

const policies = new Map<string, RetentionPolicy>();

export function getRetentionPolicy(streamId: string): RetentionPolicy {
  return policies.get(streamId) ?? { enabled: false, days: 30 };
}

export function setRetentionPolicy(streamId: string, policy: RetentionPolicy) {
  const normalized = {
    enabled: Boolean(policy.enabled),
    days: Math.min(Math.max(Math.floor(Number(policy.days) || 30), 1), 3650),
  };
  policies.set(streamId, normalized);
  return normalized;
}
