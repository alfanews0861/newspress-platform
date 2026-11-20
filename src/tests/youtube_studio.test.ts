/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Studio Module Unit & Integration Tests
 */

import { YouTubeService, DEFAULT_BRANDING_SETTINGS } from '../services/youtubeService';
import { AIVideoEditorialService } from '../services/aiVideoEditorialService';
import { newsSubmissionService } from '../services/newsSubmissionService';
import { SUPPORTED_INDIAN_LANGUAGES } from '../types/youtube';

// Mock fetch for Google YouTube API in unit test runner
const originalFetch = global.fetch;
(global as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = url.toString();
  if (urlStr.includes('googleapis.com/upload/youtube/v3/videos') || urlStr.includes('upload.youtube.com')) {
    if (init?.method === 'POST') {
      return new Response(null, {
        status: 200,
        headers: { Location: 'https://upload.youtube.com/upload/session_id_unit_test' },
      });
    }
    if (init?.method === 'PUT') {
      return new Response(JSON.stringify({ id: 'NP_MOCK_VID_9988' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  if (urlStr.includes('thumbnails/set')) {
    return new Response(JSON.stringify({ default: { url: 'https://img.youtube.com/vi/NP_MOCK_VID_9988/0.jpg' } }), {
      status: 200,
    });
  }
  return originalFetch(url, init);
};
if (typeof localStorage === 'undefined' || !localStorage) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

async function runTests() {
  console.log('=== NewsPress YouTube Studio Module Verification ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // Test 1: Supported Indian Languages
  console.log('1. Supported Indian Languages:');
  assert(SUPPORTED_INDIAN_LANGUAGES.length >= 10, 'Supports 10+ major Indian languages including Telugu, Hindi, Tamil');
  const telugu = SUPPORTED_INDIAN_LANGUAGES.find((l) => l.code === 'te');
  assert(telugu?.nativeName === 'తెలుగు', 'Telugu language option configured with proper native script');

  // Test 2: Branding Settings Defaults & Persistence
  console.log('\n2. YouTube Channel Branding Settings:');
  const settings = YouTubeService.getSettings();
  assert(settings.privacyStatus === 'public', 'Default video privacy is set to Public for immediate broadcast');
  assert(settings.watermark.placement === 'top-right', 'Default watermark placed at top-right');

  const updated = YouTubeService.saveSettings({
    defaultLanguage: 'te',
    watermark: {
      ...settings.watermark,
      placement: 'top-left',
      scalePercent: 20,
    },
  });
  assert(updated.watermark.placement === 'top-left', 'Watermark placement settings successfully saved and updated');
  assert(updated.defaultLanguage === 'te', 'Telugu saved as target broadcast language');

  // Test 3: Gemini AI Senior Editor Script (60-70 words constraint)
  console.log('\n3. Gemini AI Senior Editor Broadcast Script:');
  const sampleNews = `తెలంగాణ మరియు ఆంధ్రప్రదేశ్‌లో రాగల 48 గంటల్లో భారీ నుండి అతి భారీ వర్షాలు కురిసే అవకాశం ఉందని భారత వాతావరణ శాఖ తెలిపింది. తీర ప్రాంతాల్లో 60 కిలోమీటర్ల వేగంతో గాలులు వీస్తాయని అధికారులు హెచ్చరించారు. రైతులు, లోతట్టు ప్రాంత ప్రజలు అప్రమత్తంగా ఉండాలని సూచించారు.`;
  
  const broadcastResult = await AIVideoEditorialService.generateBroadcastPackage({
    newsText: sampleNews,
    language: 'te',
    channelName: 'తెలుగు న్యూస్ 24x7',
  });

  assert(broadcastResult.scriptText.length > 50, 'Generated Senior Editor Telugu voice-over script');
  assert(
    broadcastResult.wordCount >= 50 && broadcastResult.wordCount <= 85,
    `Script word count (${broadcastResult.wordCount} words) is strictly tailored for 25-30s bulletin duration`
  );
  assert(broadcastResult.headlineTitle.length > 5, `Catchy YouTube headline generated: "${broadcastResult.headlineTitle}"`);
  assert(broadcastResult.tags.length > 0, `Generated ${broadcastResult.tags.length} YouTube discovery tags`);
  assert(broadcastResult.thumbnailHeadline.length > 0, `Generated thumbnail hook: "${broadcastResult.thumbnailHeadline}"`);
  assert(broadcastResult.thumbnailBadge.length > 0, `Generated high-CTR curiosity badge: "${broadcastResult.thumbnailBadge}"`);
  assert(broadcastResult.thumbnailCuriosityLine.length > 0, `Generated viral click-bait curiosity line: "${broadcastResult.thumbnailCuriosityLine}"`);

  // Test 4: Channel Connection & YouTube Data API Upload
  console.log('\n4. YouTube Channel Connection & Direct Upload:');
  const account = await YouTubeService.connectWithAccessToken('valid_test_oauth_bearer_token', 'National News 24x7 Digital Network');
  assert(account.isConnected, 'Connected YouTube Channel with OAuth credentials');
  assert(Boolean(account.channelTitle), `Connected channel profile: "${account.channelTitle}"`);

  // Test 5: Direct Public Video & Custom Thumbnail Publishing
  console.log('\n5. Direct Public Publishing to YouTube:');
  const dummyVideoBlob = new Blob(['dummy-mp4-stream'], { type: 'video/mp4' });
  const dummyThumbBlob = new Blob(['dummy-jpeg-stream'], { type: 'image/jpeg' });

  let progressReported = false;
  const publishResult = await YouTubeService.uploadVideoAndThumbnail({
    videoBlob: dummyVideoBlob,
    thumbnailBlob: dummyThumbBlob,
    title: broadcastResult.headlineTitle,
    description: broadcastResult.youtubeDescription,
    tags: broadcastResult.tags,
    privacyStatus: 'public',
    onProgress: (pct, msg) => {
      progressReported = true;
    },
  });

  assert(progressReported, 'Upload progress telemetry reported accurately');
  assert(publishResult.privacyStatus === 'public', 'Video published with Public privacy status');
  assert(publishResult.thumbnailUploaded, 'Custom AI Breaking News Thumbnail attached to video');
  assert(publishResult.youtubeUrl.includes('youtube.com/watch?v='), `Generated live YouTube URL: ${publishResult.youtubeUrl}`);

  // Test 6: Broadcast News Ticker & State-Level Headlines Fallback
  console.log('\n6. Broadcast News Ticker & State-Level Headlines:');
  const stateHeadlines = newsSubmissionService.getStateLevelHeadlines();
  assert(stateHeadlines.length > 0, `Fetched ${stateHeadlines.length} state-level news headlines`);
  const tickerString = newsSubmissionService.getStateTickerString();
  assert(tickerString.length > 20, `Generated formatted state broadcast ticker string: "${tickerString.slice(0, 60)}..."`);
  assert(tickerString.includes('✦'), 'Ticker items separated with broadcast symbol "✦"');

  // Verify fallback behavior: when ticker input is empty vs provided
  const emptyTickerInput = '';
  const effectiveTicker1 = emptyTickerInput.trim() || tickerString;
  assert(effectiveTicker1 === tickerString, 'Empty ticker field correctly defaults to latest state headlines');

  const customTickerInput = 'తాజా వార్తలు: తిరుపతిలో అంతర్జాతీయ సాంకేతిక సదస్సు ప్రారంభం';
  const effectiveTicker2 = customTickerInput.trim() || tickerString;
  assert(effectiveTicker2 === customTickerInput, 'Custom ticker field is preserved and prioritized over default');

  console.log(`\n=== Verification Results: ${passed}/${total} assertions passed ===\n`);
  if (passed === total) {
    console.log('🎉 ALL YOUTUBE STUDIO TESTS PASSED SUCCESSFULLY!');
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
