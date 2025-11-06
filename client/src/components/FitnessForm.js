import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Grid, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Checkbox,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  age: Yup.number().required('Required').min(13, 'Must be at least 13 years old').max(120, 'Must be under 120 years old'),
  biologicalSex: Yup.string().required('Required'),
  height: Yup.number().required('Required').min(100, 'Must be at least 100cm').max(250, 'Must be under 250cm'),
  weight: Yup.number().required('Required').min(30, 'Must be at least 30kg').max(300, 'Must be under 300kg'),
  fitnessExperience: Yup.string().required('Required'),
  fitnessGoals: Yup.string().required('Required'),
  dietaryRestrictions: Yup.string(),
  oxygenSaturation: Yup.number().min(80, 'Must be between 80-100%').max(100, 'Must be between 80-100%'),
  bloodPressure: Yup.string().matches(/^\d{1,3}\/\d{1,3}$/, 'Enter valid BP (e.g., 120/80)'),
  waterIntake: Yup.number().min(0.5, 'Must be at least 0.5L').max(10, 'Must be under 10L'),
  calorieIntake: Yup.number().min(500, 'Must be at least 500 kcal').max(10000, 'Must be under 10,000 kcal'),
});

const FitnessForm = () => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const formik = useFormik({
    initialValues: {
      age: '',
      biologicalSex: '',
      height: '',
      weight: '',
      fitnessExperience: '',
      fitnessGoals: '',
      dietaryRestrictions: '',
      oxygenSaturation: '',
      bloodPressure: '',
      waterIntake: '',
      calorieIntake: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError('');
        
        // Filter out empty optional fields
        const payload = Object.fromEntries(
          Object.entries(values).filter(([_, v]) => v !== '')
        );

        const response = await axios.post('/api/generate-plan', payload);
        setPlan(response.data.plan);
      } catch (err) {
        console.error('Error generating plan:', err);
        setError(err.response?.data?.error || 'Failed to generate fitness plan');
      } finally {
        setLoading(false);
      }
    },
  });

  const fitnessExperienceLevels = [
    'Beginner (0-6 months)',
    'Intermediate (6 months - 2 years)',
    'Advanced (2+ years)',
    'Expert (5+ years)'
  ];

  const fitnessGoalsList = [
    'Weight Loss',
    'Muscle Gain',
    'Endurance Training',
    'Strength Training',
    'General Fitness',
    'Sports Performance',
    'Rehabilitation'
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          AI-Powered Fitness & Nutrition Plan
        </Typography>
        
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="age"
                name="age"
                label="Age"
                type="number"
                value={formik.values.age}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.age && Boolean(formik.errors.age)}
                helperText={formik.touched.age && formik.errors.age}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="biologicalSex-label">Biological Sex</InputLabel>
                <Select
                  labelId="biologicalSex-label"
                  id="biologicalSex"
                  name="biologicalSex"
                  value={formik.values.biologicalSex}
                  label="Biological Sex"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.biologicalSex && Boolean(formik.errors.biologicalSex)}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other/Prefer not to say</MenuItem>
                </Select>
                {formik.touched.biologicalSex && formik.errors.biologicalSex && (
                  <Typography color="error" variant="caption">{formik.errors.biologicalSex}</Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="height"
                name="height"
                label="Height (cm)"
                type="number"
                value={formik.values.height}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.height && Boolean(formik.errors.height)}
                helperText={formik.touched.height && formik.errors.height}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="weight"
                name="weight"
                label="Weight (kg)"
                type="number"
                value={formik.values.weight}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.weight && Boolean(formik.errors.weight)}
                helperText={formik.touched.weight && formik.errors.weight}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="fitnessExperience-label">Fitness Experience</InputLabel>
                <Select
                  labelId="fitnessExperience-label"
                  id="fitnessExperience"
                  name="fitnessExperience"
                  value={formik.values.fitnessExperience}
                  label="Fitness Experience"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.fitnessExperience && Boolean(formik.errors.fitnessExperience)}
                >
                  {fitnessExperienceLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
                {formik.touched.fitnessExperience && formik.errors.fitnessExperience && (
                  <Typography color="error" variant="caption">{formik.errors.fitnessExperience}</Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="fitnessGoals-label">Fitness Goals</InputLabel>
                <Select
                  labelId="fitnessGoals-label"
                  id="fitnessGoals"
                  name="fitnessGoals"
                  value={formik.values.fitnessGoals}
                  label="Fitness Goals"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.fitnessGoals && Boolean(formik.errors.fitnessGoals)}
                >
                  {fitnessGoalsList.map((goal) => (
                    <MenuItem key={goal} value={goal}>{goal}</MenuItem>
                  ))}
                </Select>
                {formik.touched.fitnessGoals && formik.errors.fitnessGoals && (
                  <Typography color="error" variant="caption">{formik.errors.fitnessGoals}</Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="dietaryRestrictions"
                name="dietaryRestrictions"
                label="Dietary Restrictions (optional)"
                value={formik.values.dietaryRestrictions}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.dietaryRestrictions && Boolean(formik.errors.dietaryRestrictions)}
                helperText={formik.touched.dietaryRestrictions && formik.errors.dietaryRestrictions}
                margin="normal"
                placeholder="e.g., Vegetarian, Gluten-free, Nut allergies, etc."
              />
            </Grid>
            
            {/* Optional Fields Section */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={showOptional} 
                    onChange={(e) => setShowOptional(e.target.checked)} 
                    color="primary"
                  />
                }
                label="Show advanced health metrics (optional)"
              />
            </Grid>
            
            {showOptional && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="oxygenSaturation"
                    name="oxygenSaturation"
                    label="Oxygen Saturation (%)"
                    type="number"
                    value={formik.values.oxygenSaturation}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.oxygenSaturation && Boolean(formik.errors.oxygenSaturation)}
                    helperText={formik.touched.oxygenSaturation && formik.errors.oxygenSaturation}
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="bloodPressure"
                    name="bloodPressure"
                    label="Blood Pressure (e.g., 120/80)"
                    value={formik.values.bloodPressure}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.bloodPressure && Boolean(formik.errors.bloodPressure)}
                    helperText={formik.touched.bloodPressure && formik.errors.bloodPressure}
                    margin="normal"
                    placeholder="e.g., 120/80"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="waterIntake"
                    name="waterIntake"
                    label="Daily Water Intake (L)"
                    type="number"
                    value={formik.values.waterIntake}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.waterIntake && Boolean(formik.errors.waterIntake)}
                    helperText={formik.touched.waterIntake && formik.errors.waterIntake}
                    margin="normal"
                    step="0.1"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="calorieIntake"
                    name="calorieIntake"
                    label="Daily Calorie Intake (kcal)"
                    type="number"
                    value={formik.values.calorieIntake}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.calorieIntake && Boolean(formik.errors.calorieIntake)}
                    helperText={formik.touched.calorieIntake && formik.errors.calorieIntake}
                    margin="normal"
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Button 
                color="primary" 
                variant="contained" 
                fullWidth 
                type="submit"
                disabled={loading || !formik.isValid}
                sx={{ py: 1.5, mt: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate My Plan'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      {plan && (
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom color="primary">
            Your Personalized Fitness & Nutrition Plan
          </Typography>
          <Box 
            component="div" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              '& h3': { 
                mt: 3, 
                mb: 1.5, 
                color: 'primary.main' 
              },
              '& ul': { 
                pl: 2.5,
                '& li': {
                  mb: 1
                }
              }
            }}
            dangerouslySetInnerHTML={{ 
              __html: plan.replace(/\n\n/g, '<br><br>').replace(/\n/g, ' ').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
            }} 
          />
        </Paper>
      )}
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FitnessForm;
