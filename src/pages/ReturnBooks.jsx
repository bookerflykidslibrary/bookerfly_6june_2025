// ReturnBooks.jsx — Admin-only page to return books
import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function ReturnBooks() {
  const [customerSearch, setCustomerSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [books, setBooks] = useState([]);
  const [checked, setChecked] = useState({});
  const [selectAll, setSelectAll] = useState(false);
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
      setIsAdmin(!!admin);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (customerSearch.length < 2) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      const { data, error } = await supabase
        .from('customerinfo')
        .select('CustomerName, EmailID, ContactNo, userid')
        .or(`CustomerName.ilike.*${customerSearch}*,EmailID.ilike.*${customerSearch}*,ContactNo.ilike.*${customerSearch}*`)
        .limit(10);
      if (!error) setSuggestions(data);
    };
    fetchSuggestions();
  }, [customerSearch]);

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setCustomerSearch('');
    setSuggestions([]);
    setMessage('');
    const { data, error } = await supabase
      .from('circulationhistory')
      .select(`BookingID, ISBN13, BookingDate, catalog:ISBN13 (Title, Thumbnail)`)
      .eq('userid', cust.userid)
      .is('ReturnDate', null);
    if (!error) {
      setBooks(data);
      const checkState = {};
      data.forEach(b => checkState[b.BookingID] = false);
      setChecked(checkState);
    }
  };

  const toggleAll = () => {
    const newState = {};
    books.forEach(b => newState[b.BookingID] = !selectAll);
    setChecked(newState);
    setSelectAll(!selectAll);
  };

  const toggleOne = (id) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReturn = async () => {
    const today = new Date().toISOString();
    const selected = Object.entries(checked)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (selected.length === 0) {
      setMessage('No books selected.');
      return;
    }

    const { error } = await supabase
      .from('circulationhistory')
      .update({ ReturnDate: today })
      .in('BookingID', selected);

    if (!error) {
      setMessage(`✅ Books returned for ${selectedCustomer.CustomerName}`);
      setBooks(books.filter(b => !selected.includes(b.BookingID)));
    } else {
      setMessage('❌ Error returning books.');
    }
  };

  if (!isAdmin) return <div className="p-4 text-red-600 font-bold">Access Denied: Admins Only</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">Return Books</h2>

      <input
        type="text"
        value={customerSearch}
        onChange={(e) => setCustomerSearch(e.target.value)}
        placeholder="Search Name / Email / Phone"
        className="w-full border p-2 rounded"
      />

      {suggestions.length > 0 && (
        <ul className="bg-white border rounded mt-1 max-h-48 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s.userid}
              onClick={() => handleSelectCustomer(s)}
              className="p-2 hover:bg-blue-100 cursor-pointer"
            >
              {s.CustomerName}, {s.EmailID}, {s.ContactNo}
            </li>
          ))}
        </ul>
      )}

      {selectedCustomer && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">Books with {selectedCustomer.CustomerName}</h3>
          {books.length === 0 ? (
            <p className="text-sm text-gray-500">No pending books to return.</p>
          ) : (
            <>
              <div className="flex items-center mb-2">
                <input type="checkbox" checked={selectAll} onChange={toggleAll} className="mr-2" />
                <label className="text-sm">Select All</label>
              </div>
              {books.map((b) => (
                <div key={b.BookingID} className="flex items-center border p-2 rounded mb-2">
                  <input type="checkbox" checked={checked[b.BookingID] || false} onChange={() => toggleOne(b.BookingID)} className="mr-2" />
                  <img src={b.catalog?.Thumbnail} alt="thumb" className="w-12 h-16 object-cover rounded mr-3" />
                  <div>
                    <p className="font-medium text-sm">{b.catalog?.Title}</p>
                    <p className="text-xs text-gray-500">Booked: {b.BookingDate?.slice(0, 10)}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={handleReturn}
                className="mt-3 w-full bg-green-600 text-white py-2 rounded"
              >
                Return Books
              </button>
            </>
          )}
        </div>
      )}

      {message && <p className="mt-4 text-center text-sm text-blue-700 font-semibold">{message}</p>}
    </div>
  );
}
