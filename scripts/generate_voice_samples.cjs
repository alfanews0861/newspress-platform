const fs = require('fs');
const path = require('path');

async function generate() {
  const env = fs.readFileSync('.env', 'utf8');
  const freeKeyMatch = env.match(/GEMINI_API_KEY="([^"]+)"/);
  const apiKey = freeKeyMatch ? freeKeyMatch[1] : '';

  console.log('Using API key prefix:', apiKey.slice(0, 8));

  const actors = [
    {
      id: 'ravi_shankar',
      voiceName: 'Fenrir',
      text: 'నమస్కారం. ఆల్ఫా న్యూస్ ప్రైమ్‌టైమ్ బులెటిన్‌కు స్వాగతం. నేను రవి శంకర్. నేటి ప్రధాన వార్తలను విశ్లేషిస్తున్నాం.',
    },
    {
      id: 'krishna_murthy',
      voiceName: 'Charon',
      text: 'బ్రేకింగ్ న్యూస్! నేను కృష్ణ మూర్తి. క్షణ క్షణం మారుతున్న తాజా రాజకీయ పరిణామాల సమగ్ర సమాచారం ఇప్పుడు చూద్దాం.',
    },
    {
      id: 'sunitha',
      voiceName: 'Kore',
      text: 'నమస్తే. నేను సునీత. ఆల్ఫా న్యూస్ ప్రధాన వార్తా విభాగానికి స్వాగతం. ఈనాటి కీలక విశేషాలు మీకోసం.',
    },
    {
      id: 'priyanka',
      voiceName: 'Aoede',
      text: 'హలో, నేను ప్రియాంక! క్షణాల్లో అత్యంత వేగంగా కీలక సమాచారాన్ని అందించే స్పీడ్ న్యూస్ బులెటిన్ మొదలవుతోంది.',
    },
    {
      id: 'rajesh',
      voiceName: 'Puck',
      text: 'క్షేత్రస్థాయి గ్రౌండ్ రిపోర్ట్ తో నేను మీ రాజేష్. సంఘటనా స్థలం నుండి ప్రత్యక్ష సాక్ష్యాలు మరియు తాజా వాస్తవాలు మీముందుంచుతున్నాను.',
    },
  ];

  const outputDir = path.join(process.cwd(), 'public', 'audio', 'samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const actor of actors) {
    const filePath = path.join(outputDir, `${actor.id}.wav`);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      console.log(`Already exists: ${filePath}`);
      continue;
    }

    console.log(`Generating audio for ${actor.id} (${actor.voiceName})...`);

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: actor.text }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: actor.voiceName,
                    },
                  },
                },
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const audioPart = data.candidates?.[0]?.content?.parts?.find(
            (p) => p.inlineData?.mimeType?.startsWith('audio/')
          );
          if (audioPart?.inlineData?.data) {
            const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
            fs.writeFileSync(filePath, buffer);
            console.log(`Saved ${filePath} (${buffer.length} bytes)`);
            success = true;
            break;
          }
        } else {
          const err = await res.text();
          console.warn(`Attempt ${attempt} for ${actor.id} failed (${res.status}): ${err.slice(0, 150)}`);
          if (res.status === 429) {
            console.log('Sleeping 8 seconds for 429 cooldown...');
            await new Promise((r) => setTimeout(r, 8000));
          }
        }
      } catch (e) {
        console.error(`Attempt ${attempt} exception:`, e.message);
      }
    }

    // Delay 3 seconds between actors
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('Voice sample generation completed.');
}

generate().catch(console.error);
