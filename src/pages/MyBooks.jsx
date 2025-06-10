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
      .select('SerialNumberOfIssue, ISBN13, CopyNumber, catalog:ISBN13(Title, Authors, Thumbnail)')
      .eq('userid', uid)
      .order('SerialNumberOfIssue', { ascending: true });

    if (!error) setBookings(data);
    else console.error('Error fetching bookings:', error);
  };

  const fetchHistory = async (uid) => {
    const { data, error } = await supabase
      .from('circulationhistory')
      .select('BookingDate, ReturnDate, ISBN13, catalog:ISBN13(Title, Authors, Thumbnail)')
      .eq('MemberID', uid)
      .order('BookingDate', { ascending: false });

    if (!error) setHistory(data);
    else console.error('Error fetching history:', error);
  };

  const moveUpQueue = async (isbn, copyNumber) => {
    if (!userId) return;

    const { data: allBookings } = await supabase
      .from('circulationfuture')
      .select('*')
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

    const { error } = await supabase.rpc('bulk_update_serials', {
      updates: updates.map(b => ({
        circulationid: b.CirculationID,
        serialnumber: b.SerialNumberOfIssue
      }))
    });

    if (!error) fetchBookings(userId);
    else console.error('Error updating serials:', error);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Booked Copies</h2>
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
      </div>
    </div>
  );
}
