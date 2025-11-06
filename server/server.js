require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Generate fitness plan
app.post('/api/generate-plan', async (req, res) => {
  try {
    const userData = req.body;
    
    // Create a prompt for Gemini
    const prompt = `Create a personalized fitness and diet plan based on the following user information:
    - Age: ${userData.age}
    - Biological Sex: ${userData.biologicalSex}
    - Height: ${userData.height} cm
    - Weight: ${userData.weight} kg
    - Fitness Experience: ${userData.fitnessExperience}
    - Dietary Restrictions: ${userData.dietaryRestrictions || 'None'}
    - Fitness Goals: ${userData.fitnessGoals}
    ${userData.oxygenSaturation ? `- Oxygen Saturation: ${userData.oxygenSaturation}%` : ''}
    ${userData.bloodPressure ? `- Blood Pressure: ${userData.bloodPressure}` : ''}
    ${userData.waterIntake ? `- Daily Water Intake: ${userData.waterIntake}L` : ''}
    ${userData.calorieIntake ? `- Daily Calorie Intake: ${userData.calorieIntake} kcal` : ''}
    
    Please provide a detailed 7-day fitness and nutrition plan that includes:
    1. Daily workout routines with sets and reps
    2. Meal plans with portion sizes
    3. Rest days
    4. Hydration goals
    5. Any additional recommendations based on the user's data`;

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({
      success: true,
      plan: text
    });
    
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate fitness plan',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
