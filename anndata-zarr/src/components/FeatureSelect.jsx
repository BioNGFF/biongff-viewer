import React, { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { List } from 'react-window';

import { useAnndataColors, useAnndataFeatures } from '../hooks';
import { Legend } from './Legend';

const RowComponent = ({ index, items, style, onSelect, selectedIndex }) => {
  return (
    <ListItem style={style} key={index} component="div" disablePadding>
      <ListItemButton
        style={{ height: '100%' }}
        onClick={() => onSelect({ index: items[index].matrixIndex })}
        selected={items[index].matrixIndex === selectedIndex}
      >
        <ListItemText primary={items[index].name} />
      </ListItemButton>
    </ListItem>
  );
};

export const FeatureSelect = ({
  adata,
  feature,
  onSelect,
  callback = () => {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, serverError } = useAnndataFeatures(adata);
  const colorData = useAnndataColors(
    {
      ...adata,
      matrixProps: {
        feature: feature,
      },
    },
    { enabled: !!feature },
  );

  useEffect(() => {
    if (colorData?.serverError) {
      callback(null);
      return;
    }
    if (!colorData?.isLoading && colorData?.data) {
      callback(colorData.data.colors);
    }
  }, [colorData, callback]);

  const items = useMemo(() => {
    if (!data) return [];
    const allItems = data.map((name, index) => ({
      name,
      matrixIndex: index,
    }));
    if (!searchTerm) return allItems;
    return allItems.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  const legend = useMemo(() => {
    if (colorData?.serverError || colorData?.isLoading || !colorData?.data) {
      return null;
    }
    const { min, max, colorscale } = colorData.data;
    return <Legend min={min} max={max} colorscale={colorscale} />;
  }, [colorData.data, colorData?.isLoading, colorData?.serverError]);

  if (isLoading) {
    return <></>;
  }
  if (serverError) {
    return <div>Error loading features</div>;
  }
  return (
    <Box
      sx={{
        width: 250,
        height: '100%',
        minHeight: 250,
        zIndex: 1,
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <TextField
          label="Search features"
          type="search"
          variant="filled"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <List
          rowComponent={RowComponent}
          rowCount={items.length}
          rowHeight={25}
          rowProps={{
            items,
            onSelect,
            selectedIndex: feature?.index,
          }}
        />
        {!!feature && legend}
      </Stack>
    </Box>
  );
};
