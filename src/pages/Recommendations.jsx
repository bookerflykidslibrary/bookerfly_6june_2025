// Catalog.jsx
import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [addedRequests, setAddedRequests] = useState({});
  const [requestedCount, setRequestedCount] = useState(0);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const { data, error } = await supabase.from('catalog').select('*');
    if (error) {
      console.error('Error fetching catalog:', error);
    } else {
      console.log('Catalog data fetched:', data);
      setBooks(data);
    }

    if (user?.email) {
      const { data: customer, error: customerError } = await supabase
        .from('customerinfo')
        .select('userid')
        .eq('EmailID', user.email)
        .single();

      if (!customerError && customer?.userid) {
        const { data: futureBooks, error: futureError } = await supabase
          .from('circulationfuture')
          .select('ISBN13')
          .eq('userid', customer.userid);

        const { data: historyBooks, error: historyError } = await supabase
          .from('circulationhistory')
          .select('ISBN13')
          .eq('MemberID', customer.userid);

        if (!futureError && !historyError) {
          const futureISBNs = futureBooks.map(b => b.ISBN13);
          const historyISBNs = historyBooks.map(b => b.ISBN13);
          const added = {};
          futureISBNs.forEach(isbn => (added[isbn] = true));
          historyISBNs.forEach(isbn => (added[isbn] = true));
          setAddedRequests(added);
          setRequestedCount(futureISBNs.length);
          console.log('Future requests:', futureISBNs);
          console.log('Previously read:', historyISBNs);
        }
      }
    }
  };

  const handleBookRequest = async (book) => {
    if (!user?.email) {
      alert('Please log in to request a book.');
      return;
    }

    const { data: customer, error: customerError } = await supabase
      .from('customerinfo')
      .select('userid, planid')
      .eq('EmailID', user.email)
      .single();

    if (customerError || !customer) {
      console.error('Error fetching customer info:', customerError);
      alert('User not found in customerinfo.');
      return;
    }

    const userID = customer.userid;
    const planID = customer.planid;

    console.log('User ID:', userID, 'Plan ID:', planID);

    const { data: plan, error: planError } = await supabase
      .from('membershipplans')
      .select('NumberOfBooks')
      .eq('planid', planID)
      .single();

    if (planError || !plan) {
      console.error('Error fetching membership plan:', planError);
      alert('Could not retrieve plan limits.');
      return;
    }

    const maxBooks = plan.NumberOfBooks;
    console.log('Plan allows max books:', maxBooks);

    const { data: currentRequests, error: requestCountError } = await supabase
      .from('circulationfuture')
      .select('id')
      .eq('userid', userID);

    if (requestCountError) {
      console.error('Error counting requests:', requestCountError);
      alert('Failed to verify current requests.');
      return;
    }

    const currentCount = currentRequests.length;
    console.log(`User has ${currentCount} active requests.`);

    if (currentCount >= maxBooks) {
      alert(`You've reached your plan limit of ${maxBooks} requested books.`);
      return;
    }

    const { data: existingRequests, error: serialFetchError } = await supabase
      .from('circulationfuture')
      .select('SerialNumberOfIssue')
      .eq('ISBN13', book.ISBN13)
      .eq('userid', userID)
      .order('SerialNumberOfIssue', { ascending: false })
      .limit(1);

    if (serialFetchError) {
      console.error('Error checking existing serial:', serialFetchError);
      alert('Could not check existing requests.');
      return;
    }

    const nextSerial = (existingRequests?.[0]?.SerialNumberOfIssue ?? 0) + 1;

    const { error: insertError } = await supabase
      .from('circulationfuture')
      .insert({
        ISBN13: book.ISBN13,
        CopyNumber: null,
        SerialNumberOfIssue: nextSerial,
        userid: userID
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      alert('Failed to add request.');
      return;
    }

    console.log(`Book ${book.Title} requested successfully!`);
    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
    setRequestedCount(prev => prev + 1);
  };

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleBooks = books.slice(start, end);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Bookerfly Kids Library - Book Catalog</h1>
      <p className="mb-4">Books requested so far: {requestedCount}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleBooks.map(book => (
          <div key={book.ISBN13} className="border rounded p-2 shadow">
            <img src={book.Thumbnail} alt={book.Title} className="w-full h-40 object-cover mb-2" />
            <h2 className="font-semibold text-sm mb-1">{book.Title}</h2>
            <p className="text-xs text-gray-600 mb-1">{book.Authors}</p>
            <button
              className={`mt-2 text-xs px-2 py-1 rounded ${addedRequests[book.ISBN13] ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white'}`}
              onClick={() => handleBookRequest(book)}
              disabled={addedRequests[book.ISBN13]}
            >
              {addedRequests[book.ISBN13] ? 'Requested / Read' : 'Book for me'}
            </button>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(book.Title + ' book')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-xs flex items-center gap-1 mt-1"
            >
              Google it <FaExternalLinkAlt className="inline-block" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
