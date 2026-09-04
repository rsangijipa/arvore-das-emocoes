export type QualityProfile = "high" | "medium" | "safe";

export type QualityConfig = {
  profile: QualityProfile;
  /** folhas comuns na copa */
  leafCount: number;
  /** ordens de ramificacao lateral */
  branchOrder: number;
  /** multiplicador de tesselacao de casca e folhas (0.5 - 1) */
  detail: number;
  /** densidade de folhas por raminho */
  leafDensity: number;
  dpr: number;
  shadows: boolean;
  shadowMapSize: 1024 | 2048;
  windStrength: number;
};
