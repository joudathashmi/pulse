/** ISO3 → ISO2 for flag marks. Missing codes return ''. */
const ISO3_TO_2 = {
  AFG: 'af', AGO: 'ao', ALB: 'al', AND: 'ad', ARE: 'ae', ARG: 'ar', ARM: 'am',
  ASM: 'as', ATG: 'ag', AUS: 'au', AUT: 'at', AZE: 'az', BDI: 'bi', BEL: 'be',
  BEN: 'bj', BFA: 'bf', BGD: 'bd', BGR: 'bg', BHR: 'bh', BHS: 'bs', BIH: 'ba',
  BLR: 'by', BLZ: 'bz', BMU: 'bm', BOL: 'bo', BRA: 'br', BRB: 'bb', BRN: 'bn',
  BWA: 'bw', CAN: 'ca', CHE: 'ch', CHL: 'cl', CHN: 'cn', CIV: 'ci', CMR: 'cm',
  COD: 'cd', COG: 'cg', COL: 'co', CRI: 'cr', CUB: 'cu', CUW: 'cw', CYM: 'ky',
  CYP: 'cy', CZE: 'cz', DEU: 'de', DJI: 'dj', DMA: 'dm', DNK: 'dk', DOM: 'do',
  DZA: 'dz', EGY: 'eg', ERI: 'er', ESP: 'es', EST: 'ee', ETH: 'et', FIN: 'fi',
  FJI: 'fj', FLK: 'fk', FRA: 'fr', GBR: 'gb', GEO: 'ge', GGY: 'gg', GHA: 'gh',
  GIB: 'gi', GLP: 'gp', GRC: 'gr', GRD: 'gd', GTM: 'gt', GUY: 'gy', HKG: 'hk',
  HRV: 'hr', HUN: 'hu', IDN: 'id', IMN: 'im', IND: 'in', IRL: 'ie', IRQ: 'iq',
  ISL: 'is', ITA: 'it', JEY: 'je', JOR: 'jo', JPN: 'jp', KAZ: 'kz', KEN: 'ke',
  KGZ: 'kg', KHM: 'kh', KNA: 'kn', KOR: 'kr', KWT: 'kw', LBN: 'lb', LBR: 'lr',
  LBY: 'ly', LCA: 'lc', LIE: 'li', LKA: 'lk', LTU: 'lt', LUX: 'lu', LVA: 'lv',
  MAR: 'ma', MCO: 'mc', MDG: 'mg', MEX: 'mx', MHL: 'mh', MKD: 'mk', MLI: 'ml',
  MLT: 'mt', MMR: 'mm', MRT: 'mr', MUS: 'mu', MWI: 'mw', MYS: 'my', NAM: 'na',
  NER: 'ne', NGA: 'ng', NLD: 'nl', NOR: 'no', NPL: 'np', NZL: 'nz', OMN: 'om',
  PAK: 'pk', PAN: 'pa', PER: 'pe', PHL: 'ph', POL: 'pl', PRT: 'pt', PSE: 'ps',
  QAT: 'qa', ROU: 'ro', RUS: 'ru', SAU: 'sa', SDN: 'sd', SEN: 'sn', SGP: 'sg',
  SLV: 'sv', SOM: 'so', SRB: 'rs', SVK: 'sk', SVN: 'si', SWE: 'se', SWZ: 'sz',
  SYC: 'sc', SYR: 'sy', TCA: 'tc', TCD: 'td', TGO: 'tg', THA: 'th', TKM: 'tm',
  TTO: 'tt', TUN: 'tn', TUR: 'tr', TWN: 'tw', TZA: 'tz', UGA: 'ug', UKR: 'ua',
  URY: 'uy', USA: 'us', UZB: 'uz', VCT: 'vc', VEN: 've', VGB: 'vg', VIR: 'vi',
  VNM: 'vn', VUT: 'vu', XKX: 'xk', YEM: 'ye', ZAF: 'za', ZMB: 'zm', ZWE: 'zw'
};

export function iso2(iso3) {
  return ISO3_TO_2[iso3] || '';
}

export function flagSrc(iso3) {
  const a2 = iso2(iso3);
  return a2 ? `https://flagcdn.com/w40/${a2}.png` : '';
}

export function flagImg(iso3, name = '') {
  const src = flagSrc(iso3);
  if (!src) return '';
  return `<img class="fdi-flag" src="${src}" alt="" width="16" height="12" title="${name}">`;
}
