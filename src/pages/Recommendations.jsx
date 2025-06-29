import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [loading, setLoading] = useState(true);
  const [addedRequests, setAddedRequests] = useState({});

  const getUserIdFromEmail = async (email) => {
    if (!email) return null;
    const { data, error } = await supabase
        .from('customerinfo')
        .select('userid')
        .eq('EmailID', email)
        .single();
    return error ? null : data?.userid;
  };

  useEffect(() => {
    loadBooks();
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const toggleDescription = (id) => {
    setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBookRequest = async (book) => {
    if (!user?.email) {
      alert('Please log in to request a book.');
      return;
    }

    const { data: customer, error: customerError } = await supabase
        .from('customerinfo')
        .select('userid')
        .eq('EmailID', user.email)
        .single();

    if (customerError || !customer) {
      alert('User not found in customerinfo.');
      return;
    }

    const userID = customer.userid;

    const { data: existingRequests } = await supabase
        .from('circulationfuture')
        .select('SerialNumberOfIssue')
        .eq('ISBN13', book.ISBN13)
        .eq('userid', userID)
        .order('SerialNumberOfIssue', { ascending: false })
        .limit(1);

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
      alert('Failed to add request.');
      return;
    }

    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
  };

  const loadBooks = async () => {
    setLoading(true);

    const userId = user?.email ? await getUserIdFromEmail(user.email) : null;

    const age = parseInt(appliedFilters?.minAge);
    const minAge = isNaN(age) ? null : age;
    const maxAge = minAge !== null ? minAge + 2 : null;

    const response = await fetch('/functions/v1/get-random-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userid: userId,
        minAge,
        maxAge,
        limit: 200
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch catalog:', result.error);
      setBooks([]);
    } else {
      setBooks(result);
    }

    setLoading(false);
  };

  return (
      <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-pink-50 min-h-screen">
        <h1 className="text-3xl font-bold mb-4 text-center text-purple-700">Bookerfly Kids Library - Book Catalog</h1>

        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
                type="number"
                placeholder="Enter child's age"
                className="input"
                value={filters.minAge}
                onChange={e => handleFilterChange('minAge', e.target.value)}
            />
            <input
                type="text"
                placeholder="Author"
                className="input"
                value={filters.author}
                onChange={e => handleFilterChange('author', e.target.value)}
            />
            <input
                type="text"
                placeholder="Title"
                className="input"
                value={filters.title}
                onChange={e => handleFilterChange('title', e.target.value)}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-800"
                onClick={applyFilters}
            >
              Apply Filters
            </button>
            <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
                onClick={() => {
                  setFilters({ minAge: '', maxAge: '', author: '', title: '' });
                  setAppliedFilters(null);
                }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {loading ? (
            <p>Loading...</p>
        ) : books.length === 0 ? (
            <div className="flex flex-col items-center mt-12 animate-fade-in">
              <div className="text-6xl mb-4">📚❓</div>
              <h2 className="text-xl font-semibold text-gray-700">No books found</h2>
              <p className="text-sm text-gray-500 mt-1 text-center max-w-md">
                Try adjusting your filters, or check back later — we're always adding more stories to our shelves!
              </p>
            </div>
        ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {books.map(book => (
                  <div key={book.BookID} className="bg-white rounded-xl p-4 shadow-md flex flex-col">
                    <img src={book.Thumbnail} alt={book.Title} className="h-40 object-contain mb-2 mx-auto" />
                    <h2 className="text-lg font-bold text-purple-800">{book.Title}</h2>
                    <p className="text-sm text-gray-600 italic">{book.Authors}</p>
                    <p className="text-xs text-gray-800 mt-1">
                      {book.Description?.length > 120 ? (
                          expandedDesc[book.BookID] ? book.Description : `${book.Description?.substring(0, 120)}... `
                      ) : book.Description}
                      {book.Description?.length > 120 && (
                          <span onClick={() => toggleDescription(book.BookID)} className="text-blue-500 cursor-pointer underline">more</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">Age Group: {book.MinAge} - {book.MaxAge}</p>
                    <button
                        onClick={() => handleBookRequest(book)}
                        className="text-white bg-blue-500 px-3 py-1 mt-2 rounded hover:bg-blue-700 text-xs w-fit"
                    >
                      {addedRequests[book.ISBN13] ? 'Added to your future requests :-)' : 'Request for Me'}
                    </button>
                    <div className="mt-2 text-xs text-gray-700">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {book.MinPrice && <span className="text-green-600 font-semibold">Buy from us at ₹{book.MinPrice}</span>}
                        <a
                            href={`https://www.amazon.in/s?k=${encodeURIComponent(book.Title + ' ' + book.ISBN13)}&tag=vandana1230b9-21`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-orange-600 hover:underline"
                        >
                          Buy on Amazon <FaExternalLinkAlt />
                        </a>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
  );
}
