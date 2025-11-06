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
    const genAI = new GoogleGenerativeAI(apiKey);
    const body = JSON.parse(event.body || '{}');

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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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
