/**
 * Seeded owner messages for the desk inbox.
 * Tied to open signals already in the pack - not invented traffic.
 */
export const INBOX = [
  {
    id: 'm1',
    from: 'Investment Development Agency',
    fromContact: 'ida.steward@misa.gov.sa',
    title: 'Six deal indicators still unpopulated',
    titleAr: 'ستة مؤشرات صفقات ما زالت فارغة',
    body: 'Closure criteria still differ between the two agencies. We will confirm one definition before the next pack.',
    bodyAr: 'معايير الإغلاق ما زالت تختلف بين الجهتين. سنؤكد تعريفاً واحداً قبل الحزمة التالية.',
    at: '2026-08-14T16:20:00+03:00',
    kind: 'reply',
    alertId: 'a2',
    toDept: 'Economic Affairs'
  },
  {
    id: 'm2',
    from: 'Economic Affairs',
    fromContact: 'economic.affairs@misa.gov.sa',
    title: 'GFCF construction reclassification',
    titleAr: 'إعادة تصنيف إنشاءات تكوين رأس المال',
    body: 'Two mega-projects moved to machinery. Headline GFCF stands. A qualification note is ready for the pack.',
    bodyAr: 'مشروعان كبيران نُقلا إلى الآلات. الرقم الرئيسي قائم. ملاحظة التوضيح جاهزة للحزمة.',
    at: '2026-08-15T09:10:00+03:00',
    kind: 'note',
    alertId: 'a1',
    toDept: 'Economic Affairs'
  },
  {
    id: 'm3',
    from: 'Data steward',
    fromContact: 'data.steward@misa.gov.sa',
    title: 'Capital-goods imports watch',
    titleAr: 'مراقبة واردات السلع الرأسمالية',
    body: 'Third consecutive fall is flagged. Confirm whether GFCF should carry a watch note for the Committee.',
    bodyAr: 'الانخفاض الثالث على التوالي مُعلَّم. أكّد إن كان تكوين رأس المال يحتاج ملاحظة مراقبة للجنة.',
    at: '2026-08-13T11:00:00+03:00',
    kind: 'ask',
    alertId: 'a3',
    toDept: 'Economic Affairs'
  },
  {
    id: 'm4',
    from: 'Economic Affairs',
    fromContact: 'economic.affairs@misa.gov.sa',
    title: 'Deal pipeline still has no value',
    titleAr: 'خط الصفقات بلا قيمة',
    body: 'Pulse cannot certify deals or closure until one definition is signed. This sits on your desk.',
    bodyAr: 'لا يمكن اعتماد الصفقات أو الإغلاق حتى يُوقَّع تعريف واحد. هذا على مكتبك.',
    at: '2026-08-14T10:05:00+03:00',
    kind: 'ask',
    alertId: 'a2',
    toDept: 'Investment Development Agency'
  }
];
