import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const gradients = {
  strength: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
  cardio: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
  mobility: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
};

function ExerciseCard({ title, subtitle, type = 'strength', icon }) {
  return (
    <Card
      elevation={6}
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        background: gradients[type] || gradients.strength,
        color: '#F8FAFC',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {icon && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, p: 0.75, display: 'inline-flex' }}>
              {icon}
            </Box>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default ExerciseCard;
