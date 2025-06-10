import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function LoginTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionUser, setSessionUser] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Login error:', error);
      setError(error.message);
    } else {
      console.log('Login successful:', data);
      fetchSession();
    }
  };

  const fetchSession = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      setError(sessionError.message);
    } else {
      console.log('Fetched session:', sessionData);
      setSessionUser(sessionData.session?.user ?? null);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded shadow mt-10">
      <h2 className="text-xl font-bold mb-4">Test Login & Session</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        className="border p-2 w-full mb-2"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        className="border p-2 w-full mb-4"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">
        Login
      </button>

      {error && <p className="mt-2 text-red-600">{error}</p>}

      {sessionUser ? (
        <div className="mt-4 text-green-700">
          <p><strong>Logged in as:</strong> {sessionUser.email}</p>
          <p><strong>User ID:</strong> {sessionUser.id}</p>
        </div>
      ) : (
        <p className="mt-4 text-gray-600">Not logged in.</p>
      )}
    </div>
  );
}
