// M-2: clamp() ensures env-var overrides cannot silently disable fraud detection
// by setting weights to 0 or setting fractions outside [0, 1].
function env(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function clamp(key: string, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, env(key, fallback)));
}

export const T = {
  // Temporal — velocity
  VELOCITY_MULTIPLIER:      clamp("SCORE_VELOCITY_MULTIPLIER", 10, 1, 100),
  VELOCITY_WEIGHT:          clamp("SCORE_VELOCITY_WEIGHT", 40, 1, 100),

  // Temporal — concentration thresholds (fraction of sample in densest 48h)
  CONC_THRESHOLD_10K:       clamp("SCORE_CONC_THRESHOLD_10K", 0.20, 0.01, 1),
  CONC_THRESHOLD_1K:        clamp("SCORE_CONC_THRESHOLD_1K",  0.30, 0.01, 1),
  CONC_THRESHOLD_100:       clamp("SCORE_CONC_THRESHOLD_100", 0.50, 0.01, 1),
  CONC_WEIGHT:              clamp("SCORE_CONC_WEIGHT", 35, 1, 100),

  // Temporal — Z-score
  ZSCORE_NORM:              clamp("SCORE_ZSCORE_NORM", 10, 1, 100),
  ZSCORE_WEIGHT:            clamp("SCORE_ZSCORE_WEIGHT", 25, 1, 100),

  // Accounts — new account window & lockstep similarity
  NEW_ACCOUNT_DAYS:         clamp("SCORE_NEW_ACCOUNT_DAYS", 30, 1, 365),
  LOCKSTEP_SIMILARITY:      clamp("SCORE_LOCKSTEP_SIMILARITY", 0.80, 0.01, 1),

  // Authenticity — coordinated lockstep detection
  LOCKSTEP_WINDOW_DAYS:     clamp("SCORE_LOCKSTEP_WINDOW_DAYS", 14, 1, 90),
  LOCKSTEP_MIN_SHARED:      clamp("SCORE_LOCKSTEP_MIN_SHARED", 3, 1, 20),
  LOCKSTEP_MIN_CLUSTER:     clamp("SCORE_LOCKSTEP_MIN_CLUSTER", 4, 2, 20),

  // Authenticity — burst detection
  BURST_MULTIPLIER:         clamp("SCORE_BURST_MULTIPLIER", 3, 1, 20),

  // Authenticity — score weights (each minimum 1 to prevent silent disabling)
  AUTH_LOW_ACTIVITY_WEIGHT: clamp("SCORE_AUTH_LOW_ACTIVITY_WEIGHT", 40, 1, 100),
  AUTH_LOCKSTEP_WEIGHT:     clamp("SCORE_AUTH_LOCKSTEP_WEIGHT", 35, 1, 100),
  AUTH_BURST_WEIGHT:        clamp("SCORE_AUTH_BURST_WEIGHT", 25, 1, 100),
} as const;
