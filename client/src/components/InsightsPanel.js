import React, { useMemo, useState } from 'react';
import { Box, Paper, Typography, Divider, LinearProgress, TextField, Stack, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function parseNumbers(s) {
  const n = Number(String(s).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function extractTargets(planText, summaryText) {
  const text = [summaryText || '', planText || ''].join('\n');
  let calories = 0, protein = 0, carbs = 0, fats = 0;

  // Calories: ... kcal
  const calMatch = text.match(/Calories:\s*(\d+)\s*kcal/i) || text.match(/Daily\s+target:\s*(\d+)\s*kcal/i);
  if (calMatch) calories = parseNumbers(calMatch[1]);

  // Macros: Protein X g, Carbs Y g, Fats Z g
  const macrosMatch = text.match(/Macros[^:]*:\s*Protein\s*(\d+)\s*g.*?Carbs\s*(\d+)\s*g.*?Fats\s*(\d+)\s*g/i);
  if (macrosMatch) {
    protein = parseNumbers(macrosMatch[1]);
    carbs = parseNumbers(macrosMatch[2]);
    fats = parseNumbers(macrosMatch[3]);
  }

  return { calories, protein, carbs, fats };
}

const InsightsPanel = ({ planText, summaryText, waterIntakeLiters }) => {
  const targets = useMemo(() => extractTargets(planText, summaryText), [planText, summaryText]);
  const totalMacros = Math.max(1, targets.protein + targets.carbs + targets.fats);

  // User-entered values
  const [waterMl, setWaterMl] = useState('');
  const [carbsIntake, setCarbsIntake] = useState('');
  const [fatsIntake, setFatsIntake] = useState('');
  const [proteinIntake, setProteinIntake] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [leaderboard, setLeaderboard] = useState(() => {
    try { return JSON.parse(localStorage.getItem('leaderboard') || '[]'); } catch { return []; }
  });

  const donutData = {
    labels: ['Protein', 'Carbs', 'Fats'],
    datasets: [
      {
        data: [targets.protein, targets.carbs, targets.fats],
        backgroundColor: ['#0EA5E9', '#10B981', '#F59E0B'],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12 } },
    },
    cutout: '65%',
    maintainAspectRatio: false,
  };

  const hydrationGoal = 2.5; // default goal L/day
  const hydrationCurrent = (Number(waterMl) ? Number(waterMl) / 1000 : 0) || (Number(waterIntakeLiters) || 0);
  const hydrationPct = Math.max(0, Math.min(100, Math.round((hydrationCurrent / hydrationGoal) * 100)));

  function clampPct(x) { return Math.max(0, Math.min(100, Math.round(x))); }
  const proteinPct = clampPct(((Number(proteinIntake)||0) / Math.max(1, targets.protein)) * 100);
  const carbsPct = clampPct(((Number(carbsIntake)||0) / Math.max(1, targets.carbs)) * 100);
  const fatsPct = clampPct(((Number(fatsIntake)||0) / Math.max(1, targets.fats)) * 100);
  const score = Math.round((proteinPct + carbsPct + fatsPct + hydrationPct) / 4);

  const submitProgress = () => {
    const entry = {
      name: name.trim() || 'Anonymous',
      email: email.trim() || 'n/a',
      date: new Date().toISOString().slice(0,10),
      protein_g: Number(proteinIntake)||0,
      carbs_g: Number(carbsIntake)||0,
      fats_g: Number(fatsIntake)||0,
      water_ml: Number(waterMl)||0,
      target_protein_g: targets.protein||0,
      target_carbs_g: targets.carbs||0,
      target_fats_g: targets.fats||0,
      target_water_ml: Math.round(hydrationGoal*1000),
      protein_pct: proteinPct,
      carbs_pct: carbsPct,
      fats_pct: fatsPct,
      hydration_pct: hydrationPct,
      score,
    };
    const next = [...leaderboard, entry].sort((a,b) => b.score - a.score).slice(0,50);
    setLeaderboard(next);
    localStorage.setItem('leaderboard', JSON.stringify(next));
  };

  return (
    <Box component="section" aria-labelledby="insights-heading">
      <Paper elevation={6} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Typography id="insights-heading" variant="h6" component="h2" gutterBottom>
          Daily Targets
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box sx={{ height: 220 }}>
            <Doughnut data={donutData} options={donutOptions} aria-label="Macros donut chart" role="img" />
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Total macros: {totalMacros} g
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">Calories target</Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>{targets.calories || 0} kcal</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Enter today’s intake</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
              <TextField
                type="number"
                label="Water (mL)"
                value={waterMl}
                onChange={(e) => setWaterMl(e.target.value)}
                inputProps={{ min: 0, step: 50 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Protein (g)"
                value={proteinIntake}
                onChange={(e) => setProteinIntake(e.target.value)}
                inputProps={{ min: 0, step: 5 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Carbs (g)"
                value={carbsIntake}
                onChange={(e) => setCarbsIntake(e.target.value)}
                inputProps={{ min: 0, step: 5 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Fats (g)"
                value={fatsIntake}
                onChange={(e) => setFatsIntake(e.target.value)}
                inputProps={{ min: 0, step: 1 }}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField label="Name" value={name} onChange={(e)=>setName(e.target.value)} fullWidth />
              <TextField label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} fullWidth />
            </Stack>
            <Box sx={{ display:'flex', alignItems:'center', gap:2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Score preview: {score}%</Typography>
              <Button variant="contained" onClick={submitProgress}>Submit today’s progress</Button>
            </Box>

            <Typography variant="subtitle2" color="text.secondary">Hydration</Typography>
            <LinearProgress variant="determinate" value={hydrationPct} aria-label={`Hydration ${hydrationPct}% of goal`} sx={{ height: 10, borderRadius: 5 }} />
            <Typography variant="caption" color="text.secondary">
              {hydrationCurrent.toFixed(2)}/{hydrationGoal} L
            </Typography>

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" color="text.secondary">Macros progress</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Protein</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Math.round(((Number(proteinIntake)||0) / Math.max(1, targets.protein)) * 100)))}
                sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {(Number(proteinIntake)||0)}/{targets.protein || 0} g
              </Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Carbs</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Math.round(((Number(carbsIntake)||0) / Math.max(1, targets.carbs)) * 100)))}
                sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {(Number(carbsIntake)||0)}/{targets.carbs || 0} g
              </Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Fats</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Math.round(((Number(fatsIntake)||0) / Math.max(1, targets.fats)) * 100)))}
                sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {(Number(fatsIntake)||0)}/{targets.fats || 0} g
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {leaderboard.length > 0 && (
        <Paper elevation={6} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mt: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Leaderboard (local demo)
          </Typography>
          <Table size="small" aria-label="Leaderboard table">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Protein%</TableCell>
                <TableCell>Carbs%</TableCell>
                <TableCell>Fats%</TableCell>
                <TableCell>Hydration%</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx+1}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.score}%</TableCell>
                  <TableCell>{row.protein_pct}%</TableCell>
                  <TableCell>{row.carbs_pct}%</TableCell>
                  <TableCell>{row.fats_pct}%</TableCell>
                  <TableCell>{row.hydration_pct}%</TableCell>
                  <TableCell>{row.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default InsightsPanel;
