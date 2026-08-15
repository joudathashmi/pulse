/** Headline metadata for Pulse control chains (plan slide 21). */
export const HEADLINES = [
  {
    id: 'fdi',
    name: 'Foreign Direct Investment',
    unit: 'SAR bn',
    status: 'ok',
    source: 'GASTAT · SAMA',
    lineage: 'BoP feed → certified store',
    method: 'IMF BPM6 · OECD BD5',
    quality: 'Six gates',
    owner: 'Economic Affairs & Investment Studies Agency',
    state: 'Certified'
  },
  {
    id: 'gfcf',
    name: 'Gross Fixed Capital Formation',
    unit: 'SAR bn',
    status: 'watch',
    source: 'GASTAT national accounts',
    lineage: 'NA feed → certified store',
    method: 'SNA 2008',
    quality: 'Six gates',
    owner: 'Economic Affairs & Investment Studies Agency',
    state: 'Provisional · watch'
  }
];
