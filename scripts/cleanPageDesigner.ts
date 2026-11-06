import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(process.cwd(), 'src/pages/newspaper/PageDesignerPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace the block rendering section between {/* 2. PLACED STORY BLOCKS */} and {/* 3. PLACED ADVERTISEMENTS */}
const startMarker = '{/* 2. PLACED STORY BLOCKS */}';
const endMarker = '{/* 3. PLACED ADVERTISEMENTS */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers for blocks');
  process.exit(1);
}

const newBlocksRenderer = `{/* 2. PLACED STORY BLOCKS (Staggered Broadsheet Multi-Column Layout) */}
        {(pageToRender.blocks || []).map((block) => {
          const isSelected = isInteractive && block.placementId === selectedBlockId;
          const isLead = block.layoutRole === 'LEAD';
          const isAnchor = block.styleVariant === 'anchor_box';
          const isBrief = block.styleVariant === 'sidebar_brief';
          const isWide = block.columnSpan >= 4;
          const hasImage = !!block.imageUrl && block.imagePlacement !== 'none';
          const hasBullets = !!block.bulletPoints && block.bulletPoints.length > 0;

          return (
            <div
              key={block.placementId}
              onClick={(e) => {
                if (!isInteractive) return;
                e.stopPropagation();
                handleSelectBlock(block.placementId);
              }}
              className={\`absolute flex flex-col transition-all overflow-hidden \${
                isInteractive ? 'cursor-pointer group' : ''
              } \${
                isSelected ? 'ring-2 ring-blue-600 shadow-md z-10' : ''
              }\`}
              style={{
                top: \`\${block.y}px\`,
                left: \`\${block.x}px\`,
                width: \`\${block.width}px\`,
                height: \`\${block.height}px\`,
                backgroundColor: block.cardBackground || '#ffffff',
                border: isAnchor ? '1.5px solid #d97706' : undefined,
                borderRight: isAnchor ? undefined : (block.columnStart + block.columnSpan - 1 < grid.columnCount ? '1px solid #cbd5e1' : 'none'),
                borderBottom: isAnchor ? undefined : (block.y + block.height < 1050 ? '1px solid #cbd5e1' : 'none'),
                padding: isAnchor ? '10px 12px' : '9px 11px',
                boxSizing: 'border-box',
              }}
            >
              {/* Lock Indicator */}
              {isInteractive && block.locked && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded shadow-xs z-10" title="Locked block">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Kicker Badge */}
              {block.kicker ? (
                <div
                  className="inline-flex items-center text-[9px] font-bold rounded-xs px-1.5 py-0.5 mb-1 text-white shadow-2xs shrink-0 self-start"
                  style={{
                    backgroundColor: block.accentColor || (isBrief ? '#b91c1c' : isAnchor ? '#d97706' : isLead ? '#991b1b' : '#1e3a8a'),
                    fontFamily: isTelugu ? "'Ramabhadra', 'Noto Serif Telugu', serif" : 'inherit',
                  }}
                >
                  {isBrief && <span className="mr-1">⚡</span>}
                  {block.kicker}
                </div>
              ) : block.category ? (
                <div className="text-[8.5px] font-sans font-bold uppercase tracking-wider text-red-700 border-b border-red-100 pb-0.5 mb-1 shrink-0">
                  {block.category}
                </div>
              ) : null}

              {/* Headline */}
              <h2
                className={\`leading-snug mb-1 font-black shrink-0 \${
                  isLead ? 'border-b border-red-200 pb-1 text-red-950' : 'text-slate-900'
                }\`}
                style={{
                  fontFamily: isTelugu
                    ? (block.headlineFont || "'Ramabhadra', 'Noto Serif Telugu', serif")
                    : 'inherit',
                  fontSize: \`\${block.headlineSize || (isLead ? 24 : 18)}px\`,
                  color: block.headlineColor || (isLead ? '#991b1b' : isAnchor ? '#78350f' : '#0f172a'),
                  lineHeight: isTelugu ? '1.3' : '1.24',
                }}
              >
                {block.articleTitle}
              </h2>

              {/* Subheadline */}
              {block.subheadline && (
                <p
                  className="text-[11px] text-slate-700 font-medium leading-snug mb-1 italic shrink-0"
                  style={{ fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit' }}
                >
                  {block.subheadline}
                </p>
              )}

              {/* Photo Visual */}
              {hasImage && (
                <div className="mb-1 w-full overflow-hidden rounded-xs border border-slate-200 shrink-0">
                  <img
                    src={block.imageUrl}
                    alt={block.articleTitle}
                    loading="eager"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="w-full object-cover"
                    style={{
                      height: \`\${block.imageHeight || 110}px\`,
                    }}
                  />
                  {block.imageCaption && (
                    <div
                      className="text-[8.5px] text-slate-600 bg-slate-50 border-t border-slate-200 px-1 py-0.5 leading-tight"
                      style={{ fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit' }}
                    >
                      📷 {block.imageCaption}
                    </div>
                  )}
                </div>
              )}

              {/* Bullet Highlights / Key Takeaway Box (Sakshi style) */}
              {hasBullets && (
                <div
                  className="my-1 p-1.5 bg-red-50/90 border-l-3 border-red-700 text-[10.5px] text-slate-900 leading-snug rounded-r shrink-0"
                  style={{ fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit' }}
                >
                  <div className="font-bold text-red-900 text-[10px] mb-0.5 flex items-center gap-1">
                    <span>📌</span>
                    <span>కీలక ముఖ్యాంశాలు:</span>
                  </div>
                  <ul className="space-y-0.5 pl-0.5">
                    {block.bulletPoints?.map((bp, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-red-700 mr-1 font-bold">▪</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Byline & Beat */}
              <div
                className="text-[9.5px] text-red-900 font-semibold mb-1 italic flex items-center justify-between border-b border-slate-100 pb-0.5 shrink-0"
                style={{ fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit' }}
              >
                <div className="flex items-center gap-1">
                  <span>✍️</span>
                  <span>{isTelugu ? (block.byline || 'ఆంధ్ర ప్రభ బ్యూరో') : \`By \${block.byline || 'Staff Reporter'}\`}</span>
                </div>
                {block.category && (
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold bg-slate-100 px-1 py-0.2 rounded-xs">
                    {block.category}
                  </span>
                )}
              </div>

              {/* Full Body Text (Multi-column flow for wide stories) */}
              <div
                className="text-slate-950 flex-1 leading-relaxed"
                style={{
                  fontFamily: isTelugu ? "'Mallanna', sans-serif" : 'inherit',
                  fontSize: isTelugu ? \`\${block.bodyFontSize || 12}px\` : '11px',
                  lineHeight: isTelugu ? '1.44' : '1.38',
                  textAlign: 'justify',
                  wordBreak: 'break-word',
                  columnCount: isWide ? 2 : 1,
                  columnGap: isWide ? '14px' : 'normal',
                }}
              >
                {block.leadParagraph && (
                  <span className="font-bold text-slate-950 mr-1 block mb-1">
                    {block.leadParagraph}
                  </span>
                )}
                <span>{block.bodyContent}</span>
              </div>
            </div>
          );
        })}

        `;

