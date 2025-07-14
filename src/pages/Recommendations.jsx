// Full updated IssueBooks.jsx component with collage generation and display support

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
      const { data, error } = await supabase
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
      setShowCollage(false);
    } else {
      setMessage('Error issuing books: ' + error.message);
    }
  };

  const handleShowCollage = () => {
    setShowCollage(true);
  };

  // ... keep handleDownloadCollage and waitForImages unchanged ...

  // Then inside your JSX buttons, you can use `handleShowCollage` where needed
