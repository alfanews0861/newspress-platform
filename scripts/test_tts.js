const fs = require('fs');

async function test() {
  const env = fs.readFileSync('.env', 'utf8');
  const keyMatch = env.match(/GEMINI_API_KEY="([^"]+)"/);
  const key = keyMatch ? keyMatch[1] : '';
  console.log('Using key prefix:', key.slice(0, 8));

  // Check models
  const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + key;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    const speechModels = data.models.filter(m => m.name.toLowerCase().includes('speech') || m.name.toLowerCase().includes('tts') || m.name.toLowerCase().includes('audio') || m.name.toLowerCase().includes('live'));
    console.log('Speech/Audio models in v1beta:', speechModels.map(m => m.name));
  } else {
    console.log('Models error:', data);
  }
}

test().catch(console.error);
