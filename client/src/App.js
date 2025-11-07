import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import FitnessForm from './components/FitnessForm';
import Chatbot from './components/Chatbot';

const theme = createTheme({
  palette: {
    primary: { main: '#7C3AED' },
    secondary: { main: '#06B6D4' },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    background: { default: '#0F172A' },
    text: { primary: '#E2E8F0', secondary: '#94A3B8' },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 600,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-input': {
            fontSize: '1rem',
          },
          width: '100%',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
        fullWidth: true,
        InputLabelProps: { shrink: true },
      },
    },
    MuiSelect: {
      defaultProps: {
        fullWidth: true,
      },
    },
    MuiFormControl: {
      defaultProps: {
        fullWidth: true,
        variant: 'outlined',
        size: 'medium',
      },
    },
  },
});

function App() {
  const [profile, setProfile] = React.useState(null);
  const [plan, setPlan] = React.useState('');
  const [summary, setSummary] = React.useState('');

  const handlePlanGenerated = ({ values, plan, summary }) => {
    setProfile(values);
    setPlan(plan || '');
    setSummary(summary || '');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0F172A 0%, #111827 35%, #1F2937 100%)',
          py: { xs: 2, md: 4 },
        }}
      >
        <FitnessForm onPlanGenerated={handlePlanGenerated} />
        <Box sx={{ mt: { xs: 2, md: 4 }, px: { xs: 2, md: 0 } }}>
          <Chatbot profile={profile} plan={plan} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
