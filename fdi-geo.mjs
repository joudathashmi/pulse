/**
 * Map Invest Saudi country names to ISO3 + coordinates.
 * Values on the public page are SAR thousands; we convert to SAR bn.
 * Coordinates are for drawing arrows, not a second statistical series.
 */

export const INVEST_SAUDI_URL = 'https://investsaudi.sa/fdi';
export const INVEST_SAUDI_API = 'https://investsaudi.sa/backend/wp-json/v3/fdi-page?X-Currency=sar';

/** Exact names as published on the FDI Insights page. null = no map point. */
export const NAME_TO_ISO = {
  Afghanistan: 'AFG',
  Albania: 'ALB',
  Algeria: 'DZA',
  'American Samoa': 'ASM',
  Andorra: 'AND',
  Angola: 'AGO',
  'Antigua And Barbuda': 'ATG',
  Argentina: 'ARG',
  Armenia: 'ARM',
  Australia: 'AUS',
  Austria: 'AUT',
  Azerbaijan: 'AZE',
  Bahamas: 'BHS',
  Bahrain: 'BHR',
  Bangladesh: 'BGD',
  Barbados: 'BRB',
  Belarus: 'BLR',
  Belgium: 'BEL',
  Belize: 'BLZ',
  Bermuda: 'BMU',
  'Bolivia (Plurinational State of)': 'BOL',
  'Bosnia and Herzegovina': 'BIH',
  Botswana: 'BWA',
  Brazil: 'BRA',
  'British Indian Ocean Territory': null,
  'British Virgin Islands': 'VGB',
  'Brunei Darussalam': 'BRN',
  Bulgaria: 'BGR',
  Cameroon: 'CMR',
  Canada: 'CAN',
  'Cayman Islands': 'CYM',
  Chad: 'TCD',
  Chile: 'CHL',
  China: 'CHN',
  'China, Hong Kong SAR': 'HKG',
  Colombia: 'COL',
  'Congo, Democtatic Republic Of': 'COD',
  'Congo, Republic Of': 'COG',
  'Costa Rica': 'CRI',
  Croatia: 'HRV',
  Cuba: 'CUB',
  Curacao: 'CUW',
  Cyprus: 'CYP',
  'Czech Republic': 'CZE',
  "Côte d'Ivoire": 'CIV',
  Denmark: 'DNK',
  Djibouti: 'DJI',
  Dominica: 'DMA',
  'Dominican Republic': 'DOM',
  Egypt: 'EGY',
  Eritrea: 'ERI',
  Estonia: 'EST',
  'Eswatini, Kingdom of': 'SWZ',
  Ethiopia: 'ETH',
  'Falkland Islands (Malvinas)': 'FLK',
  Finland: 'FIN',
  France: 'FRA',
  Georgia: 'GEO',
  Germany: 'DEU',
  Ghana: 'GHA',
  Gibraltar: 'GIB',
  Greece: 'GRC',
  Grenada: 'GRD',
  Guadeloupe: 'GLP',
  Guatemala: 'GTM',
  Guernsey: 'GGY',
  Guyana: 'GUY',
  Hungary: 'HUN',
  Iceland: 'ISL',
  India: 'IND',
  Indonesia: 'IDN',
  Iraq: 'IRQ',
  Ireland: 'IRL',
  'Isle of Man': 'IMN',
  Italy: 'ITA',
  Japan: 'JPN',
  Jersey: 'JEY',
  Jordan: 'JOR',
  Kazakhstan: 'KAZ',
  Kenya: 'KEN',
  'Korea, Republic of': 'KOR',
  Kosovo: 'XKX',
  Kuwait: 'KWT',
  'Kyrgyz Republic': 'KGZ',
  Latvia: 'LVA',
  Lebanon: 'LBN',
  Liberia: 'LBR',
  Libya: 'LBY',
  Liechtenstein: 'LIE',
  Lithuania: 'LTU',
  Luxembourg: 'LUX',
  Madagascar: 'MDG',
  Malawi: 'MWI',
  Malaysia: 'MYS',
  Mali: 'MLI',
  Malta: 'MLT',
  'Marshall Islands': 'MHL',
  Mauritania: 'MRT',
  Mauritius: 'MUS',
  Mexico: 'MEX',
  Monaco: 'MCO',
  Morocco: 'MAR',
  Mozambique: 'MOZ',
  Myanmar: 'MMR',
  Namibia: 'NAM',
  Nepal: 'NPL',
  Netherlands: 'NLD',
  'Netherlands Antilles': null,
  'New Zealand': 'NZL',
  Niger: 'NER',
  Nigeria: 'NGA',
  'North Macedonia, Republic of': 'MKD',
  Norway: 'NOR',
  'Not Available (N/A)': null,
  Oman: 'OMN',
  Pakistan: 'PAK',
  Palestine: 'PSE',
  Panama: 'PAN',
  Peru: 'PER',
  Philippines: 'PHL',
  Pitcairn: null,
  Poland: 'POL',
  Portugal: 'PRT',
  Qatar: 'QAT',
  Romania: 'ROU',
  'Russian Federation': 'RUS',
  'Saint Kitts and Nevis': 'KNA',
  'Saint Lucia': 'LCA',
  'Saint Vincent and the Grenadines': 'VCT',
  Senegal: 'SEN',
  'Serbia, Republic of': 'SRB',
  Seychelles: 'SYC',
  Singapore: 'SGP',
  'Slovak Republic': 'SVK',
  Slovenia: 'SVN',
  Somalia: 'SOM',
  'South Africa': 'ZAF',
  Spain: 'ESP',
  'Sri Lanka': 'LKA',
  Sudan: 'SDN',
  Sweden: 'SWE',
  Switzerland: 'CHE',
  'Syrian Arab Republic': 'SYR',
  'Taiwan Province of China': 'TWN',
  Tanzania: 'TZA',
  Thailand: 'THA',
  Togo: 'TGO',
  'Trinidad and Tobago': 'TTO',
  Tunisia: 'TUN',
  Turkey: 'TUR',
  Turkmenistan: 'TKM',
  'Turks and Caicos Islands': 'TCA',
  'US Virgin Islands': 'VIR',
  Uganda: 'UGA',
  Ukraine: 'UKR',
  'United Arab Emirates': 'ARE',
  'United Kingdom': 'GBR',
  'United States': 'USA',
  'United States Minor Outlying Islands': null,
  Uruguay: 'URY',
  Uzbekistan: 'UZB',
  Vanuatu: 'VUT',
  'Venezuela (Bolivarian Rep. of)': 'VEN',
  Vietnam: 'VNM',
  'Yemen, Republic of': 'YEM',
  Zambia: 'ZMB',
  Zimbabwe: 'ZWE'
};

