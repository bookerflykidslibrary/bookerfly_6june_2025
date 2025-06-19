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
      console.log('👤 Logged-in user:', user);
      if (!user) return;

      const { data: admin, error } = await supabase
        .from('admininfo')
        .select('*')
        .eq('AdminID', user.id)
        .single();

      if (admin && !error) {
        setIsAdmin(true);
        console.log('✅ Admin verified');
      } else {
        console.warn('🚫 Not an admin:', error?.message);
      }
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
      console.log(`🔍 Searching for: ${trimmed}`);
      const { data, error } = await supabase
        .from('customerinfo')
        .select('CustomerName, EmailID, ContactNo, userid')
        .or(
          `CustomerName.ilike.%${trimmed}%,EmailID.ilike.%${trimmed}%,ContactNo.ilike.%${trimmed}%`
        )
        .limit(10);

      if (error) {
        console.error('❌ Suggestion fetch error:', error.message);
      } else {
        console.log(`✅ Found ${data.length} customer matches`);
      }

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
    setBooksToReturn([]);
    console.log('👤 Selected user:', user);

    const { data, error } = await supabase
      .from('circulationhistory')
      .select(`
        BookingID,
        ISBN13,
        CopyID,
        BookingDate,
        ReturnDate,
        catalog:ISBN13 (
          Title,
          Thumbnail
        )
      `)
      .eq('userid', user.userid)
      .is('ReturnDate', null);

    if (error) {
      console.error('❌ Error fetching circulation history:', error.message);
    } else {
      console.log(`📚 Books to return: ${data.length}`, data);
    }

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
    const ids = booksToReturn.filter(b => selectedBooks[b.BookingID]).map(b => b.BookingID);
    console.log('📝 Returning BookingIDs:', ids);
    if (ids.length === 0) return;

    const today = new Date().toISOString();
    const { error } = await supabase
      .from('circulationhistory')
      .update({ ReturnDate: today })
      .in('BookingID', ids);

    if (!error) {
      setMessage(`✅ Books returned for ${selectedUser.CustomerName}`);
      setBooksToReturn(prev => prev.filter(b => !ids.includes(b.BookingID)));
      setSelectedBooks({});
      console.log('✅ Successfully returned books');
    } else {
      console.error('❌ Return error:', error.message);
      setMessage('❌ Error returning books: ' + error.message);
    }
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
            <p>No books to return.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center mb-2">
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
                    <img
                      src={b.catalog.Thumbnail}
                      alt="thumb"
                      className="w-12 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{b.catalog?.Title || 'Untitled Book'}</p>
                    <p className="text-xs text-gray-600">Issued on: {b.BookingDate?.slice(0, 10)}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={handleReturn}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
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
