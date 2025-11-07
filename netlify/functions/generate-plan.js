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

    // Personalization helpers
    function mifflinStJeor(sex, weightKg, heightCm, ageYears) {
      const s = (sex || '').toLowerCase();
      if (s === 'male') return (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) + 5;
      return (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 161; // female/other fallback
    }
    function activityFromExperience(exp) {
      const e = (exp || '').toLowerCase();
      if (e.includes('expert') || e.includes('5+')) return 1.9;
      if (e.includes('advanced') || e.includes('2+')) return 1.725;
      if (e.includes('intermediate')) return 1.55;
      if (e.includes('beginner') || e.includes('0-6')) return 1.375;
      return 1.5; // default moderate
    }
    function goalAdjustment(goal) {
      const g = (goal || '').toLowerCase();
      if (g.includes('weight') && g.includes('loss')) return -0.20; // cut ~20%
      if (g.includes('muscle') || g.includes('gain') || g.includes('strength')) return 0.12; // lean bulk ~+12%
      if (g.includes('endurance')) return 0.05; // small surplus
      if (g.includes('rehab')) return -0.05; // gentle deficit
      return 0.0; // maintenance/general
    }
    function macroTargetsKg(weightKg, kcalTarget, goal) {
      const g = (goal || '').toLowerCase();
      // protein g/kg
      let proteinPerKg = 1.6;
      if (g.includes('loss')) proteinPerKg = 2.0;
      else if (g.includes('muscle') || g.includes('strength')) proteinPerKg = 1.8;
      const proteinG = Math.round(proteinPerKg * weightKg);
      // fat baseline g/kg
      const fatG = Math.round(0.8 * weightKg);
      // remaining kcal -> carbs
      const kcalAfterPF = kcalTarget - (proteinG * 4) - (fatG * 9);
      const carbsG = Math.max(0, Math.round(kcalAfterPF / 4));
      return { proteinG, fatG, carbsG };
    }

    // Compute personalized targets
    const bmr = mifflinStJeor(body.biologicalSex, Number(body.weight), Number(body.height), Number(body.age));
    const tdee = Math.round(bmr * activityFromExperience(body.fitnessExperience));
    const adj = goalAdjustment(body.fitnessGoals);
    const targetKcal = Math.max(1200, Math.round(tdee * (1 + adj)));
    const macros = macroTargetsKg(Number(body.weight), targetKcal, body.fitnessGoals);

    const prompt = `Create a personalized 7-day fitness and diet plan based on the following user information (be concise; hard limit ~800 words total):
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

PERSONALIZED TARGETS (adhere strictly):
- Daily Calories: ${targetKcal} kcal (based on BMR ${Math.round(bmr)} and TDEE ${tdee} with goal adjustment ${Math.round(adj*100)}%)
- Macros per day: Protein ${macros.proteinG} g, Carbs ${macros.carbsG} g, Fats ${macros.fatG} g

Provide a detailed 7-day plan that includes:
1) Daily WORKOUTS:
   - 45–70 min session outline with warm-up, main sets, and cool-down.
   - For each exercise: movement name, sets × reps, rest time, and simple coaching cue.
   - Provide a no-equipment substitution for each exercise when possible.
   - Include 1–2 progression ideas for the week.
2) Daily DIET:
   - 3 meals + 2 snacks per day (or culturally appropriate pattern) with portion sizes.
   - Per-day macro breakdown (g protein/carbs/fats) that matches the personalized targets above.
   - Give at least one substitution per meal to handle dietary restrictions.
   - Add 1 quick recipe idea per day with brief steps (3–5 steps).
3) HYDRATION: daily goal and practical tip.
4) REST/RECOVERY: mobility or light activity suggestions where appropriate.
5) SHOPPING LIST: consolidated weekly grocery list grouped by category (protein, carbs, produce, pantry, dairy/alternatives) filtered for any dietary restrictions.
6) SAFETY NOTES: brief and relevant to the user's metrics.

Format clearly with headings per day (Day 1 … Day 7), then subsections: Workouts, Diet (with Meals/Snacks), Hydration, Recovery. Keep within ~800 words total.
Be concise but descriptive so the user can follow the plan without ambiguity.`;

    function withTimeout(promise, ms, controller) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          controller && controller.abort();
          reject(new Error(`Request timed out after ${ms}ms`));
        }, ms);
        promise.then(
          (v) => { clearTimeout(t); resolve(v); },
          (e) => { clearTimeout(t); reject(e); }
        );
      });
    }

    async function callGeminiREST(model, version = 'v1', timeoutMs = 20000) {
      const modelPath = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/${version}/${modelPath}:generateContent`;
      const ctrl = new AbortController();
      const resp = await withTimeout(fetch(url + `?key=${encodeURIComponent(apiKey)}`, {
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
          ],
          generationConfig: { maxOutputTokens: 1536, temperature: 0.7, topP: 0.95 }
        }),
        signal: ctrl.signal
      }), timeoutMs, ctrl);
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status} ${resp.statusText} at ${url}: ${txt}`);
      }
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (!text) throw new Error('Empty response from model');
      return text;
    }

    async function summarizePlan(planText) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        const ctrl = new AbortController();
        const promptSummary = `Summarize the following 7-day fitness & diet plan into 6-8 short bullet points. Include: goals, daily calories & macros, weekly workout focus, dietary highlights/substitutions, hydration, recovery, safety notes. Keep it under 120 words.\n\nPLAN:\n${planText}`;
        const respS = await withTimeout(fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptSummary }] }],
            generationConfig: { maxOutputTokens: 220, temperature: 0.4 }
          }),
          signal: ctrl.signal
        }), 8000, ctrl);
        if (!respS.ok) throw new Error(`HTTP ${respS.status}`);
        const dataS = await respS.json();
        const sText = (dataS?.candidates?.[0]?.content?.parts || []).map(p => (typeof p === 'string' ? p : p.text || '')).join('');
        return sText || '';
      } catch (_) {
        // Heuristic fallback summary
        return `Key Points\n- Daily target: ${targetKcal} kcal | Macros P${macros.proteinG}/C${macros.carbsG}/F${macros.fatG}\n- Goal: ${body.fitnessGoals}\n- Experience: ${body.fitnessExperience}\n- Diet: ${body.dietaryRestrictions || 'No major restrictions'}\n- Hydration: 2–3L/day; Recovery: light mobility daily\n- Safety: respect pain, scale loads, consult a professional for BP/SpO2 concerns`;
      }
    }

    async function listModels(version = 'v1') {
      const url = `https://generativelanguage.googleapis.com/${version}/models?key=${encodeURIComponent(apiKey)}`;
      const ctrl = new AbortController();
      const resp = await withTimeout(fetch(url, { signal: ctrl.signal }), 8000, ctrl);
      if (!resp.ok) throw new Error(`ListModels failed at ${url}: ${resp.status} ${resp.statusText}`);
      const data = await resp.json();
      return data?.models || [];
    }

    // Resolve a working model dynamically
    const preferred = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.5-pro-preview-05-06',
      'gemini-pro'
    ];

    let text;
    let lastErr;
    try {
      const isLocal = (process.env.NETLIFY_DEV || process.env.NETLIFY_LOCAL) ? true : false;
      const conciseRequested = Boolean(body.concise);
      const useConcise = isLocal || conciseRequested;
      const apiVersions = isLocal ? ['v1beta'] : ['v1beta'];
      const deadline = Date.now() + (isLocal ? 30000 : 25000);
      const perCallMs = isLocal ? 20000 : 12000;
      // Concise mode (local default or request flag): single compact call
      if (useConcise) {
        try {
          const ctrl = new AbortController();
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
          const concisePrompt = `${prompt}\n\nCONCISE MODE: Keep the entire 7-day plan within 500–700 words total. Use short bullet points. Avoid long recipes; give one-liner tips instead. If needed, prioritize clarity over volume.`;
          const respC = await withTimeout(fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: concisePrompt }] }],
              generationConfig: { maxOutputTokens: 900, temperature: 0.6, topP: 0.9 }
            }),
            signal: ctrl.signal
          }), 15000, ctrl);
          if (!respC.ok) {
            const txt = await respC.text();
            throw new Error(`Local REST HTTP (concise) ${respC.status}: ${txt}`);
          }
          const dataC = await respC.json();
          const t = (dataC?.candidates?.[0]?.content?.parts || []).map(p => (typeof p === 'string' ? p : p.text || '')).join('');
          if (!t) throw new Error(`Empty model response (concise): ${JSON.stringify(dataC).slice(0,400)}`);
          const summary = await summarizePlan(t);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, plan: t, summary })
          };
        } catch (e) {
          // Fallback minimal plan composed on server (local-only) to avoid empty output during development
          const day = (i) => `Day ${i}\nWorkouts: 45–60 min mixed (push/pull/legs/cardio). Choose 4–5 moves, 3×8–12 reps, 60–90s rest. No equipment? Do push-ups, squats, lunges, rows (towel/doorframe), planks.\nDiet (approx ${targetKcal} kcal | P${macros.proteinG}/C${macros.carbsG}/F${macros.fatG}):\n- Breakfast: Greek yogurt + berries + oats.\n- Lunch: Grain bowl (rice/quinoa), tofu/beans/chicken, veggies, olive oil.\n- Snack: Fruit + nuts.\n- Dinner: Lean protein, roasted veg, potatoes/rice.\n- Snack: Cottage cheese or protein shake.\nHydration: 2–3L water. Recovery: 10 min mobility.`;
          let planText = `Personalized Targets\n- Calories: ${targetKcal} kcal\n- Macros: Protein ${macros.proteinG} g, Carbs ${macros.carbsG} g, Fats ${macros.fatG} g\nDietary Restrictions: ${body.dietaryRestrictions || 'None'}\n\n`;
          for (let i = 1; i <= 7; i++) planText += day(i) + "\n\n";
          const summary = await summarizePlan(planText);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, plan: planText, summary, note: 'Returned server fallback due to local model limit: ' + e.message })
          };
        }
      }
      // Production path below: single fast call to v1beta gemini-2.5-flash
      if (!isLocal) {
        try {
          text = await callGeminiREST('models/gemini-2.5-flash', 'v1beta', perCallMs);
        } catch (e) {
          lastErr = e;
        }
      }
    } catch (outer) {
      lastErr = outer;
    }

    if (!text) throw new Error(`All model attempts failed. Last error: ${lastErr?.message || 'unknown'}`);

    const summaryFinal = await summarizePlan(text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, plan: text, summary: summaryFinal })
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
