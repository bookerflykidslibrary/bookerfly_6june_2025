import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function AdminSignUpRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [futuresMap, setFuturesMap] = useState({});
  const [quotasMap, setQuotasMap] = useState({});

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

  const fetchUpcomingDeliveries = async () => {
    const { data, error } = await supabase.rpc('get_upcoming_deliveries_7_days');
    if (error) {
      console.error('Delivery fetch error:', error.message);
      return;
    }
    setUpcomingDeliveries(data || []);

    const userIds = data.map(d => d.userid);
    if (userIds.length === 0) return;

    const { data: futures } = await supabase
      .from('circulationfuture')
      .select('userid')
      .in('userid', userIds);

    const futureCounts = futures?.reduce((acc, cur) => {
      acc[cur.userid] = (acc[cur.userid] || 0) + 1;
      return acc;
    }, {}) || {};
    setFuturesMap(futureCounts);

    const { data: customers } = await supabase
      .from('customerinfo')
      .select('CustomerID, CirculationQuantity');

    const quotaMap = customers?.reduce((acc, cur) => {
      acc[cur.CustomerID] = cur.CirculationQuantity;
      return acc;
    }, {}) || {};
    setQuotasMap(quotaMap);
  };

  const recommendRest = async (userid, child1_dob, child2_dob) => {
    const selectedCount = futuresMap[userid] || 0;
    const quota = quotasMap[userid] || 0;
    const remaining = quota - selectedCount;
    if (remaining <= 0) return;

    const today = new Date();
    const childAges = [];
    if (child1_dob) {
      const age1 = Math.floor((today - new Date(child1_dob)) / (365.25 * 24 * 60 * 60 * 1000));
      childAges.push(age1);
    }
    if (child2_dob) {
      const age2 = Math.floor((today - new Date(child2_dob)) / (365.25 * 24 * 60 * 60 * 1000));
      childAges.push(age2);
    }

    const filters = childAges.map(age => `and(MinAge.lte.${age},MaxAge.gte.${age})`).join(',');
    const { data: books } = await supabase
      .from('catalog')
      .select('*')
      .or(filters)
      .limit(remaining)
      .order('random');

    for (const book of books) {
      await supabase.from('circulationfuture').insert({
        userid,
        ISBN13: book.ISBN13,
        CopyNumber: 0,
        SerialNumberOfIssue: 0,
      });
    }
    alert(`${remaining} recommended books added!`);
    fetchUpcomingDeliveries();
  };

  useEffect(() => {
    fetchRequests();
    fetchMembershipInfo();
    fetchUpcomingDeliveries();
  }, []);

  if (loading) return <div className="p-4">Loading sign-up requests...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign-Up Requests</h1>
      {/* sign-up requests table unchanged */}

      <h2 className="text-xl font-bold mb-2 text-green-700">🚚 Upcoming Deliveries in Next 7 Days</h2>
      <ul className="list-disc list-inside text-sm">
        {upcomingDeliveries.length === 0 ? (
          <li>No deliveries scheduled in next 7 days.</li>
        ) : (
          upcomingDeliveries.map((d, idx) => (
            <li key={idx} className="mb-2">
              <strong>{d.CustomerName}</strong> — {d.EmailID} — {d.ContactNo} — Next delivery on <strong>{new Date(d.NextDeliveryDate).toLocaleDateString()}</strong>
              <div className="ml-6">
                {futuresMap[d.userid] || 0} of {quotasMap[d.userid] || 0} books selected
                <button
                  className="ml-4 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                  onClick={() => recommendRest(d.userid, d.child1_dob, d.child2_dob)}
                >
                  Recommend Rest
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
