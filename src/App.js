import { useEffect, useState } from 'react';
import supabase from './utils/supabaseClient';
import Catalog from './pages/Catalog';
import Login from './pages/Login';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div>
      {user ? <Catalog user={user} /> : <Login onLogin={setUser} />}
    </div>
  );
}

export default App;
