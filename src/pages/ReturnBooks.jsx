import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function ReturnBooks() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [booksToReturn, setBooksToReturn] = useState([]);
  const [selectedBookIds, setSelectedBookIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState('');

  // Check if logged-in user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: admin } = await supabase
        .from('admininfo')
        .select('AdminLocation')
        .eq('AdminID', user.id)
        .single();

      if (admin) {
        setIsAdmin(true);
        setAdminLocation(admin.AdminLocation);
      }
    };
    checkAdmin();
  }, []);

  // Autocomplete customer
  useEffect(() => {
    if (customerSearch.length < 2) return setCustomerSuggestions([]);

    const search = async () => {
      const trimmed = customerSearch.trim();
      const { data } = await supabase
        .from('customerinfo')
        .select('CustomerID, CustomerName, EmailID, ContactNumber')
        .or([
          `CustomerName.ilike.*${trimmed}*`,
          `EmailID.ilike.*${trimmed}*`,
          `ContactNumber.ilike.*${trimmed}*`
        ].join(','))
        .limit(10);

      setCustomerSuggestions(data || []);
    };

    search();
  }, [customerSearch]);

  // Load books for selected customer
  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setCustomerSuggestions([]);

    const { data } = await supabase
      .from('circulationhistory')
      .select(`
        BookingID,
        ISBN13,
        BookingDate,
        ReturnDate,
        catalog:ISBN13 (Title, Authors, Thumbnail)
      `)
      .eq('MemberID', customer.CustomerID)
      .is('ReturnDate', null);

    setBooksToReturn(data || []);
    setSelectedBookIds(new Set());
    setSelectAll(false);
  };

  const handleToggleBook = (id) => {
    const updated = new Set(selectedBookIds);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelectedBookIds(updated);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBookIds(new Set());
    } else {
      setSelectedBookIds(new Set(booksToReturn.map(b => b.BookingID)));
    }
    setSelectAll(!selectAll);
  };

  const handleReturnBooks = async () => {
    const today = new Date().toISOString();
    const idsToUpdate = Array.from(selectedBookIds);

    if (idsToUpdate.length === 0) return;

    const { error } = await supabase
      .from('circulationhistory')
      .update({ ReturnDate: today })
      .in('BookingID', idsToUpdate);

    if (!error) {
      setMessage(`✅ Books returned for ${selectedCustomer.CustomerName}`);
      setBooksToReturn(booksToReturn.filter(b => !selectedBookIds.has(b.BookingID)));
      setSelectedBookIds(new Set());
      setSelectAll(false);
    } else {
      setMessage('❌ Error returning books: ' + error.message);
    }
  };

  if (!isAdmin) return <div className="p-4 text-red-600 font-bold">Access Denied: Admins Only</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Return Books</h1>

      <input
        type="text"
        value={customerSearch}
        onChange={(e) => setCustomerSearch(e.target.value)}
        placeholder="Search by Name, Email or Phone"
        className="w-full border p-2 rounded mb-2"
      />

      {customerSuggestions.length > 0 && (
        <ul className="bg-white border rounded shadow mb-4">
          {customerSuggestions.map((c) => (
            <li
              key={c.CustomerID}
              onClick={() => handleSelectCustomer(c)}
              className="p-2 cursor-pointer hover:bg-blue-100"
            >
              {c.CustomerName}, {c.EmailID}, {c.ContactNumber}
            </li>
          ))}
        </ul>
      )}

      {selectedCustomer && (
        <>
          <h2 className="text-lg font-semibold mb-2">
            Books issued to: <span className="text-blue-700">{selectedCustomer.CustomerName}</span>
          </h2>

          {booksToReturn.length > 0 ? (
            <>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="mr-2"
                />
                Select All
              </label>

              {booksToReturn.map((book) => (
                <div key={book.BookingID} className="flex items-center border p-2 rounded mb-2">
                  <input
                    type="checkbox"
                    checked={selectedBookIds.has(book.BookingID)}
                    onChange={() => handleToggleBook(book.BookingID)}
                    className="mr-2"
                  />
                  <img src={book.catalog?.Thumbnail} alt="thumb" className="w-12 h-16 mr-3 rounded" />
                  <div>
                    <p className="font-semibold">{book.catalog?.Title}</p>
                    <p className="text-sm text-gray-600">{book.catalog?.Authors}</p>
                    <p className="text-xs text-gray-500">Issued: {new Date(book.BookingDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}

              <button
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
                onClick={handleReturnBooks}
              >
                ✅ Return Selected Books
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">No books pending return for this user.</p>
          )}
        </>
      )}

      {message && <p className="mt-4 text-green-700 font-medium">{message}</p>}
    </div>
  );
}
