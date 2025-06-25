import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabaseClient';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        navigate('/login'); // redirect if not logged in
      } else {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  const handleChangePassword = async () => {
    setMessage('');

    if (newPassword.length < 6) {
      return setMessage('Password must be at least 6 characters long.');
    }

    if (newPassword !== confirmPassword) {
      return setMessage('Passwords do not match.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage('✅ Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4 text-center">Change Password</h2>

      <input
        type="password"
        placeholder="New Password"
        className="w-full p-2 border rounded mb-3"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirm New Password"
        className="w-full p-2 border rounded mb-3"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <button
        onClick={handleChangePassword}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        Change Password
      </button>

      {message && (
        <p className="mt-4 text-center text-sm font-semibold text-red-600">{message}</p>
      )}
    </div>
  );
}
