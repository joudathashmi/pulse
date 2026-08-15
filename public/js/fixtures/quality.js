export const GATES = [
  ['Schema and type','numeric, units SAR mn, non-null, ISIC and geography codes valid','412 checked','0 held'],
  ['Range and plausibility','within credible bounds, period-on-period jump within tolerance','412 checked','3 held'],
  ['Completeness and freshness','all series and fields present, data age within the agreed window','412 checked','6 held'],
  ['Cross-source reconciliation','control equation ties: FDI equals equity plus reinvested earnings plus debt','118 checked','1 held'],
  ['Anomaly detection','outliers, structural breaks and suspicious revisions flagged','412 checked','2 held'],
  ['Human sign-off','a steward approves every exception; full audit trail','12 raised','12 cleared']
];
export const EXCEPTIONS = [
  ['GFCF · construction, 2026 Q1','Period-on-period fall of 12% exceeds tolerance','Held, not published','Economic Affairs','Reclassification confirmed; released with a note'],
  ['Deal pipeline value','No source record for six indicators','Cannot be computed','Investment Development Agency','Awaiting an agreed closure definition'],
  ['GFCF by investor class','Shareek method differs from GASTAT; history restated','Held for ruling','Methodology board','Scheduled for the next board']
];
