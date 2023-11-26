import type { PGConfig } from '../protocol/types';
export type SetSSLFallback = (config: Required<PGConfig>) => boolean;
export type GetSLLFallbackSpec = (setFallbackFn: (fallback: SetSSLFallback) => void) => void;
