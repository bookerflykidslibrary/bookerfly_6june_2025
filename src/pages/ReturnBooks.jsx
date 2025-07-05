import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function ReturnBooks() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [booksToReturn, setBooksToReturn] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState({});
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: admin } = await supabase
        .from('admininfo')
        .select('*')
        .eq('AdminID', user.id)
        .single();
      if (admin) setIsAdmin(true);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (search.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const trimmed = search.trim();
      const { data } = await supabase
        .from('customerinfo')
        .select('CustomerName, EmailID, ContactNo, userid')
        .or(
          `CustomerName.ilike.%${trimmed}%,EmailID.ilike.%${trimmed}%,ContactNo.ilike.%${trimmed}%`
        )
        .limit(10);

      setSuggestions(data || []);
    };

    fetchSuggestions();
  }, [search]);

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSearch('');
    setSuggestions([]);
    setMessage('');
    setSelectedBooks({});
    console.log("✅ Selected user:", user);

    const { data, error } = await supabase
      .from('circulationhistory')
      .select(`
        BookingID,
        ISBN13,
        CopyID,
        BookingDate,
        ReturnDate,
        catalog:circulationhistory_ISBN13_fkey (
          Title,
          Thumbnail
        )
      `)
      .eq('userid', user.userid)
      .is('ReturnDate', null);

    console.log("📦 Supabase Query Result");
    console.log("📚 data:", data);
    console.log("❌ error:", error);
    console.log("🔢 count of rows:", data?.length);

    setBooksToReturn(data || []);
  };

  const toggleBook = (id) => {
    setSelectedBooks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const allSelected = booksToReturn.every(book => selectedBooks[book.BookingID]);
    const newSelected = {};
    booksToReturn.forEach(book => {
      newSelected[book.BookingID] = !allSelected;
    });
    setSelectedBooks(newSelected);
  };

  const handleReturn = async () => {
    const selected = booksToReturn.filter(b => selectedBooks[b.BookingID]);
    const bookingIds = selected.map(b => b.BookingID);
    const copyIds = selected.map(b => b.CopyID);

    if (bookingIds.length === 0) return;

    const today = new Date().toISOString();

    // Step 1: Mark books returned
    const { error: updateError } = await supabase
        .from('circulationhistory')
        .update({ ReturnDate: today })
        .in('BookingID', bookingIds);

    if (updateError) {
      setMessage('❌ Error returning books: ' + updateError.message);
      return;
    }

    // Step 2: Unmark booked copies
    const { error: copyError } = await supabase
        .from('copyinfo')
        .update({ CopyBooked: false })
        .in('CopyID', copyIds);

    if (copyError) {
      setMessage('⚠️ Return date updated, but failed to unbook copies: ' + copyError.message);
    } else {
      setMessage(`✅ Books returned for ${selectedUser.CustomerName}`);
    }

    // Step 3: Refresh state
    setBooksToReturn(prev => prev.filter(b => !bookingIds.includes(b.BookingID)));
    setSelectedBooks({});
  };

  if (!isAdmin) {
    return <div className="p-4 text-red-600 font-bold">Access denied</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Return Books</h1>
      <input
        type="text"
        placeholder="Search by Name, Email or Phone"
        className="border p-2 rounded w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {suggestions.length > 0 && (
        <ul className="bg-white border mt-1 max-h-48 overflow-auto shadow rounded z-10 relative">
          {suggestions.map((c, idx) => (
            <li
              key={idx}
              onClick={() => handleSelectUser(c)}
              className="p-2 hover:bg-blue-100 cursor-pointer"
            >
              {c.CustomerName}, {c.EmailID}, {c.ContactNo}
            </li>
          ))}
        </ul>
      )}

      {selectedUser && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Books with {selectedUser.CustomerName}</h2>
          {booksToReturn.length === 0 ? (
            <p className="text-sm text-gray-600">No books to return.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={booksToReturn.every(b => selectedBooks[b.BookingID])}
                />
                <label className="ml-2 text-sm">Select All</label>
              </div>
              {booksToReturn.map((b) => (
                <div key={b.BookingID} className="border p-3 rounded flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBooks[b.BookingID] || false}
                    onChange={() => toggleBook(b.BookingID)}
                  />
                  {b.catalog?.Thumbnail && (
                    <img src={b.catalog.Thumbnail} alt="thumb" className="w-12 h-16 object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{b.catalog?.Title}</p>
                    <p className="text-xs text-gray-600">Issued on: {b.BookingDate?.slice(0, 10)}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={handleReturn}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded"
              >
                Return Books
              </button>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-4 text-center text-blue-700 font-semibold">{message}</p>}
    </div>
  );
}
