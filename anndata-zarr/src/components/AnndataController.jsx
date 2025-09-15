import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { FeatureSelect } from './FeatureSelect';
import { ObsSelect } from './ObsSelect';

export const AnndataController = ({ adata, callback = () => {} }) => {
  const [feature, setFeature] = useState(null);
  const [obsCol, setObsCol] = useState(null);

  const handleFeatureSelect = (f) => {
    setFeature(f);
    setObsCol(null);
  };

  const handleObsSelect = (o) => {
    setObsCol(o);
    setFeature(null);
  };

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ height: '50%' }}>
        <FeatureSelect
          adata={adata}
          callback={callback}
          feature={feature}
          onSelect={handleFeatureSelect}
        />
      </Box>
      <Box sx={{ height: '50%' }}>
        <ObsSelect
          adata={adata}
          callback={callback}
          obsCol={obsCol}
          onSelect={handleObsSelect}
        />
      </Box>
    </Stack>
  );
};
