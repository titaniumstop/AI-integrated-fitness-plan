exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' }) };
    }
    const body = JSON.parse(event.body || '{}');
    // Basic validation for required fields
    const required = ['age', 'biologicalSex', 'height', 'weight', 'fitnessExperience', 'fitnessGoals'];
    const missing = required.filter((k) => body[k] === undefined || body[k] === '');
    if (missing.length) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Missing required fields', details: missing.join(', ') })
      };
    }

    const prompt = `Create a personalized fitness and diet plan based on the following user information:
- Age: ${body.age}
- Biological Sex: ${body.biologicalSex}
- Height: ${body.height} cm
- Weight: ${body.weight} kg
- Fitness Experience: ${body.fitnessExperience}
- Dietary Restrictions: ${body.dietaryRestrictions || 'None'}
- Fitness Goals: ${body.fitnessGoals}
${body.oxygenSaturation ? `- Oxygen Saturation: ${body.oxygenSaturation}%` : ''}
${body.bloodPressure ? `- Blood Pressure: ${body.bloodPressure}` : ''}
${body.waterIntake ? `- Daily Water Intake: ${body.waterIntake}L` : ''}
${body.calorieIntake ? `- Daily Calorie Intake: ${body.calorieIntake} kcal` : ''}

Please provide a detailed 7-day fitness and nutrition plan that includes:
1. Daily workout routines with sets and reps
2. Meal plans with portion sizes
3. Rest days
4. Hydration goals
5. Additional recommendations based on the user's data`;

    async function callGeminiREST(model) {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
      const resp = await fetch(url + `?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ]
        })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (!text) throw new Error('Empty response from model');
      return text;
    }

    async function listModels() {
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`ListModels failed: ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      return data?.models || [];
    }

    // Resolve a working model dynamically
    const preferred = [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro-latest'
    ];

    let text;
    let lastErr;
    try {
      // Try preferred names first
      for (const name of preferred) {
        try {
          text = await callGeminiREST(name);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      // Fallback: query ListModels and pick any that supports generateContent
      if (!text) {
        const models = await listModels();
        const supported = models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
        // Prefer 1.5-pro, then 1.5-flash, then any
        const byPreference = supported.sort((a, b) => {
          const rank = (name) => name.includes('1.5-pro') ? 0 : name.includes('1.5-flash') ? 1 : 2;
          return rank(a.name) - rank(b.name);
        });
        for (const m of byPreference) {
          try {
            text = await callGeminiREST(m.name);
            break;
          } catch (e) {
            lastErr = e;
          }
        }
      }
    } catch (outer) {
      lastErr = outer;
    }

    if (!text) throw new Error(`All model attempts failed. Last error: ${lastErr?.message || 'unknown'}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, plan: text })
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to generate fitness plan', details: err.message })
    };
  }
};
