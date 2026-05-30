function env(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

export const T = {
  // Temporal — velocity
  VELOCITY_MULTIPLIER:      env("SCORE_VELOCITY_MULTIPLIER", 10),
  VELOCITY_WEIGHT:          env("SCORE_VELOCITY_WEIGHT", 40),

  // Temporal — concentration thresholds (fraction of sample in densest 48h)
  CONC_THRESHOLD_10K:       env("SCORE_CONC_THRESHOLD_10K", 0.20),
  CONC_THRESHOLD_1K:        env("SCORE_CONC_THRESHOLD_1K",  0.30),
  CONC_THRESHOLD_100:       env("SCORE_CONC_THRESHOLD_100", 0.50),
  CONC_WEIGHT:              env("SCORE_CONC_WEIGHT", 35),

  // Temporal — Z-score
  ZSCORE_NORM:              env("SCORE_ZSCORE_NORM", 10),
  ZSCORE_WEIGHT:            env("SCORE_ZSCORE_WEIGHT", 25),

  // Accounts — new account window & lockstep similarity
  NEW_ACCOUNT_DAYS:         env("SCORE_NEW_ACCOUNT_DAYS", 30),
  LOCKSTEP_SIMILARITY:      env("SCORE_LOCKSTEP_SIMILARITY", 0.80),

  // Authenticity — coordinated lockstep detection
  LOCKSTEP_WINDOW_DAYS:     env("SCORE_LOCKSTEP_WINDOW_DAYS", 14),
  LOCKSTEP_MIN_SHARED:      env("SCORE_LOCKSTEP_MIN_SHARED", 3),
  LOCKSTEP_MIN_CLUSTER:     env("SCORE_LOCKSTEP_MIN_CLUSTER", 4),

  // Authenticity — burst detection
  BURST_MULTIPLIER:         env("SCORE_BURST_MULTIPLIER", 3),

  // Authenticity — score weights
  AUTH_LOW_ACTIVITY_WEIGHT: env("SCORE_AUTH_LOW_ACTIVITY_WEIGHT", 40),
  AUTH_LOCKSTEP_WEIGHT:     env("SCORE_AUTH_LOCKSTEP_WEIGHT", 35),
  AUTH_BURST_WEIGHT:        env("SCORE_AUTH_BURST_WEIGHT", 25),
} as const;
