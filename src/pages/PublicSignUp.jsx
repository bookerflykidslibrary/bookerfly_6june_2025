import { useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function PublicSignup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    child1_name: '',
    child1_dob: '',
    child2_name: '',
    child2_dob: '',
    address: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting:', { ...form, status: 'PENDING' });
    const { error } = await supabase.from('SignUpRequests').insert([{ ...form, status: 'PENDING' }]);

    if (error) {
      alert('Failed to submit request');
      console.error(error);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
        <div className="p-6 text-green-700 text-lg">
          Thank you! Your signup request has been submitted. We will contact you for further action. Thanks for your patience.
        </div>
    );
  }

  return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Sign Up for Bookerfly Library</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your Name" className="w-full border p-2 rounded" required />
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full border p-2 rounded" required />
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile Number" className="w-full border p-2 rounded" required />

          <input type="text" name="child1_name" value={form.child1_name} onChange={handleChange} placeholder="Child 1 Name" className="w-full border p-2 rounded" required />
          <input type="date" name="child1_dob" value={form.child1_dob} onChange={handleChange} placeholder="Child 1 DOB" className="w-full border p-2 rounded" required />

          <input type="text" name="child2_name" value={form.child2_name} onChange={handleChange} placeholder="Child 2 Name (optional)" className="w-full border p-2 rounded" />
          <input type="date" name="child2_dob" value={form.child2_dob} onChange={handleChange} placeholder="Child 2 DOB (optional)" className="w-full border p-2 rounded" />

          <textarea name="address" value={form.address} onChange={handleChange} placeholder="Your Address" className="w-full border p-2 rounded" required />
          <textarea name="message" value={form.message} onChange={handleChange} placeholder="Optional Message" className="w-full border p-2 rounded" />

          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Submit Request
          </button>
        </form>
      </div>
  );
}
