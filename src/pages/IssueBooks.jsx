// Full updated IssueBooks.jsx with proxy for collage thumbnails and html2canvas logging

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
      const { data, error } = await supabase
          .from('customerinfo')
          .select('CustomerID, CustomerName, EmailID')
          .or(orClause.join(','))
          .limit(10);
      setCustomerSuggestions(error ? [] : data || []);
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

  const waitForImages = (element) => {
    const images = element.querySelectorAll('img');
    return Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
    );
  };

  const handleDownloadCollage = async () => {
    console.log('📸 Download button clicked');
    const element = document.getElementById('collage-preview');
    if (!element) {
      console.warn('Collage element not found');
      return;
    } else {
      console.log('element found:', element);
    }

    await waitForImages(element);

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#fff',
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      console.log('🖼️ Data URL length:', dataUrl.length);

      const link = document.createElement('a');
      const name = selectedCustomer?.CustomerName?.replace(/\s+/g, '_') || 'books';
      link.download = `bookerfly_${name}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      console.log("✅ Download triggered");
    } catch (err) {
      console.error('❌ html2canvas error:', err);
    }
  };

  return (
      <div className="max-w-md mx-auto p-4">
        {/* your existing UI remains unchanged */}

        {/* COLLAGE PREVIEW */}
        <div
            id="collage-preview"
            className="p-4 bg-white w-fit text-center"
            style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
        >
          <h2 className="text-base font-bold mb-2">📚 Books from Bookerfly</h2>
          <div className="grid grid-cols-3 gap-2">
            {books.filter(b => !b.error && b.Thumbnail?.startsWith('http')).map((book, index) => (
                <img
                    key={book.ISBN13 || index}
                    src={`https://bookerfly-proxy.onrender.com/proxy?url=${encodeURIComponent(book.Thumbnail.replace(/^http:/, 'https:'))}`}
                    alt={book.Title}
                    className="w-24 h-36 object-cover border border-gray-300 rounded"
                />
            ))}
          </div>
          <p className="text-xs mt-2 text-gray-700">Delivered to: {selectedCustomer?.CustomerName}</p>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
      </div>
  );
}
