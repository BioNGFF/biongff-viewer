import React from 'react';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';

import { AxisSliders } from './AxisSliders';
import { ChannelController } from './ChannelController';
import { OpactiySlider } from './OpacitySlider';

export const Controller = ({
  sourceData,
  layerStates,
  resetViewState,
  toggleVisibility,
  setLayerOpacity,
  setLayerSelections,
  toggleChannelVisibility,
  setChannelContrast,
}) => {
  const controls = layerStates.map((layerState, index) => {
    if (!layerState) {
      return null;
    }
    const nChannels = layerState.layerProps.selections.length;
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
        <OpactiySlider
          value={layerState.layerProps.opacity}
          onChange={(e, value) => setLayerOpacity(index, null, value)}
        />
        <Divider>Channels</Divider>
        <Grid>
          {[...Array(nChannels).keys()].map((i) => (
            <ChannelController
              key={i}
              {...sourceData[index]}
              selections={layerState.layerProps.selections[i]}
              contrastLimits={layerState.layerProps.contrastLimits[i]}
              contrastLimitsRange={layerState.layerProps.contrastLimitsRange[i]}
              channelVisible={layerState.layerProps.channelsVisible[i]}
              colormap={layerState.layerProps.colormap}
              colors={layerState.layerProps.colors[i]}
              toggleChannelVisibility={() => toggleChannelVisibility(index, i)}
              setChannelContrast={(cl) => setChannelContrast(index, i, cl)}
            />
          ))}
        </Grid>
        {layerState.labels?.length && <Divider>Labels</Divider>}
        {layerState.labels?.map((label, i) => (
          <React.Fragment key={label.layerProps.id}>
            {i > 0 && <Divider />}
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
            <OpactiySlider
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
        <FormGroup>{controls}</FormGroup>
        <button type="button" className="btn" onClick={resetViewState}>
          Reset view
        </button>
      </Stack>
    </div>
  );
};
