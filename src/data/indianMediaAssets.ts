/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentic Indian Newsroom, Field Reporters & Citizens Photography Registry
 * Served from public/assets/images/ as static URL strings so server-side config
 * and browser bundles both load cleanly without binary ES imports.
 */

export const INDIAN_MEDIA = {
  heroNewsroom: '/assets/images/hero_indian_newsroom_1795431273799.jpg',
  femaleFieldReporter: '/assets/images/indian_field_reporter_1795431149293.jpg',
  maleFieldReporter: '/assets/images/indian_male_reporter_1795431150380.jpg',
  peopleReadingPaper: '/assets/images/indian_people_reading_1795431149330.jpg',
  broadcastStudio: '/assets/images/indian_broadcast_studio_1795431149808.jpg',
  seniorEditorPortrait: '/assets/images/indian_senior_editor_1795431167877.jpg',
} as const;

export const REPORTER_PORTRAIT_LIST = [
  INDIAN_MEDIA.femaleFieldReporter,
  INDIAN_MEDIA.maleFieldReporter,
  INDIAN_MEDIA.seniorEditorPortrait,
  INDIAN_MEDIA.broadcastStudio,
  INDIAN_MEDIA.peopleReadingPaper,
  INDIAN_MEDIA.heroNewsroom,
] as const;
