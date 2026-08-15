/** FDI origin flows into the Kingdom + regional distribution (modelled for the prototype). */
export const FDI_FLOWS = [
  { id: 'us', name: 'United States', lon: -77, lat: 39, value: 8.4, share: 0.22 },
  { id: 'ae', name: 'United Arab Emirates', lon: 54.4, lat: 24.4, value: 6.1, share: 0.16 },
  { id: 'cn', name: 'China', lon: 116.4, lat: 39.9, value: 5.2, share: 0.13 },
  { id: 'gb', name: 'United Kingdom', lon: -0.1, lat: 51.5, value: 4.3, share: 0.11 },
  { id: 'fr', name: 'France', lon: 2.3, lat: 48.9, value: 3.1, share: 0.08 },
  { id: 'jp', name: 'Japan', lon: 139.7, lat: 35.7, value: 2.8, share: 0.07 },
  { id: 'in', name: 'India', lon: 77.2, lat: 28.6, value: 2.4, share: 0.06 },
  { id: 'de', name: 'Germany', lon: 13.4, lat: 52.5, value: 2.1, share: 0.05 },
  { id: 'sg', name: 'Singapore', lon: 103.8, lat: 1.3, value: 1.9, share: 0.05 },
  { id: 'other', name: 'Other origins', lon: 20, lat: 10, value: 2.6, share: 0.07 }
];

/** Regional FDI / GFCF shares inside the Kingdom (SAR bn, Q1 2026 modelled). */
export const KSA_REGIONS = [
  { id: 'riyadh', name: 'Riyadh', lon: 46.7, lat: 24.7, fdi: 14.2, gfcf: 142 },
  { id: 'eastern', name: 'Eastern Province', lon: 50.1, lat: 26.4, fdi: 9.8, gfcf: 98 },
  { id: 'makkah', name: 'Makkah', lon: 39.8, lat: 21.4, fdi: 6.4, gfcf: 71 },
  { id: 'madinah', name: 'Madinah', lon: 39.6, lat: 24.5, fdi: 3.1, gfcf: 28 },
  { id: 'asir', name: 'Aseer', lon: 42.5, lat: 18.2, fdi: 2.2, gfcf: 19 },
  { id: 'tabuk', name: 'Tabuk', lon: 36.6, lat: 28.4, fdi: 1.8, gfcf: 12 },
  { id: 'other', name: 'Other regions', lon: 44.0, lat: 23.0, fdi: 1.4, gfcf: 9 }
];

export const SAUDI_CENTER = { lon: 45.0, lat: 24.5 };
