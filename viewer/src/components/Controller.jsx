import React from 'react';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';

export const Controller = ({
  layerStates,
  resetViewState,
  toggleVisibility,
}) => {
  const controls = layerStates.map((layerState, index) => {
    if (!layerState) {
      return <></>;
    }
    return (
      <>
        <p>Source {index}</p>
        <FormControlLabel
          key={layerState.layerProps.id}
          label={layerState.layerProps.id}
          control={
            <Checkbox
              label={layerState.id}
              checked={layerState.on}
              icon={<VisibilityOffIcon />}
              checkedIcon={<VisibilityIcon />}
              onChange={() => toggleVisibility(index)}
            />
          }
        />
        {layerState.labels?.map((label) => (
          <FormControlLabel
            key={label.layerProps.id}
            label={`${label.layerProps.id} (label)`}
            control={
              <Checkbox
                label={label.layerProps.id}
                checked={label.on}
                icon={<VisibilityOffIcon />}
                checkedIcon={<VisibilityIcon />}
                onChange={() => toggleVisibility(index, label.layerProps.id)}
              />
            }
          />
        ))}
      </>
    );
  });

  return (
    <div className="viewer-controller">
      <Stack spacing={2}>
        <p>Layers</p>
        <FormGroup>{controls}</FormGroup>
        <button type="button" className="btn" onClick={resetViewState}>
          Reset view
        </button>
      </Stack>
    </div>
  );
};
