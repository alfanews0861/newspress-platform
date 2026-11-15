/**
 * Verification test for dynamic advertisement sizing and page canvas adaptation
 * across different user Paper Settings (Broadsheet, Tabloid, Berliner, A4).
 */

import { GridCalculationService } from '../services/gridCalculationService';
import { AdvertisementLayoutAdapter, getDynamicAdSizeOptions } from '../services/advertisementLayoutAdapter';
import { NewspaperBrand } from '../types/edition';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

console.log('====================================================');
console.log('TESTING DYNAMIC AD SIZES & PAPER SETTINGS ADAPTATION');
console.log('====================================================');

// 1. Broadsheet Brand (8 Columns, 350x540mm)
const broadsheetBrand: Partial<NewspaperBrand> = {
  name: 'ఆంధ్ర ప్రభ దినపత్రిక',
  paperSize: 'broadsheet',
  defaultColumnCount: 8,
  pageCount: 8,
};
const broadsheetTemplate = GridCalculationService.getTemplateForBrand(broadsheetBrand);
const broadsheetGrid = GridCalculationService.calculatePageGrid(broadsheetTemplate);

assert(broadsheetGrid.columnCount === 8, `Broadsheet must have 8 columns, got ${broadsheetGrid.columnCount}`);
assert(broadsheetGrid.pageWidth === 1323, `Broadsheet width should be 1323px, got ${broadsheetGrid.pageWidth}`);

const broadsheetAdOptions = getDynamicAdSizeOptions(broadsheetGrid, 'broadsheet');
const broadsheetHalfH = broadsheetAdOptions.find((o) => o.id === 'half_page_horizontal')!;
assert(broadsheetHalfH.cols.includes('8 Columns'), `Broadsheet half page must span 8 columns, got ${broadsheetHalfH.cols}`);

const broadsheetPlacement = AdvertisementLayoutAdapter.calculateAdPlacement(
  broadsheetGrid,
  {
    advertisementId: 'ad-test-bs',
    sponsorName: 'Broadsheet Sponsor',
    targetPage: 'front_page',
    sizePreset: 'half_page_vertical',
  },
  8
);
assert(broadsheetPlacement.placement.columnSpan === 4, `Broadsheet vertical half page must span 4 columns, got ${broadsheetPlacement.placement.columnSpan}`);
assert(broadsheetPlacement.placement.columnStart === 5, `Broadsheet vertical half page must start at col 5, got ${broadsheetPlacement.placement.columnStart}`);
console.log('✓ Broadsheet 8-column ad geometry verified');

// 2. Tabloid Brand (5 Columns, 280x380mm)
const tabloidBrand: Partial<NewspaperBrand> = {
  name: 'Hyderabad Metro Tabloid',
  paperSize: 'tabloid',
  defaultColumnCount: 5,
  pageCount: 4,
};
const tabloidTemplate = GridCalculationService.getTemplateForBrand(tabloidBrand);
const tabloidGrid = GridCalculationService.calculatePageGrid(tabloidTemplate);

assert(tabloidGrid.columnCount === 5, `Tabloid must have 5 columns, got ${tabloidGrid.columnCount}`);
assert(tabloidGrid.pageWidth === 896, `Tabloid width should be 896px (280mm * 3.2), got ${tabloidGrid.pageWidth}`);

const tabloidAdOptions = getDynamicAdSizeOptions(tabloidGrid, 'tabloid');
const tabloidHalfH = tabloidAdOptions.find((o) => o.id === 'half_page_horizontal')!;
assert(tabloidHalfH.cols.includes('5 Columns'), `Tabloid half page must span 5 columns, got ${tabloidHalfH.cols}`);

const tabloidPlacement = AdvertisementLayoutAdapter.calculateAdPlacement(
  tabloidGrid,
  {
    advertisementId: 'ad-test-tabloid',
    sponsorName: 'Tabloid Sponsor',
    targetPage: 'front_page',
    sizePreset: 'half_page_vertical',
  },
  4
);
assert(tabloidPlacement.placement.columnSpan === 3, `Tabloid vertical half page must span 3 columns, got ${tabloidPlacement.placement.columnSpan}`);
assert(tabloidPlacement.placement.columnStart === 3, `Tabloid vertical half page must start at col 3 (cols 3, 4, 5), got ${tabloidPlacement.placement.columnStart}`);
assert(tabloidPlacement.placement.columnStart + tabloidPlacement.placement.columnSpan - 1 <= 5, 'Must not overflow 5 columns');
console.log('✓ Tabloid 5-column ad geometry verified');

// 3. A4 Brand (4 Columns, 210x297mm)
const a4Brand: Partial<NewspaperBrand> = {
  name: 'Community Weekly Bulletin',
  paperSize: 'a4',
  defaultColumnCount: 4,
  pageCount: 4,
};
const a4Template = GridCalculationService.getTemplateForBrand(a4Brand);
const a4Grid = GridCalculationService.calculatePageGrid(a4Template);

