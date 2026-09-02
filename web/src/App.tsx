import { useState } from 'react';
import { ToastProvider } from './ui/kit.js';
import { RosterScreen } from './screens/RosterScreen.js';
import { CalendarsScreen } from './screens/CalendarsScreen.js';
import { IterationsScreen } from './screens/IterationsScreen.js';
import { IterationWorkspace } from './screens/IterationWorkspace.js';
import { ReportScreen } from './screens/ReportScreen.js';

type Screen = 'roster' | 'calendars' | 'iterations' | 'workspace' | 'report';

const NAV: [Screen, string][] = [
  ['iterations', 'Iterations'],
  ['roster', 'Team & Settings'],
  ['calendars', 'Holiday Calendars'],
  ['report', 'Report'],
];

export function App() {
  const [screen, setScreen] = useState<Screen>('iterations');
  const [activeIterationId, setActiveIterationId] = useState<string | null>(null);

  const open = (id: string) => {
    setActiveIterationId(id);
    setScreen('workspace');
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <nav className="nav">
          <h1>Scrum Master</h1>
          {NAV.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={screen === key ? 'active' : ''}
              data-testid={`nav-${key}`}
              onClick={() => setScreen(key)}
            >
              {label}
            </button>
          ))}
          {activeIterationId && (
            <button
              type="button"
              className={screen === 'workspace' ? 'active' : ''}
              data-testid="nav-workspace"
              onClick={() => setScreen('workspace')}
            >
              Current iteration
            </button>
          )}
          <div className="active-iter">
            {activeIterationId ? 'An iteration is open' : 'No iteration open'}
          </div>
        </nav>
        <main className="content">
          {screen === 'roster' && <RosterScreen />}
          {screen === 'calendars' && <CalendarsScreen />}
          {screen === 'iterations' && <IterationsScreen onOpen={open} />}
          {screen === 'workspace' && activeIterationId && (
            <IterationWorkspace iterationId={activeIterationId} onClosed={() => setScreen('iterations')} />
          )}
          {screen === 'report' && <ReportScreen />}
        </main>
      </div>
    </ToastProvider>
  );
}
