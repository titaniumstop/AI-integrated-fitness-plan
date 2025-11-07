exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' }) };
    }
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
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

    async function tryModel(modelName) {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }

    const candidates = [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro',
      'gemini-pro'
    ];

    let text;
    let lastErr;
    for (const name of candidates) {
      try {
        text = await tryModel(name);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!text) {
      throw new Error(`All model attempts failed. Last error: ${lastErr?.message || 'unknown'}`);
    }

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
