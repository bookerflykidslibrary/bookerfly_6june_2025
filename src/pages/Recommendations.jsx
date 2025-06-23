import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function AdminSignUpRequests() {
  const [requests, setRequests] = useState([]);
  const [expiringMembers, setExpiringMembers] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('SignUpRequests')
      .select('*')
      .neq('status', 'APPROVED')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error.message);
      setError(error);
    } else {
      setRequests(data);
    }
    setLoading(false);
  };

  const fetchExpiringMembers = async () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data, error } = await supabase
      .from('customerinfo')
      .select('Name, EmailID, ContactNo, MembershipEndDate')
      .gte('MembershipEndDate', today.toISOString())
      .lte('MembershipEndDate', nextWeek.toISOString())
      .order('MembershipEndDate');

    if (!error) setExpiringMembers(data);
  };

  const fetchExpiredMembers = async () => {
    const today = new Date();

    const { data, error } = await supabase
      .from('customerinfo')
      .select('Name, EmailID, ContactNo, MembershipEndDate')
      .lt('MembershipEndDate', today.toISOString())
      .order('MembershipEndDate');

    if (!error) setExpiredMembers(data);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('SignUpRequests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Status update failed: ${error.message}`);
    } else {
      setTimeout(() => fetchRequests(), 300);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchExpiringMembers();
    fetchExpiredMembers();
  }, []);

  if (loading) return <div className="p-4">Loading sign-up requests...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign-Up Requests</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Phone</th>
              <th className="border p-2">Child 1</th>
              <th className="border p-2">DOB 1</th>
              <th className="border p-2">Child 2</th>
              <th className="border p-2">DOB 2</th>
              <th className="border p-2">Address</th>
              <th className="border p-2">Message</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="border p-2">{r.name}</td>
                <td className="border p-2">{r.email}</td>
                <td className="border p-2">{r.phone}</td>
                <td className="border p-2">{r.child1_name}</td>
                <td className="border p-2">{new Date(r.child1_dob).toLocaleDateString('en-IN')}</td>
                <td className="border p-2">{r.child2_name}</td>
                <td className="border p-2">{r.child2_dob ? new Date(r.child2_dob).toLocaleDateString('en-IN') : '-'}</td>
                <td className="border p-2 whitespace-pre-wrap">{r.address}</td>
                <td className="border p-2 whitespace-pre-wrap">{r.message}</td>
                <td className="border p-2 text-center font-semibold">{r.status}</td>
                <td className="border p-2 space-x-2">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    onClick={() => updateStatus(r.id, 'APPROVED')}
                  >
                    Approve
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    onClick={() => updateStatus(r.id, 'REJECTED')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Members Expiring in Next 7 Days</h2>
        {expiringMembers.length === 0 ? (
          <p className="text-sm text-gray-500">No expiring memberships.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {expiringMembers.map((m, idx) => (
              <li key={idx}>{m.Name} — {m.EmailID} — {m.ContactNo} — Expiry: {new Date(m.MembershipEndDate).toLocaleDateString('en-IN')}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Members with Expired Membership</h2>
        {expiredMembers.length === 0 ? (
          <p className="text-sm text-gray-500">No expired memberships.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {expiredMembers.map((m, idx) => (
              <li key={idx}>{m.Name} — {m.EmailID} — {m.ContactNo} — Expired on: {new Date(m.MembershipEndDate).toLocaleDateString('en-IN')}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
