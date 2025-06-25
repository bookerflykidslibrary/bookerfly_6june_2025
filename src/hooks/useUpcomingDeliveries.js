import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export function useUpcomingDeliveries() {
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = async () => {
    setLoading(true);
    const { data: deliveries, error } = await supabase.rpc('get_upcoming_deliveries_7_days');
    if (error) {
      console.error('Delivery fetch error:', error.message);
      setUpcomingDeliveries([]);
      setLoading(false);
      return;
    }

    const userIds = deliveries.map(d => d.userid);

    const { data: selections } = await supabase
      .from('circulationfuture')
      .select('userid, count:isbn13')
      .in('userid', userIds)
      .group('userid');

    const { data: customerinfo } = await supabase
      .from('customerinfo')
      .select('userid, CirculationQuantity, ChildAge')
      .in('userid', userIds);

    const countMap = Object.fromEntries(selections.map(s => [s.userid, s.count]));
    const infoMap = Object.fromEntries(customerinfo.map(c => [c.userid, c]));

    const enriched = deliveries.map(d => ({
      ...d,
      selectedCount: countMap[d.userid] || 0,
      quota: infoMap[d.userid]?.CirculationQuantity || 0,
      childAge: infoMap[d.userid]?.ChildAge || 6,
    }));

    setUpcomingDeliveries(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  return { upcomingDeliveries, loading, refreshUpcoming: fetchUpcoming };
}
