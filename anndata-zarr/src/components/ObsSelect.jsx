import React, { useState } from 'react';

import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import { COLORSCALES } from '../constants/colorscales';
import { useAnndataColors, useAnndataObs } from '../hooks';
import { getColor } from '../utils';

const CategoricalCol = ({ col, showColor = false }) => {
  const [open, setOpen] = useState(false);
  const { categories } = col;

  return (
    <Box>
      <Box
        onClick={() => setOpen(!open)}
        sx={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Radio size="small" onClick={(e) => e.stopPropagation()} />
            }
            label={col.name}
            key={col.name}
            value={col.name}
          />
          {open ? <ExpandLess /> : <ExpandMore />}
        </Box>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List>
          {categories.length > 100 && (
            <Alert severity="warning" variant="outlined">
              Truncated to 100 categories
            </Alert>
          )}
          {categories.slice(0, 100).map((cat, i) => (
            <ListItem key={cat} sx={{ pl: 4 }} disablePadding>
              {showColor && (
                <ListItemIcon sx={{ minWidth: 0, mr: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      bgcolor: `rgba(${getColor({ value: i / (categories.length - 1), colorscale: COLORSCALES.Accent })})`,
                    }}
                  ></Box>
                </ListItemIcon>
              )}
              <ListItemText primary={cat} />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );
};

const NumericalCol = ({ col }) => {
  return (
    <FormControlLabel
      control={<Radio size="small" />}
      label={col.name}
      key={col.name}
      value={col.name}
    />
  );
};

export const ObsSelect = ({
  adata,
  onSelect = () => {},
  selectedCol = null,
}) => {
  const { data, isLoading, serverError } = useAnndataObs(adata);

  if (isLoading) {
    return <></>;
  }
  if (serverError) {
    return <div>Error loading obs</div>;
  }
  return (
    <Box
      sx={{
        position: 'absolute',
        right: '1rem',
        bottom: '1rem',
        width: 250,
        height: '50%',
        zIndex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      Observations
      <FormControl>
        <RadioGroup
          value={selectedCol}
          onChange={(e) => onSelect(e.target.value)}
        >
          <Divider>Categorical</Divider>
          {data.categorical.map((col) => (
            <CategoricalCol
              key={col.name}
              col={col}
              showColor={selectedCol === col.name}
            />
          ))}
          <Divider>Numerical</Divider>
          {data.numerical.map((col) => (
            <NumericalCol key={col.name} col={col} />
          ))}
        </RadioGroup>
      </FormControl>
    </Box>
  );
};

export const useObsSelect = ({ adata, onSelect = () => {} }) => {
  const [obsCol, setObsCol] = useState(null);

  const { data, isLoading, serverError } = useAnndataColors(
    {
      url: adata.url,
      matrixProps: {
        obs: { col: obsCol },
      },
    },
    { enabled: !!obsCol },
  );

  const obsSelect = (
    <ObsSelect
      adata={adata}
      onSelect={(col) => {
        setObsCol(col);
        onSelect(col);
      }}
      selectedCol={obsCol}
    />
  );

  return { obsData: { data, isLoading, serverError }, obsSelect };
};
