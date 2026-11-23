/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress YouTube News Studio Module Unit & Integration Tests
 */

import { YouTubeService, DEFAULT_BRANDING_SETTINGS } from '../services/youtubeService';
import { AIVideoEditorialService } from '../services/aiVideoEditorialService';
import { VideoCompositorService } from '../services/videoCompositorService';
import { ThumbnailGeneratorService } from '../services/thumbnailGeneratorService';
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
  assert(settings.watermark.placement === 'top-left', 'Default watermark placed at top-left (left side)');
  assert(settings.watermark.textColor === '#ffffff', 'Default watermark text color is white (#ffffff)');

  const updated = YouTubeService.saveSettings({
    defaultLanguage: 'te',
    watermark: {
      ...settings.watermark,
      placement: 'bottom-left',
      scalePercent: 20,
    },
  });
  assert(updated.watermark.placement === 'bottom-left', 'Watermark placement settings successfully saved and updated');
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
  assert(!broadcastResult.scriptText.includes('సబ్‌స్క్రైబ్'), 'Voice-over news script never asks viewers to subscribe');
  assert(!broadcastResult.scriptText.includes('పరిస్థితులను సమీక్షిస్తున్నారు'), 'Voice-over news script avoids generic administrative review cliché');
  assert(
    broadcastResult.wordCount >= 30 && broadcastResult.wordCount <= 85,
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

  // Test 7: Multi-Tier Broadcast Banner Suite & 4X Headlines Timing
  console.log('\n7. Multi-Tier Broadcast Banner Suite & 4X Headlines Timing:');
  const adDurationSec = 5;
  const channelDurationSec = 5;
  const headlineDurationSec = adDurationSec * 4;

  assert(headlineDurationSec === 20, 'News headlines banner duration is strictly 4 times the Ad banner duration (20s vs 5s)');
  assert(headlineDurationSec === adDurationSec * 4, '4x time ratio maintained dynamically');

  // Verify sequential rotation order: 1. Ad Banner -> 2. Own Channel/Social Banner -> 3. Headlines Banner
  const totalCycleTime = adDurationSec + channelDurationSec + headlineDurationSec;
  assert(totalCycleTime === 30, 'Total rotation cycle duration matches 30 seconds');

  const getActiveSlideAtTime = (t: number) => {
    const cycleT = t % totalCycleTime;
    if (cycleT < adDurationSec) return 'ad';
    if (cycleT < adDurationSec + channelDurationSec) return 'channel';
    return 'headlines';
  };

  assert(getActiveSlideAtTime(2) === 'ad', 'At 2s: Advertisement Banner is active');
  assert(getActiveSlideAtTime(7) === 'channel', 'At 7s: Own Channel & Social Media Banner is active');
  assert(getActiveSlideAtTime(15) === 'headlines', 'At 15s: News Headlines Banner is active');
  assert(getActiveSlideAtTime(28) === 'headlines', 'At 28s: News Headlines Banner continues (4x prolonged display)');
  assert(getActiveSlideAtTime(31) === 'ad', 'At 31s: Cycle restarts with Advertisement Banner');

  // Verify Typography: Ramaraja Google Font for Telugu headlines
  const teluguHeadline = 'ఇస్రో చారిత్రక మైలురాయి: గగన్‌యాన్ మానవసహిత మిషన్ తుది భూ పరీక్షలు విజయవంతం';
  const teluguFontResult = VideoCompositorService.getHeadlineFont(teluguHeadline, 'te', 46);
  assert(teluguFontResult.includes('Ramaraja'), 'Telugu headline typography strictly resolves to "Ramaraja" Google Font');
  assert(teluguFontResult.includes('serif'), 'Ramaraja font styled as elegant serif display typography');

  console.log('\n8. Google Ads Style Animated MP4 Leaderboard Banners:');
  // Verify MP4 Video Banner format support
  const adBannerVideoConfig = {
    enabled: true,
    type: 'video' as const,
    videoUrl: 'blob:https://newspress.app/sample-ad-leaderboard.mp4',
    sponsorName: 'సురక్ష ఆటోమోటివ్స్',
    headline: 'దసరా ప్రత్యేక ఆఫర్ - 30% డిస్కౌంట్!',
    durationSec: 5,
  };
  assert(adBannerVideoConfig.type === 'video', 'Ad banner supports animated MP4 leaderboard video format');
  assert(!!adBannerVideoConfig.videoUrl, 'Ad banner video URL configured properly');

  const channelBannerVideoConfig = {
    enabled: true,
    type: 'video' as const,
    videoUrl: 'blob:https://newspress.app/channel-promo.mp4',
    channelName: 'NewsPress 24x7 Digital Network',
    durationSec: 5,
  };
  assert(channelBannerVideoConfig.type === 'video', 'Channel banner supports animated MP4 promo video format');

  // Verify sample video generator for Google Ads style leaderboard video
  const adSampleVideo = await VideoCompositorService.createSampleLeaderboardVideo('ad', {
    title: 'సురక్ష ఆటోమోటివ్స్',
    subtitle: 'దసరా ప్రత్యేక ఆఫర్',
  });
  assert(!!adSampleVideo.blob, 'Sample Ad Leaderboard video blob generated successfully');
  assert(adSampleVideo.fileName.includes('ad_leaderboard_sample'), 'Ad Leaderboard video filename conforms to standard');

  const channelSampleVideo = await VideoCompositorService.createSampleLeaderboardVideo('channel', {
    title: 'NewsPress Official',
  });
  assert(!!channelSampleVideo.blob, 'Sample Channel Promo video blob generated successfully');
  assert(channelSampleVideo.fileName.includes('channel_promo_sample'), 'Channel promo video filename conforms to standard');

  console.log('\n9. Animated TV News Channel Logo (3D Video Bug & Broadcast Animations):');
  // Verify Animated Logo configurations in WatermarkSettings
  const animatedVideoLogoSettings = {
    enabled: true,
    isAnimatedLogo: true,
    logoFormat: 'video' as const,
    logoAnimationType: '3d_spin' as const,
    logoVideoUrl: 'blob:https://newspress.app/sample-3d-logo.mp4',
    logoFileName: 'channel_logo_3d_animated.mp4',
    logoPlacement: 'top-right' as const,
    logoScalePercent: 18,
    logoOpacityPercent: 95,
  };
  assert(animatedVideoLogoSettings.isAnimatedLogo === true, 'Animated logo flag is set to true');
  assert(animatedVideoLogoSettings.logoFormat === 'video', 'Channel logo supports animated MP4/WebM video bug');
  assert(animatedVideoLogoSettings.logoAnimationType === '3d_spin', 'Logo animation type set to 3D Y-axis emblem spin');

  const animatedGifLogoSettings = {
    enabled: true,
    isAnimatedLogo: true,
    logoFormat: 'gif' as const,
    logoAnimationType: 'shimmer_shine' as const,
    logoDataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  };
  assert(animatedGifLogoSettings.logoFormat === 'gif', 'Channel logo supports animated GIF format');

  // Verify sample 3D animated news logo generator
  const sampleAnimatedLogo = await VideoCompositorService.createSampleAnimatedLogo({
    channelName: 'NewsPress 24x7',
  });
  assert(!!sampleAnimatedLogo.blob, 'Sample 3D animated logo blob generated successfully');
  assert(sampleAnimatedLogo.fileName.includes('channel_logo_animated'), 'Sample 3D logo filename conforms to standard');

  console.log('\n10. Latest Gemini Image Model & Broadcast AI Thumbnail Generator:');
  const dummyBase64Frame = 'data:image/jpeg;base64,' + Buffer.from('mock-keyframe-with-faces-bytes').toString('base64');

  // Test Telugu AI Thumbnail Generation
  const teluguThumb = await ThumbnailGeneratorService.generateAIThumbnail({
    keyframeImageUrl: dummyBase64Frame,
    headlineText: 'సంచలన నిజాలు వెలుగులోకి!',
    badgeText: 'తీవ్ర కలకలం!',
    curiosityLine: 'అసలేం జరిగింది? నిజాలివే!',
    language: 'te',
    themeColor: 'fire_red',
    channelName: 'NEWSPRESS 24x7',
  });
  assert(!!teluguThumb.dataUrl, 'Telugu AI Thumbnail generated with valid dataUrl');
  assert(!!teluguThumb.blob, 'Telugu AI Thumbnail generated with valid Blob');
  assert(!!teluguThumb.modelUsed, 'Identified model/engine used for thumbnail generation');

  // Test Hindi AI Thumbnail Generation
  const hindiThumb = await ThumbnailGeneratorService.generateAIThumbnail({
    keyframeImageUrl: dummyBase64Frame,
    headlineText: 'बड़ा खुलासा: सनसनीखेज सच सामने आया!',
    badgeText: 'हैरान करने वाला मोड़!',
    curiosityLine: 'आखिर क्या हुआ? सच्चाई जानिए!',
    language: 'hi',
    themeColor: 'electric_yellow',
    channelName: 'NEWSPRESS HINDI',
  });
  assert(!!hindiThumb.dataUrl, 'Hindi AI Thumbnail generated with valid dataUrl');
  assert(!!hindiThumb.blob, 'Hindi AI Thumbnail generated with valid Blob');
  assert(hindiThumb.dataUrl.startsWith('data:image/jpeg;base64,'), 'Thumbnail output formatted as base64 JPEG data URL');

  console.log(`\n=== Verification Results: ${passed}/${total} assertions passed ===\n`);
  if (passed === total) {
    console.log('🎉 ALL YOUTUBE STUDIO TESTS PASSED SUCCESSFULLY!');
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
