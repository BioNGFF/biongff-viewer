import React from 'react';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';

import { AxisSliders } from './AxisSliders';
import { OpacitySlider } from './OpacitySlider';

export const Controller = ({
  sourceData,
  layerStates,
  resetViewState,
  toggleVisibility,
  setLayerOpacity,
  setLayerSelections,
}) => {
  const controls = layerStates.map((layerState, index) => {
    if (!layerState) {
      return null;
    }
    return (
      <React.Fragment key={layerState.layerProps.id}>
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
        <AxisSliders
          {...sourceData[index]}
          selections={layerState.layerProps.selections}
          onChange={(selections) => setLayerSelections(index, selections)}
        />
        <OpacitySlider
          value={layerState.layerProps.opacity}
          onChange={(e, value) => setLayerOpacity(index, null, value)}
        />
        {layerState.labels?.map((label) => (
          <React.Fragment key={label.layerProps.id}>
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
            <OpacitySlider
              value={label.layerProps.opacity}
              onChange={(e, value) =>
                setLayerOpacity(index, label.layerProps.id, value)
              }
            />
          </React.Fragment>
        ))}
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
