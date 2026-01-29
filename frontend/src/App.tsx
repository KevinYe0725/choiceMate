import { useEffect, useMemo, useState } from 'react';
import HomePage from './pages/HomePage';
import ConversationPage from './pages/ConversationPage';

export type RouteState =
  | { name: 'home' }
  | { name: 'conversation'; id: string };

const parseHash = (): RouteState => {
  const raw = window.location.hash.replace('#', '');
  if (raw.startsWith('/conversation/')) {
    const id = raw.replace('/conversation/', '').trim();
    if (id) {
      return { name: 'conversation', id };
    }
  }
  return { name: 'home' };
};

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useMemo(
    () => ({
      toHome: () => {
        window.location.hash = '/';
      },
      toConversation: (id: string) => {
        window.location.hash = `/conversation/${id}`;
      }
    }),
    []
  );

  return (
    <div className="app">
      {route.name === 'home' && <HomePage navigate={navigate} />}
      {route.name === 'conversation' && (
        <ConversationPage conversationId={route.id} navigate={navigate} />
      )}
    </div>
  );
}
