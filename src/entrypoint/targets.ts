export const flags = {
    CORS_ALLOWED: 'cors-allowed',
    // HTML not available through cheerio
    DYNAMIC_RENDER: 'dynamic-render',
    NEEDS_REFERER_HEADER: 'needs-referer-header'
} as const;

export type Flags = (typeof flags)[keyof typeof flags];

export const targets = {
    BROWSER: 'browser',
    NATIVE: 'native',
    ANY: 'any',
} as const;

export type Targets = (typeof targets)[keyof typeof targets];

export type FeatureMap = {
    requires: Flags[],
    disallowed: Flags[],
}

export const targetToFeatures: Record<Targets, FeatureMap> = {
    browser: {
        requires: [flags.CORS_ALLOWED],
        disallowed: [],
    },
    native: {
        requires: [],
        disallowed: [],
    },
    any: {
        requires: [],
        disallowed: [],
    },
};

export function getTargetFeatures(target: Targets): FeatureMap {
    const features = targetToFeatures[target];
    return features;
}

export function flagsAllowedInFeatures(features: FeatureMap, inputFlags: Flags[]): boolean {
  const hasAllFlags = features.requires.every((v) => inputFlags.includes(v));
  if (!hasAllFlags) return false;
  const hasDisallowedFlag = features.disallowed.some((v) => inputFlags.includes(v));
  if (hasDisallowedFlag) return false;
  return true;
}
