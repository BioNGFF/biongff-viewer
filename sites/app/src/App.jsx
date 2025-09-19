import React, { useMemo, useState } from 'react';

import { AnndataProvider, AnndataController } from '@biongff/anndata-zarr';
import { Viewer, parseMatrix } from '@biongff/viewer';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  typography: {
    fontSize: 12,
  },
});

function App() {
  return (
    <AnndataProvider>
      <Page />
    </AnndataProvider>
  );
}

function Page() {
  const urlString = window.location.href;

  const { sources, channelAxis, isLabel, modelMatrices, anndatas } =
    useMemo(() => {
      const url = new URL(urlString);
      const { searchParams } = url;
      return {
        sources: searchParams.getAll('source'),
        channelAxis: searchParams.getAll('channelAxis').map((v) => parseInt(v)),
        isLabel: searchParams.getAll('isLabel', 0).map((v) => !!parseInt(v)),
        modelMatrices: searchParams
          .getAll('modelMatrix')
          .map((v) => parseMatrix(v)),
        anndatas: searchParams
          .getAll('anndata')
          .map((v) => (v ? { url: v } : null)),
      };
    }, [urlString]);

  const [colors, setColors] = useState(() => Array(sources.length).fill(null));

  const selectCallback = (colorData, i) => {
    setColors((prev) => {
      return prev.map((c, ci) => (ci === i ? colorData : c));
    });
  };

  const anndataControllers = useMemo(() => {
    return sources.map((_s, i) => {
      if (!anndatas?.[i]?.url) return null;
      return (
        <AnndataController
          key={i}
          adata={anndatas[i]}
          callback={(colorData) => selectCallback(colorData, i)}
        />
      );
    });
  }, [anndatas, sources]);

  return (
    <>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="container-right">{anndataControllers}</div>
        <Viewer
          sources={sources}
          channelAxis={channelAxis}
          isLabel={isLabel}
          modelMatrices={modelMatrices}
          colors={colors}
        />
      </ThemeProvider>
    </>
  );
}

export default App;
