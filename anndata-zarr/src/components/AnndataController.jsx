import React from 'react';

import Stack from '@mui/material/Stack';

import { FeatureSelect } from './FeatureSelect';
import { ObsSelect } from './ObsSelect';

export const AnndataController = ({ adata, callback = () => {} }) => {
  return (
    <Stack sx={{ height: '100%' }} spacing={2}>
      <FeatureSelect adata={adata} callback={callback} />
      <ObsSelect adata={adata} callback={callback} />
    </Stack>
  );
};
