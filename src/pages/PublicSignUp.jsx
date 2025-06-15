// src/pages/PublicSignup.jsx
import { useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function PublicSignup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    child_name: '',
    child_age: '',
    address: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('SignUpRequests').insert([{ ...form, status: 'pending' }]);

    if (error) {
      alert('Failed to submit request');
      console.error(error);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return <div className="p-6 text-green-700 text-lg">Thank you! Your signup request has been submitted.</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign Up for Bookerfly Library</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your Name" className="w-full border p-2 rounded" required />
        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full border p-2 rounded" required />
        <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile Number" className="w-full border p-2 rounded" required />
        <input type="text" name="child_name" value={form.child_name} onChange={handleChange} placeholder="Child's Name" className="w-full border p-2 rounded" required />
        <input type="number" name="child_age" value={form.child_age} onChange={handleChange} placeholder="Child's Age" className="w-full border p-2 rounded" required />
        <textarea name="address" value={form.address} onChange={handleChange} placeholder="Your Address" className="w-full border p-2 rounded" required />
        <textarea name="message" value={form.message} onChange={handleChange} placeholder="Optional Message" className="w-full border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit Request</button>
      </form>
    </div>
  );
}
