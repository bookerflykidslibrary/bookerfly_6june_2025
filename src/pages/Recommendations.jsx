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
  const [missedDeliveries, setMissedDeliveries] = useState([]);

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

  const fetchMissedDeliveries = async () => {
    const { data, error } = await supabase.rpc('get_missed_deliveries_30_days');
    if (error) {
      console.error('Missed delivery fetch error:', error.message);
    } else {
      setMissedDeliveries(data || []);
    }
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
        fetchMissedDeliveries();
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error.');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchMembershipInfo();
    fetchMissedDeliveries();
  }, []);

  if (loading) return <div className="p-4">Loading sign-up requests...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Sign-Up Requests</h1>
        {/* ... table rendering requests ... */}

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

        <h2 className="text-xl font-bold mt-6 mb-2 text-orange-700">⚠️ Missed Deliveries in Last 30 Days</h2>
        <ul className="list-disc list-inside text-sm">
          {missedDeliveries.length === 0 ? (
              <li>No missed deliveries in last 30 days.</li>
          ) : (
              missedDeliveries.map((d, idx) => (
                  <li key={idx}>
                    <strong>{d.customername}</strong> — {d.emailid} — {d.contactno}<br />
                    Expected delivery on <strong>{new Date(d.expectedDate).toLocaleDateString()}</strong><br />
                    Plan: {d.plan}, Delivered: {d.booksDelivered} of {d.quota}
                  </li>
              ))
          )}
        </ul>
      </div>
  );
}
