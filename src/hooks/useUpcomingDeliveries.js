import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export function useUpcomingDeliveries() {
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = async () => {
    setLoading(true);

    // Step 1: Get upcoming delivery users
    const { data: deliveries, error: deliveryError } = await supabase.rpc('get_upcoming_deliveries_7_days');
    if (deliveryError) {
      console.error('Delivery fetch error:', deliveryError.message);
      setUpcomingDeliveries([]);
      setLoading(false);
      return;
    }

    const userIds = deliveries.map((d) => d.userid).filter(Boolean);

    if (userIds.length === 0) {
      setUpcomingDeliveries([]);
      setLoading(false);
      return;
    }

    // Step 2: Get count of selected books
    const { data: selections, error: countError } = await supabase
      .rpc('get_circulationfuture_counts', { user_ids: userIds });

    if (countError) {
      console.error('Book count fetch error:', countError.message);
    }

    const countMap = Object.fromEntries((selections || []).map((s) => [s.userid, s.selected_count]));

    // Step 3: Get user quota and child age
    const { data: customerinfo, error: infoError } = await supabase
      .from('customerinfo')
      .select('userid, CirculationQuantity, ChildAge')
      .in('userid', userIds);

    if (infoError) {
      console.error('Customer info fetch error:', infoError.message);
    }

    const infoMap = Object.fromEntries((customerinfo || []).map((c) => [c.userid, c]));

    // Step 4: Combine all info per delivery
    const enriched = deliveries.map((d) => ({
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

  return {
    upcomingDeliveries,
    loading,
    refreshUpcoming: fetchUpcoming,
  };
}
