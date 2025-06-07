import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function PhoneLogin() {
  const { supabase } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password
    });
    if (error) alert(error.message);
  };

  return (
    <div className="p-4 space-y-2 max-w-sm mx-auto">
      <h2 className="text-xl font-semibold">Login with Phone</h2>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full border p-2 rounded" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border p-2 rounded" />
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Login</button>
    </div>
  );
}
