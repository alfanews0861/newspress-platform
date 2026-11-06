import { TELUGU_PREPLANNED_PAGES } from '../data/teluguEditionSample';

const p1 = TELUGU_PREPLANNED_PAGES[0];

const defaultContentTop = 142;
const footerTop = 1064;
const availableHeight = footerTop - defaultContentTop;

console.log('Available height:', availableHeight);

const trackMap = new Map();
const sorted = [...p1.blocks].sort((a, b) => {
  if (a.columnStart !== b.columnStart) return a.columnStart - b.columnStart;
  return (a.rowStart ?? a.y) - (b.rowStart ?? b.y);
});

for (const b of sorted) {
  const key = `${b.columnStart}_${b.columnSpan}`;
  if (!trackMap.has(key)) trackMap.set(key, []);
  trackMap.get(key).push(b);
}

for (const [key, blocks] of trackMap.entries()) {
  console.log('Track:', key, 'blocks:', blocks.map((b: any) => ({
    id: b.placementId,
    title: b.articleTitle.slice(0, 30),
    colStart: b.columnStart,
    colSpan: b.columnSpan,
    hasImage: !!b.imageUrl && b.imagePlacement !== 'none',
    imageHeight: b.imageHeight,
    bodyLen: b.bodyContent?.length
  })));
}
