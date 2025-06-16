// Updated: Insert userid in circulationhistory
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

  // ... (existing code above unchanged)

  const handleConfirm = async () => {
    const today = new Date().toISOString();
    const validBooks = books.filter(b => !b.error);

    const records = validBooks.map(book => ({
      LibraryBranch: adminLocation,
      ISBN13: book.ISBN13,
      CopyID: book.CopyID,
      BookingDate: today,
      ReturnDate: null,
      MemberID: selectedCustomer.CustomerID,
      userid: selectedCustomer.userid, // ✅ Inserted here
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
        .select('CirculationID')
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
    } else {
      setMessage('Error issuing books: ' + error.message);
    }
  };

  // ... (remaining JSX code unchanged)
}
