const fs = require('fs');

async function test() {
  const env = fs.readFileSync('.env', 'utf8');
  const keyMatch = env.match(/GEMINI_API_KEY="([^"]+)"/);
  const key = keyMatch ? keyMatch[1] : '';

  const voices = [
    { id: 'ravi_shankar', name: 'Ravi Shankar', voice: 'Fenrir', sample: 'నమస్కారం! నేను రవి శంకర్. ఇది ఆల్ఫా న్యూస్ ప్రైమ్‌టైమ్ బులెటిన్.' },
    { id: 'krishna_murthy', name: 'Krishna Murthy', voice: 'Charon', sample: 'తాజా బ్రేకింగ్ న్యూస్! నేను కృష్ణ మూర్తి. క్షణ క్షణం వార్తలను అందిస్తున్నాం.' },
    { id: 'sunitha', name: 'Sunitha', voice: 'Kore', sample: 'నమస్తే, నేను సునీత. ఈనాటి ముఖ్య వార్తలు మరియు విశ్లేషణను ఇప్పుడు చూద్దాం.' },
    { id: 'priyanka', name: 'Priyanka', voice: 'Aoede', sample: 'హలో, నేను ప్రియాంక! స్పీడ్ న్యూస్ బులెటిన్ తో వేగంగా మీ ముందుకు వచ్చాను.' },
    { id: 'rajesh', name: 'Rajesh', voice: 'Puck', sample: 'గ్రౌండ్ రిపోర్ట్ తో నేను మీ రాజేష్. క్షేత్రస్థాయి పరిశీలనను వివరిస్తున్నాను.' },
  ];

  for (const v of voices) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: v.sample }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: v.voice
              }
            }
          }
        }
      })
    });
    const data = await res.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    console.log(`Voice [${v.voice} - ${v.name}]: Status ${res.status}, Audio bytes length: ${audioData ? audioData.length : 'FAILED'}`);
  }
}

test().catch(console.error);