content = content.substring(0, startIndex) + newBlocksRenderer + content.substring(endIndex);

// 2. Clean the topbar center section: remove Pinterest / Grid toggle and column selector
const topbarCenterStart = '{/* Center: Pinterest Layout Controls, Page Switcher & Zoom */}';
const topbarRightMarker = '{/* Right: PDF Download */}';

const tbStartIndex = content.indexOf(topbarCenterStart);
const tbEndIndex = content.indexOf(topbarRightMarker);

if (tbStartIndex !== -1 && tbEndIndex !== -1) {
  const newTopbarCenter = `{/* Center: Page Switcher & Zoom */}
        <div className="flex items-center space-x-3">
          {/* Page Switcher: pure 1/4 */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPageIndex === 0}
              className="p-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer transition-colors"
              title="మునుపటి పేజీ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-xs text-slate-800 dark:text-slate-100 font-mono tracking-wide">
              {currentPageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              disabled={currentPageIndex === pages.length - 1}
              className="p-1 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer transition-colors"
              title="తరువాతి పేజీ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Simple Zoom Controls */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-0.5 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-bold text-blue-600 dark:text-blue-400 font-mono">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
              className="p-0.5 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        `;

  content = content.substring(0, tbStartIndex) + newTopbarCenter + content.substring(tbEndIndex);
}

// 3. Remove floating quick customizer
const floatingCustomizerMarker = '{/* Floating Quick Customizer for Selected Box';
const printRenderMarker = '{/* 4. FULL PRINT EDITION RENDER';

const fcStartIndex = content.indexOf(floatingCustomizerMarker);
const prEndIndex = content.indexOf(printRenderMarker);

if (fcStartIndex !== -1 && prEndIndex !== -1) {
  content = content.substring(0, fcStartIndex) + content.substring(prEndIndex);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated PageDesignerPage.tsx');
