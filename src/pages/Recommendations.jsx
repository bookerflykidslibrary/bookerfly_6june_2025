import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [addedRequests, setAddedRequests] = useState({});

  useEffect(() => {
    fetchBooks();
  }, [page]);

  const fetchBooks = async () => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('catalog')
      .select('*')
      .range(start, end);

    if (error) {
      console.error('Error fetching books:', error);
    } else {
      setBooks(data);
    }
  };

  const handleBookRequest = async (book) => {
    if (!user?.email) {
      alert('Please log in to request a book.');
      return;
    }

    // Step 1: Get user ID and subscription plan
    const { data: customer, error: customerError } = await supabase
      .from('customerinfo')
      .select('userid, SubscriptionPlan')
      .eq('EmailID', user.email)
      .single();

    if (customerError || !customer) {
      alert('User not found in customerinfo.');
      return;
    }

    const userID = customer.userid;
    const planName = customer.SubscriptionPlan;

    // Step 2: Get number of books allowed in the plan
    const { data: plan, error: planError } = await supabase
      .from('membershipplans')
      .select('NumberOfBooks')
      .eq('PlanName', planName)
      .single();

    if (planError || !plan) {
      alert('Subscription plan not found.');
      return;
    }

    const planLimit = plan.NumberOfBooks;

    // Step 3: Count current future requests
    const { data: currentRequests, error: countError } = await supabase
      .from('circulationfuture')
      .select('ISBN13', { count: 'exact', head: false })
      .eq('userid', userID);

    const totalRequests = currentRequests?.length ?? 0;

    if (countError) {
      alert('Failed to check existing book requests.');
      return;
    }

    const allowedLimit = planLimit + 2;

    if (totalRequests >= allowedLimit) {
      alert(`You have reached your request limit of ${allowedLimit} books.`);
      return;
    }

    // Step 4: Get next SerialNumberOfIssue for this ISBN
    const { data: existingRequests, error: serialFetchError } = await supabase
      .from('circulationfuture')
      .select('SerialNumberOfIssue')
      .eq('ISBN13', book.ISBN13)
      .eq('userid', userID)
      .order('SerialNumberOfIssue', { ascending: false })
      .limit(1);

    if (serialFetchError) {
      alert('Could not check existing requests for this book.');
      return;
    }

    const nextSerial = (existingRequests?.[0]?.SerialNumberOfIssue ?? 0) + 1;

    // Step 5: Insert request
    const { error: insertError } = await supabase
      .from('circulationfuture')
      .insert({
        ISBN13: book.ISBN13,
        CopyNumber: null,
        SerialNumberOfIssue: nextSerial,
        userid: userID
      });

    if (insertError) {
      alert('Failed to add book to your requests.');
      return;
    }

    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Bookerfly Kids Library - Book Catalog</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {books.map((book) => (
          <div key={book.ISBN13} className="border p-2 rounded shadow">
            <img src={book.Thumbnail} alt={book.Title} className="w-full h-40 object-cover mb-2" />
            <h2 className="text-sm font-semibold">{book.Title}</h2>
            <p className="text-xs text-gray-600">{book.Authors}</p>
            <button
              onClick={() => handleBookRequest(book)}
              disabled={!!addedRequests[book.ISBN13]}
              className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
            >
              {addedRequests[book.ISBN13] ? 'Added to your future requests :-)' : 'Book for me'}
            </button>
            <a
              href={`https://www.google.com/search?q=${book.Title} book`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-xs flex items-center mt-1"
            >
              More Info <FaExternalLinkAlt className="ml-1" />
            </a>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Prev
        </button>
        <span className="px-4 py-2">Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
