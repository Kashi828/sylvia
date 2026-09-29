'use client';

/**
 * Legacy UI enhancer, reduced for the v0.65 ops-console redesign.
 * The React console shell now owns the overview extras, version labels and
 * status text; this component intentionally renders nothing and only remains
 * so removing it from layout.tsx is a separate, explicit change.
 */
export default function ClientUIEnhancer() {
  return null;
}
