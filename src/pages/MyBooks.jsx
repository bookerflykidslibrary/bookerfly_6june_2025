import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function MyBooks() {
  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchBookings(user.id);
        fetchHistory(user.id);
      }
    };
    fetchUser();
  }, []);

  const fetchBookings = async (uid) => {
    const { data, error } = await supabase
      .from('circulationfuture')
      .select(`
        CirculationID,
        SerialNumberOfIssue,
        ISBN13,
        CopyNumber,
        catalog:ISBN13 (
          Title,
          Authors,
          Thumbnail
        )
      `)
      .eq('userid', uid)
      .order('SerialNumberOfIssue', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error.message);
    } else {
      const corrected = await ensureSerialOrder(data);
      setBookings(corrected);
    }
  };

  const ensureSerialOrder = async (records) => {
    const sorted = [...records].sort((a, b) => (a.SerialNumberOfIssue || 0) - (b.SerialNumberOfIssue || 0));

    let needsFix = false;
    const seen = new Set();
    const corrected = [];

    for (let i = 0; i < sorted.length; i++) {
      let correctSerial = i + 1;
      const current = sorted[i];
      const currentSerial = current.SerialNumberOfIssue || 0;

      if (seen.has(currentSerial) || currentSerial !== correctSerial) {
        needsFix = true;
        corrected.push({ ...current, SerialNumberOfIssue: correctSerial });
      } else {
        corrected.push(current);
      }
      seen.add(correctSerial);
    }

    if (needsFix) {
      console.log('🔁 Fixing serial numbers');
      for (const row of corrected) {
        await supabase
          .from('circulationfuture')
          .update({ SerialNumberOfIssue: row.SerialNumberOfIssue })
          .eq('CirculationID', row.CirculationID);
      }
    }

    return corrected;
  };

  const fetchHistory = async (uid) => {
    const { data, error } = await supabase
      .from('circulationhistory')
      .select(`
        BookingDate,
        ReturnDate,
        ISBN13,
        catalog:ISBN13 (
          Title,
          Authors,
          Thumbnail
        )
      `)
      .eq('userid', uid)
      .order('BookingDate', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error.message);
    } else {
      setHistory(data);
    }
  };

  const moveUpQueue = async (isbn, copyNumber) => {
    if (!userId) return;

    const { data: allBookings } = await supabase
      .from('circulationfuture')
      .select('*')
      .eq('userid', userId)
      .eq('ISBN13', isbn)
      .eq('CopyNumber', copyNumber)
      .order('SerialNumberOfIssue');

    if (!allBookings || allBookings.length === 0) return;

    const updates = [];
    let newSerial = 2;

    for (const booking of allBookings) {
      if (booking.userid === userId) {
        updates.push({
          ...booking,
          SerialNumberOfIssue: 1
        });
      } else {
        updates.push({
          ...booking,
          SerialNumberOfIssue: newSerial++
        });
      }
    }

    for (const b of updates) {
      await supabase
        .from('circulationfuture')
        .update({ SerialNumberOfIssue: b.SerialNumberOfIssue })
        .eq('CirculationID', b.CirculationID);
    }

    fetchBookings(userId);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your future requests, will be sent to you based on availability in given order. Please click buttons below to change the priority of your bookings.</h2>
      <div className="grid gap-4">
        {bookings.map((b, idx) => (
          <div key={idx} className="border p-4 rounded-md flex gap-4 items-center">
            <img src={b.catalog?.Thumbnail} alt="Thumbnail" className="w-16 h-20 object-cover" />
            <div className="flex-1">
              <div className="font-semibold">{b.catalog?.Title}</div>
              <div className="text-sm text-gray-600">{b.catalog?.Authors}</div>
              <div className="text-xs text-gray-500">Serial #: {b.SerialNumberOfIssue}</div>
            </div>
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded"
              onClick={() => moveUpQueue(b.ISBN13, b.CopyNumber)}
            >
              Move up the queue
            </button>
          </div>
        ))}
        {bookings.length === 0 && (
          <p className="text-sm text-gray-500">No current bookings found.</p>
        )}
      </div>

      <h2 className="text-xl font-bold mt-10 mb-4">Circulation History</h2>
      <div className="grid gap-4">
        {history.map((h, idx) => (
          <div key={idx} className="border p-4 rounded-md flex gap-4 items-center">
            <img src={h.catalog?.Thumbnail} alt="Thumbnail" className="w-16 h-20 object-cover" />
            <div className="flex-1">
              <div className="font-semibold">{h.catalog?.Title}</div>
              <div className="text-sm text-gray-600">{h.catalog?.Authors}</div>
              <div className="text-xs text-gray-500">Booked: {h.BookingDate}</div>
              {h.ReturnDate && (
                <div className="text-xs text-green-600">Returned: {h.ReturnDate}</div>
              )}
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <p className="text-sm text-gray-500">No previous history found.</p>
        )}
      </div>
    </div>
  );
}
