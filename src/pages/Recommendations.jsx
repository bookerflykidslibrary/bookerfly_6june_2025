// ✅ AdminSignUpRequests.jsx
import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useUpcomingDeliveries } from '../hooks/useUpcomingDeliveries';

export default function AdminSignUpRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);

  const { upcomingDeliveries, loading: loadingDeliveries, refreshUpcoming } = useUpcomingDeliveries();

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

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('SignUpRequests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Status update failed: ${error.message}`);
    } else {
      fetchRequests();
    }
  };

  const fetchMembershipInfo = async () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: soonExpiring } = await supabase
      .from('customerinfo')
      .select('CustomerName, EmailID, ContactNo, EndDate')
      .gte('EndDate', today.toISOString())
      .lte('EndDate', nextWeek.toISOString())
      .order('EndDate');

    const { data: alreadyExpired } = await supabase
      .from('customerinfo')
      .select('CustomerName, EmailID, ContactNo, EndDate')
      .lt('EndDate', today.toISOString())
      .order('EndDate');

    setExpiringSoon(soonExpiring || []);
    setExpiredMembers(alreadyExpired || []);
  };

  const handleRecommendRest = async (delivery) => {
    try {
      const remaining = delivery.quota - delivery.selectedCount;
      if (remaining <= 0) return;

      const { error } = await supabase.rpc('recommend_books_for_user', {
        user_id: delivery.userid,
        num_books: remaining,
        min_age: delivery.childAge,
        max_age: delivery.childAge,
      });

      if (error) {
        alert(`Failed to recommend books: ${error.message}`);
      } else {
        alert('Recommended books successfully!');
        refreshUpcoming();
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error.');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchMembershipInfo();
  }, []);

  if (loading) return <div className="p-4">Loading sign-up requests...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign-Up Requests</h1>
      <div className="overflow-x-auto mb-8">
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
              <tr key={r.id}>
                <td className="border p-2">{r.name}</td>
                <td className="border p-2">{r.email}</td>
                <td className="border p-2">{r.phone}</td>
                <td className="border p-2">{r.child1_name}</td>
                <td className="border p-2">{new Date(r.child1_dob).toLocaleDateString()}</td>
                <td className="border p-2">{r.child2_name}</td>
                <td className="border p-2">{r.child2_dob ? new Date(r.child2_dob).toLocaleDateString() : '-'}</td>
                <td className="border p-2 whitespace-pre-wrap">{r.address}</td>
                <td className="border p-2 whitespace-pre-wrap">{r.message}</td>
                <td className="border p-2 text-center">{r.status}</td>
                <td className="border p-2 space-x-2">
                  <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => updateStatus(r.id, 'APPROVED')}>Approve</button>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => updateStatus(r.id, 'REJECTED')}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-bold mb-2">📆 Memberships expiring in the next 7 days</h2>
      <ul className="list-disc list-inside text-sm mb-6">
        {expiringSoon.length === 0 ? (
          <li>No expiring memberships.</li>
        ) : (
          expiringSoon.map((m, idx) => (
            <li key={idx}>
              <strong>{m.CustomerName}</strong> — {m.EmailID} — {m.ContactNo} — expires on {new Date(m.EndDate).toLocaleDateString()}
            </li>
          ))
        )}
      </ul>

      <h2 className="text-xl font-bold mb-2 text-red-700">❌ Expired Memberships</h2>
      <ul className="list-disc list-inside text-sm mb-6">
        {expiredMembers.length === 0 ? (
          <li>No expired memberships.</li>
        ) : (
          expiredMembers.map((m, idx) => (
            <li key={idx}>
              <strong>{m.CustomerName}</strong> — {m.EmailID} — {m.ContactNo} — expired on {new Date(m.EndDate).toLocaleDateString()}
            </li>
          ))
        )}
      </ul>

      <h2 className="text-xl font-bold mb-2 text-green-700">🚚 Upcoming Deliveries in Next 7 Days</h2>
      {loadingDeliveries ? (
        <p className="text-sm">Loading upcoming deliveries...</p>
      ) : (
        <ul className="list-disc list-inside text-sm">
          {upcomingDeliveries.length === 0 ? (
            <li>No deliveries scheduled in next 7 days.</li>
          ) : (
            upcomingDeliveries.map((d, idx) => (
              <li key={idx}>
                <strong>{d.customername}</strong> — {d.emailid} — {d.contactno}<br />
                Plan: {d.plan}, Books: {d.selectedCount} of {d.quota}, Age: {d.childAge}<br />
                Next delivery on <strong>{d.nextDate ? new Date(d.nextDate).toLocaleDateString() : 'TBD'}</strong>
                {d.selectedCount < d.quota && (
                  <button
                    className="mt-1 ml-2 text-sm bg-blue-500 text-white px-2 py-1 rounded"
                    onClick={() => handleRecommendRest(d)}
                  >
                    📚 Recommend Rest
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
