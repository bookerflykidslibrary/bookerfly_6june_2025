import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';
import ScannerDialog from '../components/ScannerDialog';

export default function IssueBooks() {
  const [bookInputs, setBookInputs] = useState(Array(10).fill({ value: '', type: 'ISBN13' }));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [books, setBooks] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLocation, setAdminLocation] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState(null);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(null);


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

  useEffect(() => {
    if (customerSearch.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const trimmed = customerSearch.trim();
      const orClause = [
        `CustomerName.ilike.*${trimmed}*`,
        `EmailID.ilike.*${trimmed}*`
      ];

      let { data, error } = await supabase
          .from('customerinfo')
          .select('CustomerID, CustomerName, EmailID')
          .or(orClause.join(','))
          .limit(10);

      if (!error) setCustomerSuggestions(data || []);
      else setCustomerSuggestions([]);
    };

    fetchSuggestions();
  }, [customerSearch]);

  const handleSelectCustomer = async (customerId) => {
    const { data: customer, error } = await supabase
        .from('customerinfo')
        .select('*')
        .eq('CustomerID', customerId)
        .single();

    if (!error) {
      setSelectedCustomer(customer);
      setCustomerSearch('');
      setCustomerSuggestions([]);

      const { data: plan } = await supabase
          .from('membershipplans')
          .select('NumberOfBooks')
          .eq('PlanName', customer.SubscriptionPlan)
          .single();

      const bookLimit = parseInt(plan?.NumberOfBooks || '0', 10);

      const { data: wishlist } = await supabase
          .from('circulationfuture')
          .select('ISBN13')
          .eq('userid', customer.userid)
          .order('SerialNumberOfIssue')
          .limit(bookLimit);

      const inputs = Array(10).fill({ value: '', type: 'ISBN13' });
      wishlist?.forEach((w, i) => {
        if (i < 10) inputs[i] = { value: w.ISBN13, type: 'ISBN13' };
      });

      setBookInputs(inputs);
    }
  };

  const fetchBookTitleSuggestions = async (text) => {
    const { data, error } = await supabase
        .from('catalog')
        .select('Title, ISBN13')
        .ilike('Title', `%${text}%`)
        .limit(20);

    if (!error) setTitleSuggestions(data || []);
    else setTitleSuggestions([]);
  };

  const handleInputChange = (index, field, value) => {
    const updated = [...bookInputs];
    updated[index] = { ...updated[index], [field]: value };
    setBookInputs(updated);

    if (field === 'value' && updated[index].type === 'ISBN13' && value.length >= 3) {
      setFocusedIndex(index);
      fetchBookTitleSuggestions(value);
    } else {
      setTitleSuggestions([]);
    }
  };

  const handleReview = async () => {
    if (!selectedCustomer?.CustomerID) {
      setMessage('Please select a customer.');
      return;
    }

    const filtered = bookInputs.filter(entry => entry.value.trim() !== '');
    if (filtered.length === 0) {
      setMessage('Please enter at least one Book ID or scan.');
      return;
    }

    let allBooks = [];

    for (let entry of filtered) {
      const isbn = entry.value;
      if (entry.type === 'ISBN13') {
        const { data: copy } = await supabase
            .from('copyinfo')
            .select('CopyID, ISBN13, CopyNumber')
            .eq('ISBN13', isbn)
            .eq('CopyLocation', adminLocation)
            .eq('CopyBooked', false)
            .limit(1)
            .maybeSingle();

        if (!copy) {
          allBooks.push({ error: `No available copy for ISBN: ${isbn}` });
          continue;
        }

        const { data: book } = await supabase
            .from('catalog')
            .select('Title, Authors, ISBN13, Thumbnail')
            .eq('ISBN13', isbn)
            .single();

        allBooks.push({ ...book, CopyID: copy.CopyID, CopyNumber: copy.CopyNumber });
      }
    }

    setBooks(allBooks);
    setConfirming(true);
    setMessage('');
  };

  const handleConfirm = async () => {
    if (!selectedCustomer?.userid) {
      setMessage('❌ Cannot issue books — userid missing for selected customer.');
      return;
    }

    const today = new Date().toISOString();
    const validBooks = books.filter(b => !b.error);

    const records = validBooks.map(book => ({
      LibraryBranch: adminLocation,
      ISBN13: book.ISBN13,
      CopyID: book.CopyID,
      BookingDate: today,
      ReturnDate: null,
      MemberID: selectedCustomer.CustomerID,
      userid: selectedCustomer.userid,
      Comment: '',
    }));

    const { error } = await supabase.from('circulationhistory').insert(records);

    if (!error) {
      await supabase
          .from('copyinfo')
          .update({ CopyBooked: true })
          .in('CopyID', validBooks.map(b => b.CopyID));

      const { data: wishlist } = await supabase
          .from('circulationfuture')
          .select('CirculationID, ISBN13')
          .eq('userid', selectedCustomer.userid);

      const issuedISBNs = validBooks.map(b => b.ISBN13);
      const toDelete = wishlist.filter(w => issuedISBNs.includes(w.ISBN13));

      await supabase
          .from('circulationfuture')
          .delete()
          .in('CirculationID', toDelete.map(w => w.CirculationID));

      const { data: remaining } = await supabase
          .from('circulationfuture')
          .select('CirculationID')
          .eq('userid', selectedCustomer.userid)
          .order('SerialNumberOfIssue');

      for (let i = 0; i < remaining.length; i++) {
        await supabase
            .from('circulationfuture')
            .update({ SerialNumberOfIssue: i + 1 })
            .eq('CirculationID', remaining[i].CirculationID);
      }

      setMessage('✅ Books issued successfully! Have fun!');
      setConfirming(false);
      setBooks([]);
      setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
    } else {
      setMessage('Error issuing books: ' + error.message);
    }
  };

  return (
      <div className="max-w-md mx-auto p-4">
        <input
            type="text"
            placeholder="Search by Name or Email"
            className="w-full p-2 mb-2 border border-gray-300 rounded"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
        />
        {customerSuggestions.length > 0 && (
            <ul className="bg-white border mt-1 max-h-48 overflow-auto shadow rounded z-10 relative">
              {customerSuggestions.map((c) => (
                  <li
                      key={c.CustomerID}
                      onClick={() => handleSelectCustomer(c.CustomerID)}
                      className="p-2 hover:bg-blue-100 cursor-pointer"
                  >
                    #{c.CustomerID} — {c.CustomerName}, {c.EmailID}
                  </li>
              ))}
            </ul>
        )}

        {bookInputs.map((entry, index) => (
            <div key={index} className="flex flex-col mb-4 relative">
              <div className="flex gap-2 items-center">
                <select
                    value={entry.type}
                    onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                    className="p-2 border rounded w-1/3"
                >
                  <option value="ISBN13">ISBN13</option>
                  <option value="CopyLocationID">CopyLocation</option>
                </select>
                <input
                    type="text"
                    placeholder={`Book ${index + 1}`}
                    value={entry.value}
                    onChange={(e) => handleInputChange(index, 'value', e.target.value)}
                    onFocus={() => setFocusedIndex(index)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                />
                <button
                    type="button"
                    onClick={() => {
                      setTargetIndex(index);
                      setScannerOpen(true);
                    }}
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                >📷</button>
              </div>

              {/* Show suggestions only for this input */}
              {focusedIndex === index && titleSuggestions.length > 0 && (
                  <ul className="absolute bg-white border mt-1 w-full max-h-48 overflow-auto shadow rounded z-10">
                    {titleSuggestions.map((book) => (
                        <li
                            key={book.ISBN13}
                            onClick={() => {
                              const updated = [...bookInputs];
                              updated[index] = { value: book.ISBN13, type: 'ISBN13' };
                              setBookInputs(updated);
                              setTitleSuggestions([]);
                              setFocusedIndex(null);
                            }}
                            className="p-2 hover:bg-blue-100 cursor-pointer"
                        >
                          📚 {book.Title}
                        </li>
                    ))}
                  </ul>
              )}
            </div>
        ))}


        <ScannerDialog
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={(text) => {
              setBookInputs(prev => {
                const updated = [...prev];
                updated[targetIndex] = { ...updated[targetIndex], value: text };
                return updated;
              });
            }}
        />

        <button onClick={handleReview} className="w-full mt-2 bg-purple-600 text-white py-2 rounded">
          Review Books
        </button>

        <button
            onClick={() => {
              setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
              setMessage('');
            }}
            className="w-full mt-2 bg-gray-300 text-black py-2 rounded"
        >
          🔄 Reset Book Entries
        </button>

        {confirming && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-700">Confirm Issue:</h3>
              {books.map((b, i) =>
                  b.error ? (
                      <p key={i} className="text-red-600 text-sm">❌ {b.error}</p>
                  ) : (
                      <div key={i} className="flex items-center gap-2 py-2 border-b">
                        {b.Thumbnail && <img src={b.Thumbnail} alt="thumb" className="w-12 h-auto rounded" />}
                        <div>
                          <p className="text-sm font-bold">{b.Title}</p>
                          <p className="text-xs text-gray-600">{b.Authors}</p>
                          <p className="text-xs text-green-600">Copy number <strong>{b.CopyNumber}</strong> will be issued</p>
                        </div>
                      </div>
                  )
              )}
              <button
                  onClick={handleConfirm}
                  className="w-full mt-4 bg-green-600 text-white py-2 rounded"
              >
                Confirm Issue
              </button>
            </div>
        )}

        {message && (
            <p className="mt-4 text-center text-sm text-blue-700 font-semibold">
              DEBUG MESSAGE: {message || 'No message'}
            </p>
        )}
      </div>
  );
}
