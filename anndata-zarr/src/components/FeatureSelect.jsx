import React, { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { List } from 'react-window';

import { useAnndataColors, useAnndataFeatures } from '../hooks';

const RowComponent = ({ index, items, style, onSelect, selectedIndex }) => {
  return (
    <ListItem style={style} key={index} component="div" disablePadding>
      <ListItemButton
        style={{ height: '100%' }}
        onClick={() => onSelect(items[index].matrixIndex)}
        selected={items[index].matrixIndex === selectedIndex}
      >
        <ListItemText primary={items[index].name} />
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
  const [searchTerm, setSearchTerm] = useState('');

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
        rowProps={{ items, onSelect, selectedIndex }}
      />
    </Box>
  );
};

export const useFeatureSelect = ({ adata, onSelect = () => {} }) => {
  const [feature, setFeature] = useState(null);

  const { data, isLoading, serverError } = useAnndataColors(
    {
      url: adata.url,
      matrixProps: {
        feature: feature,
      },
    },
    { enabled: !!feature },
  );

  const featureSelect = (
    <FeatureSelect
      adata={adata}
      onSelect={(index) => {
        setFeature({
          index,
        });
        onSelect();
      }}
      selectedIndex={feature?.index}
    />
  );

  return { featureData: { data, isLoading, serverError }, featureSelect };
};
