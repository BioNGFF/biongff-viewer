import React from 'react';

import './App.css';
import { Viewer } from './components/Viewer.jsx';

function App() {
  const url = new URL(window.location.href);

  const sources = url.searchParams.getAll('source');
  const channelAxis = url.searchParams.getAll('channelAxis');
  const isLabel = !!parseInt(url.searchParams.getAll('isLabel', 0));

  return (
    <>
      <Viewer sources={sources} channelAxis={channelAxis} isLabel={isLabel} />
    </>
  );
}

export default App;
