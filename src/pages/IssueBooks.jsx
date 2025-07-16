import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';
import ScannerDialog from '../components/ScannerDialog';
import html2canvas from 'html2canvas';

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
  const [showCollage, setShowCollage] = useState(false);

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
      const { data } = await supabase
        .from('customerinfo')
        .select('CustomerID, CustomerName, EmailID')
        .or(orClause.join(','))
        .limit(10);
      setCustomerSuggestions(data || []);
    };
    fetchSuggestions();
  }, [customerSearch]);

  const handleSelectCustomer = async (customerId) => {
    const { data: customer } = await supabase
      .from('customerinfo')
      .select('*')
      .eq('CustomerID', customerId)
      .single();

    if (customer) {
      setSelectedCustomer(customer);
      setCustomerSearch(`${customer.CustomerName} (${customer.EmailID})`);
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
    const { data } = await supabase
      .from('catalog')
      .select('Title, ISBN13')
      .ilike('Title', `%${text}%`)
      .limit(20);
    setTitleSuggestions(data || []);
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
    setShowCollage(false);
  };

  const handleConfirm = async () => {
    if (!selectedCustomer?.userid) {
      setMessage('❌ Cannot issue books — userid missing.');
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

      setMessage('✅ Books issued successfully!');
      setConfirming(false);
      setBooks([]);
      setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
      setShowCollage(false);
    } else {
      setMessage('Error: ' + error.message);
    }
  };

  const handleShowCollage = () => setShowCollage(true);

  const waitForImages = (element, timeout = 10000) => {
    const images = element.querySelectorAll('img');
    if (images.length === 0) return Promise.resolve();
    return Promise.race([
      Promise.all(
        Array.from(images).map(img =>
          new Promise(resolve => {
            if (img.complete && img.naturalHeight !== 0) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
        )
      ),
      new Promise(resolve => setTimeout(resolve, timeout))
    ]);
  };

  const handleDownloadCollage = async () => {
    const element = document.getElementById('collage-preview');
    if (!element) return;
    await waitForImages(element);
    const canvas = await html2canvas(element, {
      backgroundColor: '#fff',
      scale: 2,
      useCORS: true
    });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const name = selectedCustomer?.CustomerName?.replace(/\s+/g, '_') || 'books';
    link.download = `bookerfly_${name}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <input
        type="text"
        placeholder="Search customer"
        value={customerSearch}
        onChange={(e) => setCustomerSearch(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      />
      {customerSuggestions.length > 0 && (
        <ul className="border rounded bg-white shadow max-h-40 overflow-y-auto mb-2">
          {customerSuggestions.map(c => (
            <li
              key={c.CustomerID}
              onClick={() => handleSelectCustomer(c.CustomerID)}
              className="p-2 hover:bg-blue-100 cursor-pointer"
            >
              {c.CustomerName}, {c.EmailID}
            </li>
          ))}
        </ul>
      )}

      {bookInputs.map((entry, index) => (
        <div key={index} className="flex mb-2 gap-2">
          <select
            value={entry.type}
            onChange={(e) => handleInputChange(index, 'type', e.target.value)}
            className="p-2 border rounded w-1/4"
          >
            <option value="ISBN13">ISBN13</option>
          </select>
          <input
            type="text"
            placeholder={`Book ${index + 1}`}
            value={entry.value}
            onChange={(e) => handleInputChange(index, 'value', e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button
            className="px-3 bg-blue-600 text-white rounded"
            onClick={() => {
              setTargetIndex(index);
              setScannerOpen(true);
            }}
          >📷</button>
        </div>
      ))}

      <ScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setBookInputs(prev => {
            const updated = [...prev];
            updated[targetIndex] = { ...updated[targetIndex], value: code };
            return updated;
          });
        }}
      />

      <button onClick={handleReview} className="w-full mt-2 bg-purple-600 text-white py-2 rounded">
        Review Books
      </button>

      {confirming && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Confirm Issue:</h3>
          {books.map((b, i) =>
            b.error ? (
              <p key={i} className="text-red-600">❌ {b.error}</p>
            ) : (
              <div key={i} className="flex gap-2 my-2 items-center">
                <img src={b.Thumbnail} alt={b.Title} className="w-12 h-16 object-cover border rounded" />
                <div>
                  <p className="font-bold text-sm">{b.Title}</p>
                  <p className="text-xs text-gray-600">{b.Authors}</p>
                  <p className="text-xs text-green-600">Copy #{b.CopyNumber}</p>
                </div>
              </div>
            )
          )}
          <button onClick={handleConfirm} className="w-full mt-4 bg-green-600 text-white py-2 rounded">
            ✅ Confirm Issue
          </button>
          <button onClick={handleShowCollage} className="w-full mt-2 bg-blue-500 text-white py-2 rounded">
            📸 Show Collage
          </button>
          <button onClick={handleDownloadCollage} className="w-full mt-2 bg-indigo-600 text-white py-2 rounded">
            ⬇️ Download Collage
          </button>
        </div>
      )}

      {showCollage && (
        <div id="collage-preview" className="mt-4 p-4 bg-white border rounded shadow text-center">
          <h2 className="text-lg font-bold mb-2">📚 Books from Bookerfly</h2>
          <div className="grid grid-cols-3 gap-2 justify-center">
            {books.filter(b => !b.error && b.Thumbnail?.startsWith('http')).map((book, i) => (
              <img
                key={i}
                src={book.Thumbnail.replace(/^http:/, 'https:')}
                alt={book.Title}
                className="w-24 h-36 object-cover border rounded mx-auto"
              />
            ))}
          </div>
          <p className="text-xs mt-2 text-gray-700">Delivered to: {selectedCustomer?.CustomerName}</p>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-blue-700 font-semibold">
          DEBUG: {message}
        </p>
      )}
    </div>
  );
}
