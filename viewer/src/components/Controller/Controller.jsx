import React from 'react';

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';

import { AxisSliders } from './AxisSliders';
import { ChannelControllers } from './ChannelControllers';
import { OpacitySlider } from './OpacitySlider';

export const Controller = ({
  sourceData,
  layerStates,
  isLabel,
  resetViewState,
  toggleVisibility,
  setLayerOpacity,
  setLayerSelections,
  toggleChannelVisibility,
  setChannelContrast,
  copyLink,
  toggleOverview,
  overviewOn,
}) => {
  const [hiddenMenu, toggleMenuView] = React.useReducer((v) => !v, false);

  const controls = layerStates.map((layerState, index) => {
    if (!layerState || hiddenMenu) {
      return null;
    }

    const lowest_level = sourceData[index]?.loader[0].shape, levels = sourceData[index]?.loader.length;
    return (
      <React.Fragment key={layerState.layerProps.id}>
      <Box
          style= {{width: "290px",
              border: "3px solid white",
              padding: "25px",
              paddingTop: "0px",
              marginTop: "10px",
              backgroundColor: "black"
              }}>
        <h3 style={{color: "red", marginBottom: "0px", marginTop: "20px"}}>
            Source {index} </h3>
        {lowest_level && <p> Pyramid height: {levels} <br/> Full size: {lowest_level[lowest_level.length - 1]}x{lowest_level[lowest_level.length - 2]}</p>}
        {!isLabel[index] && (
          <>
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
            <Divider>Channels</Divider>
            <ChannelControllers
              {...sourceData[index]}
              {...layerState}
              toggleChannelVisibility={(i) => toggleChannelVisibility(index, i)}
              setChannelContrast={(i, contrast) =>
                setChannelContrast(index, i, contrast)
              }
            />
          </>
        )}
        {layerState.labels?.length && <Divider>Labels</Divider>}
        {layerState.labels?.map((label, i) => {
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
              {i > 0 && <Divider />}
              <FormControlLabel
                key={label.layerProps.id}
                label={`${sourceData[index].labels[i].name ? sourceData[index].labels[i].name : label.layerProps.id + " (label)"}`}
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
              <OpacitySlider
                value={label.layerProps.opacity}
                onChange={(_e, value) =>
                  setLayerOpacity(index, label.layerProps.id, value)
                }
              />
            </React.Fragment>
          );
        })}
      </Box>
      </React.Fragment>
    );
  });

  return (
    <div className="viewer-controller" style={(hiddenMenu ? {height: "0%"} : {})}>
      <Stack spacing={2}>
        <FormGroup>{controls}</FormGroup>
      </Stack>
      <Grid container spacing={2} style={{position: "fixed", bottom: "0", left: "0", width: "400px", padding: "25px"}}>
        <Grid size={5}>
        <button type="button" className="btn" onClick={resetViewState} style={{height: "100%"}}>
          Reset current view
        </button>
        </Grid>
        <Grid size={5}>
        <button type="button" className="btn" onClick={copyLink}>
          Copy link with current view
        </button>
        </Grid>
        <Grid size={5}>
        <button type="button" className="btn" onClick={toggleOverview} style={{height: "100%"}}>
          {!overviewOn ? "Show" : "Hide"} overview
        </button>
        </Grid>
        <Grid size={5}>
        <button type="button" className="btn" onClick={toggleMenuView}>
          {hiddenMenu ? "Show" : "Hide"} channel controls
        </button>
        </Grid>
      </Grid>
    </div>
  );
};
