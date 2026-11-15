const fs = require('fs');
const path = require('path');

const sampleFile = path.resolve(__dirname, '../src/data/teluguEditionSample.ts');
let content = fs.readFileSync(sampleFile, 'utf8');

// Match the TELUGU_PREPLANNED_PAGES definition
const match = content.match(/export const TELUGU_PREPLANNED_PAGES: NewspaperPage\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not find TELUGU_PREPLANNED_PAGES in teluguEditionSample.ts');
  process.exit(1);
}

const pages = JSON.parse(match[1]);

// Rich contextual Telugu journalism content generators for each subject
const domainExpansions = {
  space: [
    "ఈ ప్రయోగంలో ఉపయోగించిన స్వదేశీ లిక్విడ్ ప్రొపల్షన్ ఇంజిన్లు నిర్దేశిత థ్రస్ట్‌ను ఉత్పత్తి చేస్తూ శాస్త్రవేత్తల ప్రణాళికను నూరు శాతం నిజం చేశాయి. కంట్రోల్ సెంటర్‌లోని టెలిమెట్రీ స్క్రీన్లపై ప్రతి సెకనుకు సంబంధించిన సమాచారాన్ని విశ్లేషించిన శాస్త్రవేత్తలు మిషన్ విజయంపై హర్షం వ్యక్తం చేశారు.",
    "భారత నావికాదళానికి చెందిన కమాండోలు సముద్రంలో ల్యాండ్ అయిన మాడ్యూల్‌ను నిమిషాల వ్యవధిలోనే గుర్తించి ప్రత్యేక క్రేన్ల సాయంతో సురక్షితంగా రికవరీ షిప్‌పైకి చేర్చారు. వ్యోమగాముల ప్రాణ రక్షణకు అత్యున్నత ప్రాధాన్యమిచ్చే వ్యవస్థలు ఇందులో విజయవంతంగా నిరూపితమయ్యాయి.",
    "ఈ విజయంతో అంతరిక్షంలో సొంత అంతరిక్ష కేంద్రాన్ని (భారతీయ అంతరిక్ష స్టేషన్) నిర్మించే దిశగా భారత్ మరో అడుగు ముందుకు వేసింది. రానున్న రోజుల్లో చంద్రయాన్-4, శుక్రయాన్ ప్రయోగాలకు సైతం ఈ క్రూ మాడ్యూల్ సాంకేతికత కీలక పునాదిగా ఉపయోగపడనుంది."
  ],
  defence: [
    "సరిహద్దుల్లో ఏ క్షణమైనా ఎదురయ్యే సవాళ్లను తిప్పికొట్టేందుకు ఈ విమానాలలో అత్యాధునిక ఎలక్ట్రానిక్ కౌంటర్ మెజర్స్ (ECM) వ్యవస్థలను అమర్చారు. శత్రువుల రాడార్ల నిఘా నుంచి తప్పించుకునే స్టెల్త్ లక్షణాలు ఇందులో ఉండటం వల్ల వైమానిక పైలట్లకు తిరుగులేని ఆధిక్యత లభిస్తుంది.",
    "స్వదేశీ రక్షణ పరిశ్రమలకు వేల కోట్ల ఆర్డర్లు లభించడం ద్వారా వేలాది మంది ఇంజనీర్లు, చిన్న తరహా ఎంఎస్ఎంఈ పరిశ్రమలకు భారీ ప్రోత్సాహం లభించింది. విదేశీ దిగుమతులపై ఆధారపడే రోజులు పోయి స్వదేశీ ఆయుధ సంపత్తే దేశానికి రక్షణ కవచంగా నిలుస్తోంది.",
    "హిందుస్థాన్ ఏరోనాటిక్స్ లిమిటెడ్ (హెచ్‌ఏఎల్) ఇప్పటికే అత్యాధునిక రోబోటిక్ అసెంబ్లీ లైన్లను ఏర్పాటు చేసింది. తద్వారా నిర్ణీత గడువులోగా భారత వాయుసేనకు ఈ ఫైటర్ జెట్లను సరఫరా చేయనున్నట్లు ఉన్నతాధికారులు ధృవీకరించారు."
  ],
  governance: [
    "పారదర్శకమైన ప్రజా పాలనను అందించడమే ప్రభుత్వ ప్రధాన లక్ష్యమని ఉన్నతాధికారులు స్పష్టం చేశారు. ప్రతి పథకం లబ్ధిదారుల ఎంపికలో రాజకీయ జోక్యం లేకుండా నేరుగా ఆధార్ ఆధారిత బయోమెట్రిక్ వెరిఫికేషన్ ద్వారా అర్హులందరికీ న్యాయం చేస్తున్నారు.",
    "గ్రామ, వార్డు సచివాలయాల స్థాయిలో పౌర సేవలను మరింత బలోపేతం చేసేందుకు ప్రత్యేక తనిఖీ బృందాలను రంగంలోకి దించారు. ప్రజల నుంచి వచ్చిన వినతులను వారం రోజుల్లోగా పరిష్కరించేలా ఎస్ఓపీ (స్టాండర్డ్ ఆపరేటింగ్ ప్రొసీజర్) ఖరారైంది.",
    "రాష్ట్ర బడ్జెట్‌లో సంక్షేమం మరియు అభివృద్ధికి సమ ప్రాధాన్యతనిస్తూ ప్రతి నియోజకవర్గంలోనూ మౌలిక వసతుల పనులను యుద్ధప్రాతిపదికన పూర్తి చేస్తున్నారు. నిధుల దుర్వినియోగానికి తావులేకుండా ఆడిట్ వ్యవస్థను పటిష్టం చేశారు."
  ],
  economy: [
    "నూతన పారిశ్రామిక పాలసీ ద్వారా గ్లోబల్ ఇన్వెస్టర్లకు సింగిల్ విండో అనుమతులు, మౌలిక సదుపాయాల కల్పనలో రాష్ట్రం దేశంలోనే ప్రథమ స్థానంలో నిలిచింది. పారిశ్రామిక కారిడార్లలో నిరంతర విద్యుత్, రవాణా సదుపాయాలు సమకూర్చారు.",
    "స్థానిక నిరుద్యోగ యువతకు పరిశ్రమల అవసరాలకు తగినట్లుగా నైపుణ్యాభివృద్ధి శిక్షణ అందిస్తున్నారు. దీనివల్ల వలసలు తగ్గి సొంత జిల్లాలోనే స్థిరమైన ఉపాధి లభించే వాతావరణం ఏర్పడిందని ఆర్థిక నిపుణులు విశ్లేషిస్తున్నారు.",
    "చిన్న తరహా పరిశ్రమలకు (MSME) సులభతర రుణాలు, మార్కెటింగ్ సదుపాయాలు కల్పించేందుకు ప్రభుత్వం సరికొత్త క్లస్టర్లను అభివృద్ధి చేస్తోంది. రానున్న ఐదేళ్లలో పారిశ్రామిక ఎగుమతులు రెట్టింపు కావడమే లక్ష్యంగా పెట్టుకున్నారు."
  ],
  general: [
    "క్షేత్రస్థాయిలో ప్రజల సమస్యలను ఎప్పటికప్పుడు తెలుసుకుని పరిష్కరించేందుకు ఉన్నతాధికారులు నిరంతరం పర్యవేక్షిస్తున్నారు. సంబంధిత శాఖల సమన్వయంతో ప్రాజెక్టులన్నీ నిర్ణీత గడువులోగా పూర్తి చేయాలని ఆదేశాలు జారీ అయ్యాయి.",
    "సామాన్య పౌరులకు మెరుగైన జీవన ప్రమాణాలు కల్పించడమే ధ్యేయంగా ప్రభుత్వం సరికొత్త విధివిధానాలను రూపొందించింది. ప్రజా సంక్షేమ కార్యక్రమాల అమలులో రాజీపడే ప్రసక్తే లేదని పాలకులు పునరుద్ఘాటించారు.",
    "ఈ సరికొత్త నిర్ణయం పట్ల ప్రజల నుంచి సర్వత్రా హర్షాతిరేకాలు వ్యక్తమవుతున్నాయి. భవిష్యత్ తరాలకు సురక్షితమైన, స్థిరమైన ప్రగతిని అందించేందుకు ఈ చర్యలు ఎంతగానో దోహదపడతాయని నిపుణులు అభిప్రాయపడుతున్నారు."
  ]
};

