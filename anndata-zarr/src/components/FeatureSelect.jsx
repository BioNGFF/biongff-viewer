import React, { useState } from 'react';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { List } from 'react-window';

import { useAnndataColors, useAnndataFeatures } from '../hooks';

const RowComponent = ({ index, names, style, onSelect, selectedIndex }) => {
  return (
    <ListItem style={style} key={index} component="div" disablePadding>
      <ListItemButton
        style={{ height: '100%' }}
        onClick={() => onSelect(index)}
        selected={index === selectedIndex}
      >
        <ListItemText primary={names[index]} />
      </ListItemButton>
    </ListItem>
  );
};

export const FeatureSelect = ({
  adata,
  onSelect = () => {},
  selectedIndex = null,
}) => {
  const { data, isLoading, serverError } = useAnndataFeatures(adata);

  if (isLoading) {
    return <></>;
  }
  if (serverError) {
    return <div>Error loading features</div>;
  }
  return (
    <Box
      sx={{
        position: 'absolute',
        right: '1rem',
        top: '1rem',
        width: 250,
        height: 250,
        zIndex: 1,
      }}
    >
      Features
      <List
        rowComponent={RowComponent}
        rowCount={data.length}
        rowHeight={25}
        rowProps={{ names: data, onSelect, selectedIndex }}
      />
    </Box>
  );
};

export const useFeatureSelect = (adata) => {
  const [feature, setFeature] = useState(null);

  const { data, isLoading, serverError } = useAnndataColors([
    {
      url: adata.url,
      matrixProps: {
        feature: feature,
      },
    },
  ]);

  const featureSelect = (
    <FeatureSelect
      adata={adata}
      onSelect={(index) => {
        setFeature({
          index,
        });
      }}
      selectedIndex={feature?.index}
    />
  );

  return { featureData: { data, isLoading, serverError }, featureSelect };
};
