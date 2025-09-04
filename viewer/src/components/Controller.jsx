import React from 'react';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';

const OpactiySlider = ({ value, onChange }) => (
  <Slider
    size="small"
    min={0}
    max={1}
    step={0.01}
    value={value}
    onChange={onChange}
  />
);

export const Controller = ({
  layerStates,
  isLabel,
  resetViewState,
  toggleVisibility,
  setLayerOpacity,
}) => {
  const controls = layerStates.map((layerState, index) => {
    if (!layerState) {
      return null;
    }
    return (
      <React.Fragment key={layerState.layerProps.id}>
        <p>Source {index}</p>
        {!isLabel[index] && (
          <>
            <FormControlLabel
              key={layerState.layerProps.id}
              label={layerState.layerProps.id}
              control={
                <Checkbox
                  label={layerState.layerProps.id}
                  checked={layerState.on}
                  icon={<VisibilityOffIcon />}
                  checkedIcon={<VisibilityIcon />}
                  onChange={() => toggleVisibility(index)}
                />
              }
            />
            <OpactiySlider
              value={layerState.layerProps.opacity}
              onChange={(e, value) => setLayerOpacity(index, null, value)}
            />
          </>
        )}
        {layerState.labels?.map((label) => {
          // if standalone label visibility is from image layer
          const { id, on } = isLabel[index]
            ? {
                id: null,
                on: layerState.on,
              }
            : {
                id: label.layerProps.id,
                on: label.on,
              };
          return (
            <React.Fragment key={label.layerProps.id}>
              <FormControlLabel
                key={label.layerProps.id}
                label={`${label.layerProps.id} (label)`}
                control={
                  <Checkbox
                    label={label.layerProps.id}
                    checked={on}
                    icon={<VisibilityOffIcon />}
                    checkedIcon={<VisibilityIcon />}
                    onChange={() => toggleVisibility(index, id)}
                  />
                }
              />
              <OpactiySlider
                value={label.layerProps.opacity}
                onChange={(_e, value) =>
                  setLayerOpacity(index, label.layerProps.id, value)
                }
              />
            </React.Fragment>
          );
        })}
      </React.Fragment>
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
