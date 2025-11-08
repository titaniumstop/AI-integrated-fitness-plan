import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, Container, Grid, Tabs, Tab, useMediaQuery } from '@mui/material';
import FitnessForm from './components/FitnessForm';
import Chatbot from './components/Chatbot';
import InsightsPanel from './components/InsightsPanel';

const theme = createTheme({
  palette: {
    primary: { main: '#7C3AED' },
    secondary: { main: '#06B6D4' },
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    background: { default: '#F8FAFC' },
    text: { primary: '#111827', secondary: '#4B5563' },
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
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileTab, setMobileTab] = React.useState(0);

  const handlePlanGenerated = ({ values, plan, summary }) => {
    setProfile(values);
    setPlan(plan || '');
    setSummary(summary || '');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="inherit" elevation={1} sx={{ backdropFilter: 'saturate(180%) blur(8px)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
            Fitness Planner
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ minHeight: '100vh', py: { xs: 2, md: 4 } }}>
        <Container maxWidth="lg">
          {isDesktop ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FitnessForm onPlanGenerated={handlePlanGenerated} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <InsightsPanel planText={plan} summaryText={summary} waterIntakeLiters={profile?.waterIntake} />
                  <Chatbot profile={profile} plan={plan} />
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Box>
              <Tabs
                value={mobileTab}
                onChange={(_, v) => setMobileTab(v)}
                variant="fullWidth"
                aria-label="Mobile sections"
                sx={{ mb: 2 }}
              >
                <Tab label="Form" id="tab-0" aria-controls="panel-0" />
                <Tab label="Insights" id="tab-1" aria-controls="panel-1" />
                <Tab label="Chat" id="tab-2" aria-controls="panel-2" />
              </Tabs>
              <Box role="tabpanel" hidden={mobileTab !== 0} id="panel-0" aria-labelledby="tab-0">
                {mobileTab === 0 && (
                  <FitnessForm onPlanGenerated={handlePlanGenerated} />
                )}
              </Box>
              <Box role="tabpanel" hidden={mobileTab !== 1} id="panel-1" aria-labelledby="tab-1">
                {mobileTab === 1 && (
                  <InsightsPanel planText={plan} summaryText={summary} waterIntakeLiters={profile?.waterIntake} />
                )}
              </Box>
              <Box role="tabpanel" hidden={mobileTab !== 2} id="panel-2" aria-labelledby="tab-2">
                {mobileTab === 2 && (
                  <Chatbot profile={profile} plan={plan} />
                )}
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
