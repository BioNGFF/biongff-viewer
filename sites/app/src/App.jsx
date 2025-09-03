import React from 'react';
import './App.css';
import { Viewer, parseMatrix } from '@biongff/viewer';

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
    <>
      <Viewer
        sources={sources}
        channelAxis={channelAxis}
        isLabel={isLabel}
        modelMatrices={modelMatrices}
      />
    </>
  );
}

export default App;
