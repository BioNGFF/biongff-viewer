import React from 'react';

import { parseMatrix } from '@hms-dbmi/vizarr/src/utils';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { Viewer } from './components/Viewer.jsx';
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
  const url = new URL(window.location.href);

  const sources = url.searchParams.getAll('source');
  const channelAxis = url.searchParams.getAll('channelAxis');
  const isLabel = url.searchParams
    .getAll('isLabel', 0)
    .map((v) => !!parseInt(v));
  const modelMatrices = url.searchParams
    .getAll('modelMatrix')
    .map((v) => parseMatrix(v));

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <Viewer
          sources={sources}
          channelAxis={channelAxis}
          isLabel={isLabel}
          modelMatrices={modelMatrices}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