function getExpansion(category, title) {
  const t = (category + ' ' + title).toLowerCase();
  if (t.includes('ఇస్రో') || t.includes('గగన్‌యాన్') || t.includes('స్పేస్') || t.includes('అంతరిక్ష') || t.includes('సైన్స్')) {
    return domainExpansions.space;
  }
  if (t.includes('రక్షణ') || t.includes('తేజస్') || t.includes('యుద్ధ') || t.includes('తీరప్రాంత') || t.includes('భద్రత') || t.includes('కోర్టు') || t.includes('న్యాయ')) {
    return domainExpansions.defence;
  }
  if (t.includes('పారిశ్రామిక') || t.includes('పెట్టుబడుల') || t.includes('బడ్జెట్') || t.includes('మిర్చి') || t.includes('ఎగుమతి') || t.includes('బ్యాంక్') || t.includes('స్టీల్')) {
    return domainExpansions.economy;
  }
  if (t.includes('రాజధాని') || t.includes('అమరావతి') || t.includes('రైతు') || t.includes('సంక్షేమం') || t.includes('పోలవరం') || t.includes('గ్యాస్') || t.includes('మెట్రో')) {
    return domainExpansions.governance;
  }
  return domainExpansions.general;
}

pages.forEach((page, pIdx) => {
  page.blocks.forEach((block) => {
    const hasImage = !!block.imageUrl && block.imagePlacement !== 'none';
    const isLead = block.layoutRole === 'LEAD';
    const imgHeight = hasImage ? (block.imageHeight || (isLead ? 165 : 135)) : 0;
    const headlineH = block.headlineSize || 20;
    const bulletH = (block.bulletPoints && block.bulletPoints.length > 0) ? (block.bulletPoints.length * 18 + 15) : 0;
    
    // Available height for text in this block
    const availableTextHeight = block.height - imgHeight - headlineH - bulletH - 55;
    const colCount = block.columnSpan >= 5 ? 3 : block.columnSpan >= 3 ? 2 : 1;
    const targetLines = Math.max(8, Math.floor(availableTextHeight / 16.5)) * colCount;
    const wordsPerLine = block.columnSpan >= 5 ? 6 : 7;
    const targetWords = Math.max(80, Math.round(targetLines * wordsPerLine * 0.85));

    let currentWords = (block.bodyContent || '').split(/\s+/).length;
    const expansionPool = getExpansion(block.category, block.articleTitle);
    let expIdx = 0;

    while (currentWords < targetWords && expIdx < 10) {
      const sentence = expansionPool[expIdx % expansionPool.length];
      block.bodyContent = (block.bodyContent ? block.bodyContent + ' ' : '') + sentence;
      currentWords = block.bodyContent.split(/\s+/).length;
      expIdx++;
    }
  });
});

// Write updated content back
const newPagesJson = JSON.stringify(pages, null, 2);
const newCandidateStories = JSON.stringify(
  pages.flatMap(p => p.blocks.map(b => ({
    newsId: b.newsId,
    headline: b.articleTitle,
    title: b.articleTitle,
    summary: b.subheadline || b.leadParagraph,
    body: (b.leadParagraph || '') + ' ' + (b.bodyContent || ''),
    category: b.category,
    byline: b.byline,
    imageUrl: b.imageUrl,
    editorialPriority: b.priority?.editorialPriority || 7
  }))),
  null,
  2
);

const replaced = content
  .replace(/export const TELUGU_PREPLANNED_PAGES: NewspaperPage\[\] = \[[\s\S]*?\];/, 'export const TELUGU_PREPLANNED_PAGES: NewspaperPage[] = ' + newPagesJson + ';')
  .replace(/export const TELUGU_EDITION_CANDIDATE_STORIES: any\[\] = \[[\s\S]*?\];/, 'export const TELUGU_EDITION_CANDIDATE_STORIES: any[] = ' + newCandidateStories + ';');

fs.writeFileSync(sampleFile, replaced, 'utf8');
console.log('Successfully enriched all article copy across all 4 pages to 100% density!');
