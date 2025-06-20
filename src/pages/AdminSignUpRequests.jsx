import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function AdminSignUpRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('SignUpRequests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error.message);
      setError(error);
    } else {
      console.error('Fetch response:',data );
      setRequests(data);
    }
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    console.log(`Attempting to update request ID ${id} to status: ${newStatus}`);

    const { error } = await supabase
        .from('SignUpRequests')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
      console.error('Status update failed:', error.message);
      alert(`Status update failed: ${error.message}`);
    } else {
      console.log('Status updated successfully');
      fetchRequests(); // Refresh the list
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) return <div className="p-4">Loading sign-up requests...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Sign-Up Requests</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Phone</th>
              <th className="border p-2">Child</th>
              <th className="border p-2">Age</th>
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
                  <td className="border p-2">{r.child_name}</td>
                  <td className="border p-2 text-center">{r.child_age}</td>
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
      </div>
  );
}
