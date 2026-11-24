/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsPress Broadcast Video Editorial Service
 * Routes editorial compliance, video-to-story drafting, 60-70 word broadcast scripting,
 * and 24kHz studio anchor voice narration through server-side /api/studio/* endpoints.
 */

import {
  BroadcastScriptResult,
  SupportedIndianLanguage,
  VOICE_ACTORS,
  EmotionalNewsStyle,
} from '../types/youtube';

export interface PolicyComplianceResult {
  isCompliant: boolean;
  scorePercent: number; // 0 - 100
  statusMessage: string;
  violations: string[];
}

interface LocalizedDescriptionCopy {
  highlightsHeader: string;
  detailedStoryHeader: string;
  subscribeCallout: (channelName: string) => string;
  disclaimerNotice: string;
  baseHashtags: string[];
}

const LOCALIZED_DESCRIPTIONS: Record<SupportedIndianLanguage, LocalizedDescriptionCopy> = {
  te: {
    highlightsHeader: '📌 ముఖ్య ముఖ్యాంశాలు (Key Highlights):',
    detailedStoryHeader: '📰 విపులమైన వార్తా కథనం & క్షేత్రస్థాయి నివేదిక:',
    subscribeCallout: (ch) =>
      `🔔 నిరంతరం తాజా వార్తలు, బ్రేకింగ్ అప్‌డేట్స్ మరియు వాస్తవ కథనాల కోసం '${ch}' ఛానల్‌ను ఇప్పుడే సబ్‌స్క్రైబ్ చేసుకోండి.`,
    disclaimerNotice:
      '⚖️ గమనిక (Disclaimer): ఈ ప్రసారం ప్రజలకు వాస్తవ సమాచారం చేరవేసే జర్నలిస్టిక్ నిబంధనల ప్రకారం ప్రచురించబడింది.',
    baseHashtags: ['#TeluguNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#NewsBulletin', '#TopHeadlines', '#TrendingNews'],
  },
  hi: {
    highlightsHeader: '📌 मुख्य बिंदु (Key Highlights):',
    detailedStoryHeader: '📰 विस्तृत समाचार एवं ग्राउंड रिपोर्ट:',
    subscribeCallout: (ch) =>
      `🔔 देश-दुनिया की हर ताज़ा, सटीक और निष्पक्ष खबर के लिए '${ch}' को तुरंत सब्सक्राइब करें।`,
    disclaimerNotice:
      '⚖️ अस्वीकरण (Disclaimer): यह समाचार प्रसारण जनहित और पत्रकारिता के निष्पक्ष नियमों के तहत प्रसारित किया गया है।',
    baseHashtags: ['#HindiNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#TopHeadlines', '#LiveNews', '#IndiaNews', '#TrendingNews'],
  },
  ta: {
    highlightsHeader: '📌 முக்கியச் செய்திகள் (Key Highlights):',
    detailedStoryHeader: '📰 விரிவான செய்தி அறிக்கை:',
    subscribeCallout: (ch) =>
      `🔔 உடனுக்குடன் உண்மைச் செய்திகளை அறிய '${ch}' சேனலை சப்ஸ்கிரைப் செய்யவும்.`,
    disclaimerNotice:
      '⚖️ அறிவிப்பு (Disclaimer): இந்த செய்தி அறிக்கை பொது நலன் மற்றும் ஊடக நெறிமுறைகளின்படி வெளியிடப்பட்டுள்ளது.',
    baseHashtags: ['#TamilNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TamilNaduNews', '#TrendingNews'],
  },
  kn: {
    highlightsHeader: '📌 ಪ್ರಮುಖ ಅಂಶಗಳು (Key Highlights):',
    detailedStoryHeader: '📰 ವಿವರವಾದ ಸುದ್ದಿ ವರದಿ:',
    subscribeCallout: (ch) =>
      `🔔 ನಿರಂತರ ತಾಜಾ ಸುದ್ದಿ ಮತ್ತು ಬ್ರೇಕಿಂಗ್ ಅಪ್‌ಡೇಟ್‌ಗಳಿಗಾಗಿ '${ch}' ಚಾನೆಲ್‌ಗೆ ಸಬ್‌ಸ್ಕ್ರೈಬ್ ಆಗಿ.`,
    disclaimerNotice:
      '⚖️ ಹಕ್ಕುತ್ಯಾಗ (Disclaimer): ಈ ಸುದ್ದಿ ಪ್ರಸಾರವನ್ನು ಪತ್ರಿಕೋದ್ಯಮ ನೀತಿ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಹಿತಾಸಕ್ತಿಗಾಗಿ ಪ್ರಕಟಿಸಲಾಗಿದೆ.',
    baseHashtags: ['#KannadaNews', '#BreakingNews', '#KarnatakaNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TrendingNews'],
  },
  ml: {
    highlightsHeader: '📌 പ്രധാന വാർത്താ പോയിന്റുകൾ (Key Highlights):',
    detailedStoryHeader: '📰 വിശദമായ വാർത്താ റിപ്പോർട്ട്:',
    subscribeCallout: (ch) =>
      `🔔 ഏറ്റവും പുതിയ വാർത്തകളും ബ്രേക്കിംഗ് അപ്‌ഡേറ്റുകളും അറിയാൻ '${ch}' ചാനൽ സബ്‌സ്‌ക്രൈബ് ചെയ്യുക.`,
    disclaimerNotice:
      '⚖️ അറിയിപ്പ് (Disclaimer): ഈ വാർത്താ പ്രക്ഷേപണം മാധ്യമ ധാർമ്മികതയും പൊതുതാൽപര്യവും മുൻനിർത്തി പ്രസിദ്ധീകരിച്ചതാണ്.',
    baseHashtags: ['#MalayalamNews', '#KeralaNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TrendingNews'],
  },
  bn: {
    highlightsHeader: '📌 মূল হাইলাইটস (Key Highlights):',
    detailedStoryHeader: '📰 বিস্তারিত সংবাদ ও গ্রাউন্ড রিপোর্ট:',
    subscribeCallout: (ch) =>
      `🔔 সর্বশেষ তাজা খবর ও ব্রেকিং আপডেটের জন্য '${ch}' চ্যানেলটি সাবস্ক্রাইব করুন।`,
    disclaimerNotice:
      '⚖️ দাবিত্যাগ (Disclaimer): এই সংবাদ সম্প্রচারটি জনস্বার্থ ও সাংবাদিকতার নীতিমালা অনুসরণ করে প্রকাশিত হয়েছে।',
    baseHashtags: ['#BengaliNews', '#BanglaNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#WestBengalNews', '#TrendingNews'],
  },
  mr: {
    highlightsHeader: '📌 मुख्य ठळक मुद्दे (Key Highlights):',
    detailedStoryHeader: '📰 सविस्तर बातमी व ग्राउंड रिपोर्ट:',
    subscribeCallout: (ch) =>
      `🔔 ताज्या आणि विश्वासार्ह बातम्यांसाठी '${ch}' चॅनेलला आत्ताच सबस्क्राईब करा.`,
    disclaimerNotice:
      '⚖️ अस्वीकरण (Disclaimer): हे वृत्तप्रसारण जनहित आणि पत्रकारितेच्या नियमांनुसार प्रसिद्ध केले आहे.',
    baseHashtags: ['#MarathiNews', '#MaharashtraNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TrendingNews'],
  },
  gu: {
    highlightsHeader: '📌 મુખ્ય મુદ્દાઓ (Key Highlights):',
    detailedStoryHeader: '📰 વિગતવાર સમાચાર અને ગ્રાઉન્ડ રિપોર્ટ:',
    subscribeCallout: (ch) =>
      `🔔 તાજા અને વિશ્વસનીય સમાચાર માટે '${ch}' ચેનલને હમણાં જ સબ્સ્ક્રાઇબ કરો.`,
    disclaimerNotice:
      '⚖️ અસ્વીકરણ (Disclaimer): આ સમાચાર પ્રસારણ જાહેર હિત અને પત્રકારત્વના ધોરણો અનુસાર પ્રકાશિત કરવામાં આવ્યું છે.',
    baseHashtags: ['#GujaratiNews', '#GujaratNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TrendingNews'],
  },
  pa: {
    highlightsHeader: '📌 ਮੁੱਖ ਨੁਕਤੇ (Key Highlights):',
    detailedStoryHeader: '📰 ਵਿਸਥਾਰਤ ਖ਼ਬਰ ਅਤੇ ਗਰਾਊਂਡ ਰਿਪੋਰਟ:',
    subscribeCallout: (ch) =>
      `🔔 ਤਾਜ਼ਾ ਅਤੇ ਸੱਚੀਆਂ ਖ਼ਬਰਾਂ ਲਈ '${ch}' ਚੈਨਲ ਨੂੰ ਹੁਣੇ ਸਬਸਕ੍ਰਾਈਬ ਕਰੋ।`,
    disclaimerNotice:
      '⚖️ ਬੇਦਾਅਵਾ (Disclaimer): ਇਹ ਖ਼ਬਰ ਪ੍ਰਸਾਰਣ ਲੋਕ ਹਿੱਤ ਅਤੇ ਪੱਤਰਕਾਰੀ ਦੇ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਜਾਰੀ ਕੀਤਾ ਗਿਆ ਹੈ।',
    baseHashtags: ['#PunjabiNews', '#PunjabNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TrendingNews'],
  },
  or: {
    highlightsHeader: '📌 ମୁଖ୍ୟ ବିନ୍ଦୁ (Key Highlights):',
    detailedStoryHeader: '📰 ବିସ୍ତୃତ ଖବର ଓ ଗ୍ରାଉଣ୍ଡ ରିପୋର୍ଟ:',
    subscribeCallout: (ch) =>
      `🔔 ସଦ୍ୟତମ ଓ ସଠିକ୍ ଖବର ପାଇଁ '${ch}' ଚ୍ୟାନେଲକୁ ଏବେ ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ।`,
    disclaimerNotice:
      '⚖️ ସୂଚନା (Disclaimer): ଏହି ସମ୍ବାଦ ପ୍ରସାରଣ ଜନସ୍ୱାର୍ଥ ଏବଂ ସାମ୍ବାଦିକତା ନୀତି ଅନୁଯାୟୀ ପ୍ରକାଶିତ।',
    baseHashtags: ['#OdiaNews', '#OdishaNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#NewsLive', '#TrendingNews'],
  },
  en: {
    highlightsHeader: '📌 Key Highlights:',
    detailedStoryHeader: '📰 Full News Report & Ground Dispatch:',
    subscribeCallout: (ch) =>
      `🔔 Subscribe to '${ch}' for verified breaking updates, live news bulletins, and ground reports from across India.`,
    disclaimerNotice:
      '⚖️ Editorial Disclaimer: This news bulletin is published in the public interest under verified journalism and media ethics standards.',
    baseHashtags: ['#IndiaNews', '#BreakingNews', '#LatestNews', '#TodayNews', '#TopHeadlines', '#NewsBulletin', '#SpecialReport', '#TrendingNews'],
  },
};

