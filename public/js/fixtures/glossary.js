/** Operating vocabulary. Pack language only - no invented indicators. */
export const GLOSSARY = [
  {
    id: 'fdi',
    term: 'FDI',
    termAr: 'الاستثمار الأجنبي المباشر',
    body: 'Foreign direct investment. Pulse prints net FDI under IMF BPM6: equity + reinvested earnings + debt, after outflow. Unit is SAR billion.',
    bodyAr: 'الاستثمار الأجنبي المباشر. النبض يعرض الصافي وفق BPM6: حقوق ملكية + أرباح معاد استثمارها + أدوات دين بعد التدفق الخارج. الوحدة مليار ريال.'
  },
  {
    id: 'gfcf',
    term: 'GFCF',
    termAr: 'تكوين رأس المال الثابت',
    body: 'Gross fixed capital formation under SNA 2008. The Pulse value can be an Economic Affairs forecast when GASTAT has not issued the quarter.',
    bodyAr: 'إجمالي تكوين رأس المال الثابت وفق SNA 2008. قيمة النبض قد تكون توقع الشؤون الاقتصادية إذا لم تصدر الهيئة الرقم الفصلي.'
  },
  {
    id: 'bpm6',
    term: 'BPM6',
    termAr: 'BPM6',
    body: 'IMF Balance of Payments Manual, sixth edition. The method stamp on the FDI headline.',
    bodyAr: 'دليل ميزان المدفوعات الصادر عن صندوق النقد، الطبعة السادسة. ختم المنهج على رقم الاستثمار الأجنبي.'
  },
  {
    id: 'sna',
    term: 'SNA 2008',
    termAr: 'SNA 2008',
    body: 'System of National Accounts 2008. The method stamp on GFCF.',
    bodyAr: 'نظام الحسابات القومية 2008. ختم المنهج على تكوين رأس المال.'
  },
  {
    id: 'immediate',
    term: 'Immediate country',
    termAr: 'الدولة المباشرة',
    body: 'The counterpart economy on investsaudi.sa/fdi. It is the published origin of the inflow, not a modelled arrow. Country-year rows cover 2016-2024.',
    bodyAr: 'الاقتصاد المقابل على investsaudi.sa/fdi. أصل التدفق المنشور، وليس سهماً منمذجاً. الصفوف تغطي 2016-2024.'
  },
  {
    id: 'certified',
    term: 'Certified Pulse',
    termAr: 'النبض المعتمد',
    body: 'The signed pack print. Live intake can pull a feed. A person certifies. Refresh does not overwrite this number until that sign-off.',
    bodyAr: 'الرقم الموقع في الحزمة. السحب الحي يجلب المصدر. شخص يعتمد. التحديث لا يستبدل هذا الرقم قبل التوقيع.'
  },
  {
    id: 'nowcast',
    term: 'Nowcast',
    termAr: 'تقدير الربع',
    body: 'On this hosted prototype the in-quarter path is a populated synthetic estimate. It is not a MISA calculation. It never replaces the official GASTAT print.',
    bodyAr: 'على هذا النموذج المستضاف مسار الربع تقدير تركيبي مُعبَّأ. ليس حساباً وزارياً. لا يحل محل الرقم الرسمي من الهيئة.'
  },
  {
    id: 'dqaf',
    term: 'DQAF',
    termAr: 'DQAF',
    body: 'IMF Data Quality Assessment Framework. Six gates. A machine flags. A named person signs.',
    bodyAr: 'إطار تقييم جودة البيانات. ست بوابات. الآلة تشير. شخص مسمّى يوقّع.'
  },
  {
    id: 'signal',
    term: 'Leading signal',
    termAr: 'إشارة استباقية',
    body: 'One of the 20 pack signals used for early movement on FDI or GFCF. Status is always a word plus an icon, never colour alone.',
    bodyAr: 'واحدة من 20 إشارة في الحزمة للحركة المبكرة على الاستثمار أو تكوين رأس المال. الحالة كلمة وأيقونة، لا لون وحده.'
  },
  {
    id: 'pack',
    term: 'Pack',
    termAr: 'الحزمة',
    body: 'The certified set on the board: 2 headlines and 20 leading signals. The inventory holds 326 ministry metrics. Those two counts stay distinct.',
    bodyAr: 'المجموعة المعتمدة على اللوحة: عنوانان و20 إشارة. المخزون فيه 326 مؤشراً وزارياً. العددان يبقيان منفصلين.'
  },
  {
    id: 'nis',
    term: 'NIS 2030',
    termAr: 'الاستراتيجية الوطنية 2030',
    body: 'National Investment Strategy cumulative targets. Pulse shows progress against those stocks. It does not invent a new target.',
    bodyAr: 'مستهدفات الاستراتيجية الوطنية للاستثمار التراكمية. النبض يعرض التقدم مقابل تلك الأرصدة. لا يخترع مستهدفاً جديداً.'
  },
  {
    id: 'owner',
    term: 'KPI owner',
    termAr: 'مالك المؤشر',
    body: 'The desk accountable for the published value. Ask that owner when a figure needs qualification before the Committee pack.',
    bodyAr: 'المكتب المسؤول عن الرقم المنشور. اسأل المالك إذا احتاج الرقم توضيحاً قبل حزمة اللجنة.'
  },
  {
    id: 'quarantine',
    term: 'Quarantine',
    termAr: 'الحجر',
    body: 'A held value on Alerts. It does not enter the certified Pulse until the owner clears it.',
    bodyAr: 'قيمة موقوفة في التنبيهات. لا تدخل النبض المعتمد حتى يفرج عنها المالك.'
  },
  {
    id: 'drill',
    term: 'Four-tap drill',
    termAr: 'المسار الرباعي',
    body: 'Headline, indicator, sector or region, then the source record. That is how a number is traced.',
    bodyAr: 'العنوان، المؤشر، القطاع أو المنطقة، ثم سجل المصدر. هكذا يُتتبع الرقم.'
  }
];
