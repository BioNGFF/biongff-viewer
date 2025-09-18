import React from 'react';

import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

export const OpacitySlider = ({ value, onChange }) => (
  <Grid container>
    <Typography>Opacity</Typography>
    <Slider
      size="small"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={onChange}
    />
  </Grid>
);