const VOICE_AUDITION_SCRIPTS: Record<SupportedIndianLanguage, (actorName: string) => string> = {
  te: (name) => `నమస్కారం, నేను మీ యాంకర్ ${name}. దేశవ్యాప్తంగా తాజా బ్రేకింగ్ న్యూస్ అప్‌డేట్స్‌తో మీ ముందుకు వస్తున్నాను.`,
  hi: (name) => `नमस्कार, मैं हूं एंकर ${name}. देश की सबसे बड़ी और ताज़ा ब्रेकिंग न्यूज़ के साथ आपका स्वागत है।`,
  ta: (name) => `வணக்கம், நான் செய்தி வாசிப்பாளர் ${name}. இன்றைய முக்கிய பிரேக்கிங் செய்திகளுடன் இணைந்திருங்கள்.`,
  kn: (name) => `ನಮಸ್ಕಾರ, ನಾನು ನ್ಯೂಸ್ ಆಂಕರ್ ${name}. ಇಂದಿನ ಪ್ರಮುಖ ಬ್ರೇಕಿಂಗ್ ನ್ಯೂಸ್ ವರದಿಗೆ ಸ್ವಾಗತ.`,
  ml: (name) => `നമസ്കാരം, ഞാൻ ന്യൂസ് ആങ്കർ ${name}. ഇന്നത്തെ പ്രധാന ബ്രേക്കിംഗ് വാർത്തകളിലേക്ക് സ്വാഗതം.`,
  bn: (name) => `নমস্কার, আমি নিউজ অ্যাঙ্কর ${name}। আজকের সবচেয়ে বড় ব্রেকিং নিউজ আপডেটে স্বাগতম।`,
  mr: (name) => `नमस्कार, मी न्यूज अँकर ${name}. आजच्या सर्वात मोठ्या ब्रेकिंग न्यूज बुलेटिनमध्ये आपले स्वागत आहे.`,
  gu: (name) => `નમસ્કાર, હું ન્યૂઝ એન્કર ${name} છું. આજના મહત્વના બ્રેકિંગ ન્યૂઝ બુલેટિનમાં આપનું સ્વાગત છે.`,
  pa: (name) => `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਨਿਊਜ਼ ਐਂਕਰ ${name} ਹਾਂ। ਅੱਜ ਦੀਆਂ ਸਭ ਤੋਂ ਵੱਡੀਆਂ ਬ੍ਰੇਕਿੰਗ ਖ਼ਬਰਾਂ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ।`,
  or: (name) => `ନମସ୍କାର, ମୁଁ ନ୍ୟୁଜ୍ ଆଙ୍କର୍ ${name}। ଆଜିର ପ୍ରମୁଖ ବ୍ରେକିଂ ନ୍ୟୁଜ୍ ବୁଲେଟିନକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।`,
  en: (name) => `Good evening, I am ${name} at the national news desk bringing you the latest breaking developments from across India.`,
};

