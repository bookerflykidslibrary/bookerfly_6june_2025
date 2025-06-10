import { useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailLogin, setIsEmailLogin] = useState(true);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    let result;
    if (isEmailLogin) {
      result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    } else {
      result = await supabase.auth.signInWithPassword({
        phone,
        password,
      });
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      window.location.href = '/catalog'; // redirect after login
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 mt-10 border rounded shadow">
      <h1 className="text-xl font-bold mb-4 text-center">Login</h1>

      <div className="mb-4">
        <label>
          <input
            type="radio"
            name="loginType"
            checked={isEmailLogin}
            onChange={() => setIsEmailLogin(true)}
          />
          Email
        </label>
        <label className="ml-4">
          <input
            type="radio"
            name="loginType"
            checked={!isEmailLogin}
            onChange={() => setIsEmailLogin(false)}
          />
          Phone
        </label>
      </div>

      <form onSubmit={handleLogin}>
        {isEmailLogin ? (
          <input
            type="email"
            placeholder="Email"
            className="w-full mb-2 p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <input
            type="tel"
            placeholder="Phone (e.g. +911234567890)"
            className="w-full mb-2 p-2 border rounded"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
