import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export function useUpcomingDeliveries() {
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = async () => {
    setLoading(true);

    const { data: deliveries, error } = await supabase.rpc('get_upcoming_deliveries_7_days');

    if (error) {
      console.error('RPC error:', error.message);
      setUpcomingDeliveries([]);
      setLoading(false);
      return;
    }

    const userIds = deliveries.map((d) => d.userid).filter(Boolean);

    let countMap = {};
    if (userIds.length > 0) {
      const { data: selections, error: countError } = await supabase
        .rpc('get_circulationfuture_counts', { user_ids: userIds });

      if (countError) {
        console.error('Count fetch error:', countError.message);
      } else {
        countMap = Object.fromEntries(selections.map((s) => [s.userid, s.selected_count]));
      }
    }

    const enriched = deliveries.map((d) => ({
      ...d,
      selectedCount: countMap[d.userid] || 0,
      quota: d.numberofbooks ?? 0,
      plan: d.subscriptionplan ?? '-',
      childAge: d.child1_age ?? 6,
      nextDate: d.nextdeliverydate ?? null,
      dob1: d.child1_dob,
      dob2: d.child2_dob,
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