/** Capitals / economic centres for economies not on Natural Earth 110m land. */
const GAZETTEER = {
  AND: [1.52, 42.51],
  ASM: [-170.7, -14.3],
  ATG: [-61.8, 17.07],
  BHR: [50.58, 26.22],
  BMU: [-64.78, 32.3],
  BRB: [-59.54, 13.19],
  CUW: [-68.99, 12.17],
  CYM: [-81.25, 19.31],
  DMA: [-61.39, 15.41],
  GGY: [-2.54, 49.46],
  GIB: [-5.35, 36.14],
  GLP: [-61.55, 16.25],
  GRD: [-61.68, 12.12],
  HKG: [114.17, 22.32],
  IMN: [-4.53, 54.23],
  JEY: [-2.13, 49.19],
  KNA: [-62.78, 17.36],
  LCA: [-60.98, 13.91],
  LIE: [9.55, 47.17],
  MCO: [7.42, 43.74],
  MHL: [171.18, 7.13],
  MLT: [14.38, 35.94],
  MUS: [57.5, -20.16],
  SGP: [103.82, 1.35],
  SYC: [55.45, -4.62],
  TCA: [-71.8, 21.75],
  VCT: [-61.21, 13.25],
  VGB: [-64.62, 18.42],
  VIR: [-64.9, 18.34],
  XKX: [21.17, 42.6]
};

export function toBn(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Number((n / 1e6).toFixed(6)) : null;
}

export function indexWorld(world) {
  const byId = new Map();
  for (const c of world.countries || []) byId.set(c.id, c);
  return byId;
}

export function locateCountry(name, worldById) {
  const id = Object.prototype.hasOwnProperty.call(NAME_TO_ISO, name)
    ? NAME_TO_ISO[name]
    : undefined;
  if (id == null) return { id: null, lon: null, lat: null, mapped: false };
  const land = worldById.get(id);
  if (land?.c) return { id, lon: land.c[0], lat: land.c[1], mapped: true };
  const gaz = GAZETTEER[id];
  if (gaz) return { id, lon: gaz[0], lat: gaz[1], mapped: true };
  return { id, lon: null, lat: null, mapped: false };
}

export function normalizeInvestSaudi(page, world, pulledAt = new Date().toISOString()) {
  const worldById = indexWorld(world);
  const countryRows = page?.data?.fdiMapData?.topCountries?.fdiCountriesFullData || [];
  const sectorRows = page?.data?.fdiSectorData?.fdiSectorData || [];
  const unmatched = new Set();

  const countries = countryRows.map(r => {
    const loc = locateCountry(r.country, worldById);
    if (!loc.id && r.country) unmatched.add(r.country);
    return {
      id: loc.id,
      name: r.country,
      lon: loc.lon,
      lat: loc.lat,
      year: r.year,
      inflow: toBn(r.inflow),
      net: toBn(r.netInflow),
      stock: toBn(r.stock),
      continent: r.continent || '',
      region: r.region || ''
    };
  });

  const sectors = sectorRows.map(r => ({
    sector: r.sector,
    year: r.year,
    inflow: toBn(r.inflow),
    net: toBn(r.netInflow),
    stock: toBn(r.stocks)
  }));

  return {
    source: {
      title: 'Invest Saudi FDI Insights',
      page: INVEST_SAUDI_URL,
      api: INVEST_SAUDI_API,
      publisher: page?.data?.fdiMapData?.topCountries?.sourceText || 'Ministry of Investment',
      unit: 'SAR bn',
      series: 'Immediate country and ISIC sector, as published',
      note: 'Converted from SAR thousands on the public dashboard. Country-year sums match the 2016-2024 Inflows workbook. The marketing headlines on the same page (119 / 80 / 977 for 2024) are a different rounding and do not replace the certified Pulse.'
    },
    pulledAt,
    countries,
    sectors,
    unmatched: [...unmatched]
  };
}