assert(a4Grid.columnCount === 4, `A4 must have 4 columns, got ${a4Grid.columnCount}`);
assert(a4Grid.pageWidth === 735, `A4 width should be 735px (210mm * 3.5), got ${a4Grid.pageWidth}`);

const a4Placement = AdvertisementLayoutAdapter.calculateAdPlacement(
  a4Grid,
  {
    advertisementId: 'ad-test-a4',
    sponsorName: 'A4 Sponsor',
    targetPage: 2,
    sizePreset: 'quarter_page',
  },
  4
);
assert(a4Placement.placement.columnSpan === 2, `A4 quarter page must span 2 columns, got ${a4Placement.placement.columnSpan}`);
assert(a4Placement.placement.columnStart === 3, `A4 quarter page must start at col 3 (cols 3, 4), got ${a4Placement.placement.columnStart}`);
console.log('✓ A4 4-column ad geometry verified');

// 4. Berliner Brand (6 Columns, 315x470mm)
const berlinerBrand: Partial<NewspaperBrand> = {
  name: 'The Berliner Standard',
  paperSize: 'berliner',
  defaultColumnCount: 6,
  pageCount: 8,
};
const berlinerTemplate = GridCalculationService.getTemplateForBrand(berlinerBrand);
const berlinerGrid = GridCalculationService.calculatePageGrid(berlinerTemplate);

assert(berlinerGrid.columnCount === 6, `Berliner must have 6 columns, got ${berlinerGrid.columnCount}`);
assert(berlinerGrid.pageWidth === 1071, `Berliner width should be 1071px (315mm * 3.4), got ${berlinerGrid.pageWidth}`);

const berlinerPlacement = AdvertisementLayoutAdapter.calculateAdPlacement(
  berlinerGrid,
  {
    advertisementId: 'ad-test-berliner',
    sponsorName: 'Berliner Sponsor',
    targetPage: 'back_page',
    sizePreset: 'half_page_horizontal',
  },
  8
);
assert(berlinerPlacement.pageNumber === 8, 'Target back_page should resolve to page 8');
assert(berlinerPlacement.placement.columnSpan === 6, 'Horizontal half page on Berliner must span all 6 columns');
console.log('✓ Berliner 6-column ad geometry verified');

// 5. Test RNI Government of India frequency-based auto-fill in brandManagementService
import { brandManagementService } from '../services/brandManagementService';

const weeklyBrand = brandManagementService.createBrand({
  name: 'ఆంధ్ర సచిత్ర వారపత్రిక',
  frequency: 'weekly',
  language: 'te',
});
assert(weeklyBrand.paperSize === 'tabloid', `Weekly magazine must auto-fill to tabloid, got ${weeklyBrand.paperSize}`);
assert(weeklyBrand.defaultColumnCount === 5, `Weekly magazine must auto-fill to 5 columns, got ${weeklyBrand.defaultColumnCount}`);
assert(weeklyBrand.pageCount === 12, `Weekly magazine must auto-fill to 12 pages, got ${weeklyBrand.pageCount}`);

const monthlyBrand = brandManagementService.createBrand({
  name: 'తెలుగు సాహిత్య మాసపత్రిక',
  frequency: 'monthly',
  language: 'te',
});
assert(monthlyBrand.paperSize === 'a4', `Monthly journal must auto-fill to A4, got ${monthlyBrand.paperSize}`);
assert(monthlyBrand.defaultColumnCount === 4, `Monthly journal must auto-fill to 4 columns, got ${monthlyBrand.defaultColumnCount}`);
assert(monthlyBrand.pageCount === 24, `Monthly journal must auto-fill to 24 pages, got ${monthlyBrand.pageCount}`);

const dailyBrand = brandManagementService.createBrand({
  name: 'ప్రజా నేత్రం దినపత్రిక',
  frequency: 'daily',
  language: 'te',
});
assert(dailyBrand.paperSize === 'broadsheet', `Daily newspaper must auto-fill to broadsheet, got ${dailyBrand.paperSize}`);
assert(dailyBrand.defaultColumnCount === 8, `Daily newspaper must auto-fill to 8 columns, got ${dailyBrand.defaultColumnCount}`);
assert(dailyBrand.pageCount === 8, `Daily newspaper must auto-fill to 8 pages, got ${dailyBrand.pageCount}`);
console.log('✓ RNI Government of India frequency-based auto-fill verified (Daily, Weekly, Monthly)');

console.log('====================================================');
console.log('ALL DYNAMIC PAPER SIZE & RNI FREQUENCY TESTS PASSED (5/5)!');
console.log('====================================================');
