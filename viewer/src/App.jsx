import React from 'react';

import './App.css';
import { Viewer } from './components/Viewer.jsx';

function App() {
  const url = new URL(window.location.href);

  const sources = url.searchParams.getAll('source');
  const channelAxis = url.searchParams.getAll('channelAxis');
  const isLabel = url.searchParams
    .getAll('isLabel', 0)
    .map((v) => !!parseInt(v));

  return (
    <>
      <Viewer sources={sources} channelAxis={channelAxis} isLabel={isLabel} />
    </>
  );
}

export default App;
