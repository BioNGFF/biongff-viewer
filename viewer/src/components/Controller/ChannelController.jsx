import React from 'react';

import { RadioButtonChecked, RadioButtonUnchecked } from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

export const ChannelController = ({
  channel_axis,
  names,
  selections,
  contrastLimits,
  contrastLimitsRange,
  channelVisible,
  colormap,
  colors,
  toggleChannelVisibility,
  setChannelContrast,
}) => {
  // from vizarr ChannelController
  const value = [...contrastLimits];
  const color = `rgb(${colormap ? [255, 255, 255] : colors})`;
  const on = channelVisible;
  const [min, max] = contrastLimitsRange;

  const nameIndex = Number.isInteger(channel_axis)
    ? selections[channel_axis]
    : 0;
  const label = names[nameIndex];

  return (
    <>
      <Grid container justifyContent="space-between">
        <Typography>{label}</Typography>
      </Grid>
      <Grid container spacing={2}>
        <Grid display="flex" justifyContent="center" alignItems="center">
          <IconButton
            style={{
              color,
              padding: 0,
              backgroundColor: 'transparent',
            }}
            onClick={toggleChannelVisibility}
          >
            {on ? <RadioButtonChecked /> : <RadioButtonUnchecked />}
          </IconButton>
        </Grid>
        <Grid
          size="grow"
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <Slider
            size="small"
            value={value}
            min={min}
            max={max}
            step={0.01}
            style={{
              padding: 0,
              color,
            }}
            onChange={(_e, v) => setChannelContrast(v)}
          />
        </Grid>
      </Grid>
    </>
  );
};
