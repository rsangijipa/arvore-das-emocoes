export type QualityProfile = "high" | "medium" | "safe";

export type QualityConfig = {
  profile: QualityProfile;
  leafCount: number;
  particleCount: number;
  branchDepth: number;
  dpr: number;
};