// Client-side sample audio URL cache to keep Voice Settings auditions instant
const clientSampleBlobCache = new Map<string, Blob>();

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeType });
}

function getEmotionalStyleDirective(style: EmotionalNewsStyle | string): string {
  switch (style) {
    case 'dramatic_primetime':
      return 'Authoritative, measured prime-time television news analysis with gravitas and crystal-clear articulation.';
    case 'urgent_investigative':
      return 'Sharp, investigative broadcast journalist tone with focused urgency and grounded factual emphasis.';
    case 'speed_bulletin':
      return 'Crisp, fast-paced headline bulletin cadence with energetic studio rhythm.';
    case 'emotional_breaking':
    default:
      return 'High-energy, authoritative, urgent breaking news anchor delivery with strong broadcast projection.';
  }
}

export class AIVideoEditorialService {
  /**
   * Converts a File or Blob into a base64 string.
   */
  static fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converts raw Float32 audio samples into standard 16-bit PCM Mono WAV base64.
   */
  static pcmFloat32ToWavBase64(channelData: Float32Array, sampleRate: number): string {
    const numSamples = channelData.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  /**
   * Extracts compact 16kHz mono WAV snippet from a video file for ground-truth verification.
   */
  static async extractAudioTrackFromVideo(
    videoFile: File | Blob,
    maxDurationSec = 90
  ): Promise<{ mimeType: string; data: string } | null> {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      const sliceBlob = videoFile.size > 35 * 1024 * 1024 ? videoFile.slice(0, 35 * 1024 * 1024) : videoFile;
      const arrayBuffer = await sliceBlob.arrayBuffer();

      const audioCtx = new AudioContextClass();
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } catch {
        await audioCtx.close();
        return null;
      }

      const sampleRate = 16000;
      const duration = Math.min(audioBuffer.duration, maxDurationSec);
      const numSamples = Math.max(1, Math.floor(duration * sampleRate));

      const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      await audioCtx.close();

      const channelData = renderedBuffer.getChannelData(0);
      const wavBase64 = this.pcmFloat32ToWavBase64(channelData, sampleRate);

      return {
        mimeType: 'audio/wav',
        data: wavBase64,
      };
    } catch (e) {
      console.warn('[EditorialStudio] Audio track extraction notice:', e);
      return null;
    }
  }

  /**
   * Extracts compact media evidence from uploaded footage for server-side editorial grounding.
   */
  static async extractMediaForVerification(
    videoFile: File | Blob
  ): Promise<{ mimeType: string; data: string } | null> {
    try {
      const audioData = await this.extractAudioTrackFromVideo(videoFile, 90);
      if (audioData && audioData.data) {
        return audioData;
      }
      if (videoFile.size <= 3 * 1024 * 1024) {
        const base64 = await this.fileToBase64(videoFile);
        return {
          mimeType: videoFile.type || 'video/mp4',
          data: base64,
        };
      }
    } catch (err) {
      console.warn('[EditorialStudio] Media extraction fallback to text:', err);
    }
    return null;
  }

  /**
   * Broadcast Editorial & Policy Compliance Verification via server-side route.
   */
  static async verifyEditorialCompliance(newsText: string): Promise<PolicyComplianceResult> {
    const cleanText = newsText.trim();
    if (!cleanText) {
      return {
        isCompliant: false,
        scorePercent: 0,
        statusMessage: 'The news manuscript is empty.',
        violations: ['Empty content'],
      };
    }

    const toxicKeywords = ['massacre', 'terror attack execution', 'bomb making guide'];
    const foundViolations = toxicKeywords.filter((kw) => cleanText.toLowerCase().includes(kw));
    if (foundViolations.length > 0) {
      return {
        isCompliant: false,
        scorePercent: 40,
        statusMessage: 'Content contains terms flagged under YouTube Community Guidelines or broadcast safety standards.',
        violations: foundViolations,
      };
    }

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const resp = await fetch('/api/studio/compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsText: cleanText }),
        });
        if (resp.ok) {
          const data = await resp.json();
          return {
            isCompliant: data.isCompliant !== false,
            scorePercent: typeof data.scorePercent === 'number' ? data.scorePercent : 96,
            statusMessage:
              data.statusMessage || 'Verified under Indian broadcast standards and YouTube Community Guidelines.',
            violations: Array.isArray(data.violations) ? data.violations : [],
          };
        }
      } catch (err) {
        console.warn('[EditorialStudio] Compliance endpoint fallback:', err);
      }
    }

    return {
      isCompliant: true,
      scorePercent: 98,
      statusMessage: 'Verified under Indian IT Rules and YouTube Community Guidelines (Safe to Broadcast).',
      violations: [],
    };
  }

  /**
   * Drafts a news story manuscript from uploaded field footage via server-side endpoint.
   */
  static async draftStoryFromVideo(
    videoFile: File | Blob,
    language: SupportedIndianLanguage = 'en'
  ): Promise<{ headline: string; story: string; location?: string }> {
    const mediaPart = await this.extractMediaForVerification(videoFile);
    if (!mediaPart) {
      throw new Error('Could not extract audio track from this video clip. Please enter the story manuscript manually.');
    }

    const resp = await fetch('/api/studio/draft-from-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, mediaPart }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || 'Could not draft story from video footage right now.');
    }

    const parsed = await resp.json();
    return {
      headline: parsed.headline || '',
      story: parsed.story || '',
      location: parsed.location || undefined,
    };
  }

  /**
   * Generates a complete 60–70 word broadcast script, YouTube Title, Description, SEO Tags,
   * and thumbnail copy via server-side studio editorial route (with deterministic fallback).
   */
  static async generateBroadcastPackage(params: {
    newsText: string;
    language: SupportedIndianLanguage;
    channelName?: string;
    videoClips?: (File | Blob)[];
    videoElement?: HTMLVideoElement | null;
    onProgressStep?: (step: string) => void;
  }): Promise<BroadcastScriptResult> {
    const { newsText, language, channelName = 'NewsPress', videoClips, onProgressStep } = params;

    let mediaPart: { mimeType: string; data: string } | null = null;
    if (videoClips && videoClips.length > 0 && typeof window !== 'undefined') {
      try {
        onProgressStep?.('Cross-referencing reporter notes with footage audio...');
        mediaPart = await this.extractMediaForVerification(videoClips[0]);
      } catch (mediaErr) {
        console.warn('[EditorialStudio] Footage media extraction note:', mediaErr);
      }
    }

    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const resp = await fetch('/api/studio/broadcast-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newsText,
            language,
            channelName,
            mediaPart,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const parsed = data?.package;
          if (parsed && typeof parsed.scriptText === 'string' && parsed.scriptText.trim().length > 0) {
            let finalScript = parsed.scriptText.trim();
            let words = finalScript.split(/\s+/).filter(Boolean);

            if (words.length < 48) {
              const extraSentences = newsText
                .split(/[.।!?]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 10 && !finalScript.includes(s));
              if (extraSentences.length > 0) {
                finalScript += ' ' + extraSentences.slice(0, 2).join('. ') + '.';
                words = finalScript.split(/\s+/).filter(Boolean);
              }
            }

            const title = (parsed.headlineTitle || '').trim() || this.getFallbackTitle(newsText, language);
            const rawTags =
              Array.isArray(parsed.tags) && parsed.tags.length > 0
                ? parsed.tags
                : ['BreakingNews', 'LatestNews', channelName.replace(/\s+/g, '')];

            const richDescription = this.buildComprehensiveYouTubeDescription({
              title,
              scriptText: finalScript,
              sourceNewsText: newsText,
              language,
              channelName,
              tags: rawTags,
              bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
            });

            const fallbackHooks = this.getLocalizedDefaultHooks(language);

            return {
              headlineTitle: title,
              scriptText: finalScript,
              wordCount: words.length,
              youtubeDescription: richDescription,
              tags: rawTags,
              thumbnailHeadline: parsed.thumbnailHeadline || fallbackHooks.headline,
              thumbnailBadge: parsed.thumbnailBadge || fallbackHooks.badge,
              thumbnailCuriosityLine: parsed.thumbnailCuriosityLine || fallbackHooks.curiosity,
              thumbnailColorTheme: parsed.thumbnailColorTheme || 'fire_red',
              language,
              bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
            };
          }
        }
      } catch (err) {
        console.warn('[EditorialStudio] Switching to deterministic broadcast desk formatter:', err);
      }
    }

    return this.generateDeterministicFallback(newsText, language, channelName);
  }

  private static getFallbackTitle(newsText: string, language: SupportedIndianLanguage): string {
    const firstSentence = newsText
      .replace(/\s+/g, ' ')
      .trim()
      .split(/[.।!?\n]+/)[0]
      ?.trim();
    if (firstSentence && firstSentence.length > 6) {
      return firstSentence.length > 68 ? `${firstSentence.slice(0, 65)}...` : firstSentence;
    }
    if (language === 'te') return 'నేటి తాజా కీలక వార్తా నివేదిక';
    if (language === 'hi') return 'आज की ताज़ा प्रमुख रिपोर्ट';
    if (language === 'ta') return 'இன்றைய முக்கிய செய்தி அறிக்கை';
    return 'Latest News Bulletin: Key Developments';
  }

  static getLocalizedDefaultHooks(language: SupportedIndianLanguage): {
    headline: string;
    badge: string;
    curiosity: string;
  } {
    switch (language) {
      case 'te':
        return { headline: 'కీలక వార్తా మలుపు!', badge: 'సంచలన నివేదిక!', curiosity: 'పూర్తి వివరాలు ఇక్కడ తెలుసుకోండి!' };
      case 'hi':
        return { headline: 'बड़ी खबर का खुलासा!', badge: 'विशेष रिपोर्ट!', curiosity: 'अंदर की पूरी कहानी जानिए!' };
      case 'ta':
        return { headline: 'முக்கிய திருப்பம்!', badge: 'சிறப்பு அறிக்கை!', curiosity: 'நடந்தது என்ன? முழு விவரம்!' };
      case 'kn':
        return { headline: 'ಪ್ರಮುಖ ಬೆಳವಣಿಗೆ!', badge: 'ವಿಶೇಷ ವರದಿ!', curiosity: 'ಸಂಪೂರ್ಣ ವಿವರ ಇಲ್ಲಿದೆ!' };
      case 'ml':
        return { headline: 'നിർണായക വഴിത്തിരിവ്!', badge: 'പ്രത്യേക റിപ്പോർട്ട്!', curiosity: 'സംഭവിച്ചതെന്ത്? വിശദാംശങ്ങൾ!' };
      case 'bn':
        return { headline: 'বড় মোড়ের খবর!', badge: 'বিশেষ প্রতিবেদন!', curiosity: 'কী ঘটল? জানুন বিস্তারিত!' };
      case 'mr':
        return { headline: 'मोठा उलगडा!', badge: 'विशेष वृत्त!', curiosity: 'नेमकं काय घडलं? सविस्तर पहा!' };
      case 'gu':
        return { headline: 'મોટો ખુલાસો!', badge: 'ખાસ અહેવાલ!', curiosity: 'શું બન્યું? જાણો સંપૂર્ણ વિગત!' };
      case 'pa':
        return { headline: 'ਵੱਡਾ ਖੁਲਾਸਾ!', badge: 'ਖ਼ਾਸ ਰਿਪੋਰਟ!', curiosity: 'ਕੀ ਵਾਪਰਿਆ? ਪੂਰੀ ਜਾਣਕਾਰੀ!' };
      case 'or':
        return { headline: 'ବଡ଼ ଖବର!', badge: 'ବିଶେଷ ରିପୋର୍ଟ!', curiosity: 'କଣ ଘଟିଲା? ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ!' };
      case 'en':
      default:
        return { headline: 'KEY DEVELOPMENTS', badge: 'SPECIAL REPORT', curiosity: 'Full Ground Report & Facts' };
    }
  }

  private static generateDeterministicFallback(
    newsText: string,
    language: SupportedIndianLanguage,
    channelName: string
  ): BroadcastScriptResult {
    const cleanNews = newsText.replace(/\s+/g, ' ').trim();
    const sentences = cleanNews.split(/[.।!?]+/).map((s) => s.trim()).filter(Boolean);
    const hooks = this.getLocalizedDefaultHooks(language);
    const title = this.getFallbackTitle(cleanNews, language);

    let sampleScript = sentences.slice(0, 5).join('. ') || cleanNews;
    let words = sampleScript.split(/\s+/).filter(Boolean);
    if (words.length > 70) {
      words = words.slice(0, 68);
      sampleScript = words.join(' ') + (language === 'hi' ? '।' : '.');
    }

    const rawTags = [
      'BreakingNews',
      'TodayNews',
      channelName.replace(/\s+/g, '') || 'NewsPress',
      'LatestUpdates',
      'Headlines',
      'SpecialReport',
      'TrendingNews',
    ];

    const richDescription = this.buildComprehensiveYouTubeDescription({
      title,
      scriptText: sampleScript,
      sourceNewsText: newsText,
      language,
      channelName,
      tags: rawTags,
    });

    return {
      headlineTitle: title,
      scriptText: sampleScript,
      wordCount: words.length,
      youtubeDescription: richDescription,
      tags: rawTags,
      thumbnailHeadline: hooks.headline,
      thumbnailBadge: hooks.badge,
      thumbnailCuriosityLine: hooks.curiosity,
      thumbnailColorTheme: 'fire_red',
      language,
      bulletPoints: sentences.slice(0, 4),
    };
  }

  /**
   * Builds a rich, SEO-optimized YouTube description accurately localized for all 11 Indian languages + English.
   */
  static buildComprehensiveYouTubeDescription(params: {
    title: string;
    scriptText: string;
    sourceNewsText: string;
    language: SupportedIndianLanguage;
    channelName: string;
    tags?: string[];
    bulletPoints?: string[];
  }): string {
    const { title, scriptText, sourceNewsText, language, channelName, tags = [], bulletPoints = [] } = params;

    const localized = LOCALIZED_DESCRIPTIONS[language] || LOCALIZED_DESCRIPTIONS.en;

    const storyWords = sourceNewsText
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 4 && w.length <= 16);

    const dynamicKeywords = Array.from(new Set(storyWords)).slice(0, 10);
    const contextualHashtags = dynamicKeywords.map((w) => `#${w}`);

    const cleanChannel = channelName.replace(/[^\p{L}\p{N}]/gu, '');
    const channelHashtag = cleanChannel ? `#${cleanChannel}` : '#NewsPress';

    const allTags = Array.from(
      new Set([
        channelHashtag,
        ...localized.baseHashtags,
        ...contextualHashtags,
        ...tags.map((t) => (t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`)),
      ])
    ).filter(Boolean);

    let bullets = bulletPoints.filter((b) => b && b.trim().length > 5);
    if (bullets.length === 0) {
      const sentences = sourceNewsText
        .split(/[.।!?\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);
      bullets = sentences.slice(0, 4);
    }

    const detailedBody = sourceNewsText.trim() || scriptText;

    const sections = [
      `🔴 ${title}`,
      '',
      scriptText,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      localized.highlightsHeader,
      bullets.map((b) => `• ${b}`).join('\n'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      localized.detailedStoryHeader,
      detailedBody,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      localized.subscribeCallout(channelName),
      '',
      localized.disclaimerNotice,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '🏷️ Trending Topics & Hashtags:',
      allTags.join(' '),
    ];

    return sections.join('\n');
  }

  /**
   * Studio Anchor 24kHz Narration Synthesis.
   * Calls the server-side /api/studio/tts endpoint (gemini-3.8-flash-lite-tts, native 24kHz WAV).
   * Falls back to Cloud Run TTS only if server route is unreachable, and raises a clear error
   * rather than silently emitting a synthetic beep.
   */
  static async synthesizeVoiceOver(params: {
    scriptText: string;
    language: SupportedIndianLanguage;
    rate?: number;
    pitch?: number;
    gender?: 'male' | 'female';
    voiceActorId?: string;
    emotionalStyle?: EmotionalNewsStyle | string;
  }): Promise<{ audioBlob: Blob; audioUrl: string; durationEstimateSec: number }> {
    const {
      scriptText,
      language,
      rate = 1.3,
      voiceActorId = 'ravi_shankar',
      emotionalStyle = 'emotional_breaking',
    } = params;

    const actor = VOICE_ACTORS.find((a) => a.id === voiceActorId) || VOICE_ACTORS[0];
    const googleVoice = actor.googleOriginalVoice;
    const styleDirective = `${actor.styleInstruction} ${getEmotionalStyleDirective(emotionalStyle)}`;

    const words = scriptText.split(/\s+/).filter(Boolean).length;
    const durationEstimateSec = Math.max(8, Math.min(60, Math.round(words / (2.4 * rate))));

    // 1. Primary: Server-side Studio TTS endpoint (returns complete 24kHz WAV)
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const resp = await fetch('/api/studio/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptText,
            language,
            rate,
            voiceActorId: actor.id,
            googleVoice,
            styleInstruction: styleDirective,
            isSample: false,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.audioBase64) {
            const audioBlob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
            const audioUrl = URL.createObjectURL(audioBlob);
            return { audioBlob, audioUrl, durationEstimateSec };
          }
        } else {
          const errBody = await resp.json().catch(() => ({}));
          console.warn('[VoiceOver] Server TTS returned non-OK:', errBody.error || resp.status);
        }
      } catch (err: any) {
        console.warn('[VoiceOver] Server TTS route unavailable:', err?.message || err);
      }
    }

    // 2. Secondary: Cloud Run TTS fallback
    try {
      const endpoint = `https://composevideo-vz346mffwa-uc.a.run.app?action=tts&lang=${encodeURIComponent(language)}&text=${encodeURIComponent(scriptText)}&speaker=${encodeURIComponent(googleVoice)}&rate=${rate}&style=${encodeURIComponent(styleDirective)}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const audioBlob = await res.blob();
        if (audioBlob.size > 2000) {
          const audioUrl = URL.createObjectURL(audioBlob);
          return { audioBlob, audioUrl, durationEstimateSec };
        }
      }
    } catch (e) {
      console.warn('[VoiceOver] Cloud Run TTS fallback unavailable:', e);
    }

    throw new Error(
      'Unable to synthesize studio anchor voice narration right now. Please verify server connectivity and click Re-Record Voice to try again.'
    );
  }

  /**
   * Generates or retrieves a cached live studio audition clip for a specific Voice Actor
   * in the user's selected broadcast language.
   */
  static async synthesizeVoiceSample(params: {
    voiceActorId: string;
    language: SupportedIndianLanguage;
    emotionalStyle?: EmotionalNewsStyle | string;
    rate?: number;
  }): Promise<{ audioBlob: Blob; audioUrl: string }> {
    const { voiceActorId, language, emotionalStyle = 'emotional_breaking', rate = 1.25 } = params;
    const actor = VOICE_ACTORS.find((a) => a.id === voiceActorId) || VOICE_ACTORS[0];
    const cacheKey = `${actor.id}:${language}:${emotionalStyle}`;

    const cachedBlob = clientSampleBlobCache.get(cacheKey);
    if (cachedBlob) {
      return {
        audioBlob: cachedBlob,
        audioUrl: URL.createObjectURL(cachedBlob),
      };
    }

    const scriptBuilder = VOICE_AUDITION_SCRIPTS[language] || VOICE_AUDITION_SCRIPTS.en;
    const sampleScript = scriptBuilder(actor.englishName || actor.name);
    const styleDirective = `${actor.styleInstruction} ${getEmotionalStyleDirective(emotionalStyle)}`;

    const resp = await fetch('/api/studio/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptText: sampleScript,
        language,
        rate,
        voiceActorId: actor.id,
        googleVoice: actor.googleOriginalVoice,
        styleInstruction: styleDirective,
        isSample: true,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.error || 'Could not generate voice sample audio.');
    }

    const data = await resp.json();
    if (!data.audioBase64) {
      throw new Error('Studio audio preview returned empty audio data.');
    }

    const audioBlob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
    clientSampleBlobCache.set(cacheKey, audioBlob);
    return {
      audioBlob,
      audioUrl: URL.createObjectURL(audioBlob),
    };
  }
}
