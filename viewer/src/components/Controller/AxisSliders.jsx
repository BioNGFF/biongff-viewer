import React, { useEffect, useState } from 'react';

import Grid from '@mui/material/Grid';
import Input from '@mui/material/Input';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

const AxisSlider = ({ axis_labels, axisIndex, selections, max, onChange }) => {
  const [value, setValue] = useState(0);
  const axisLabel = axis_labels[axisIndex];

  useEffect(() => {
    setValue(selections[0]?.[axisIndex] || 1);
  }, [selections, axisIndex]);

  const setSelections = (v = value) => {
    onChange(
      selections.map((s) => {
        s[axisIndex] = v;
        return s;
      }),
    );
  };

  return (
    <>
      <Grid container spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Typography>{axisLabel}</Typography>
        <Input
          value={value}
          size="small"
          onChange={(e) => {
            setSelections(Number(e.target.value));
          }}
          inputProps={{
            step: 1,
            min: 0,
            max: max,
            type: 'number',
          }}
        />
      </Grid>
      <Slider
        size="small"
        min={0}
        max={max}
        value={value}
        onChange={(_e, v) => setValue(v)}
        onChangeCommitted={() => setSelections()}
      />
    </>
  );
};

export const AxisSliders = ({
  axis_labels,
  channel_axis,
  loader,
  selections,
  onChange,
}) => {
  // from vizarr AxisSliders
  const sliders = axis_labels
    .slice(0, -2) // ignore last two axes, [y,x]
    .map((name, i) => [name, i, loader[0].shape[i]]) // capture the name, index, and size of non-yx dims
    .filter((d) => {
      if (d[1] === channel_axis) return false; // ignore channel_axis (for OME-Zarr channel_axis === 1)
      if (d[2] > 1) return true; // keep if size > 1
      return false; // otherwise ignore as well
    })
    .map(([name, i, size]) => (
      <AxisSlider
        selections={selections}
        key={name}
        axis_labels={axis_labels}
        axisIndex={i}
        max={size - 1}
        step={1}
        onChange={onChange}
      />
    ));

  return <>{sliders}</>;
};
