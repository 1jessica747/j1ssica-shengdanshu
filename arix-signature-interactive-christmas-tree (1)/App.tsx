import React, { useState } from 'react';
import { Experience } from './components/Experience';
import { UI } from './components/UI';

const App: React.FC = () => {
  const [isFormed, setIsFormed] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-emerald-950">
      <Experience isFormed={isFormed} />
      <UI onIgnite={() => setIsFormed(true)} isFormed={isFormed} onScatter={() => setIsFormed(false)} />
    </div>
  );
};

export default App;