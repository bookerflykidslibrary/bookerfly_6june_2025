import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [hiddenRead, setHiddenRead] = useState(null);
  const [hiddenRequested, setHiddenRequested] = useState(null);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [loading, setLoading] = useState(true);
  const [addedRequests, setAddedRequests] = useState({});

  useEffect(() => {
    if (user?.email) {
      fetchReadAndRequestedBooks(user.email);
    } else {
      setHiddenRead([]);
      setHiddenRequested([]);
    }
  }, [user]);

  useEffect(() => {
    if (hiddenRead !== null && hiddenRequested !== null) {
      loadBooks();
    }
  }, [page, appliedFilters, hiddenRead, hiddenRequested]);

  const fetchReadAndRequestedBooks = async (email) => {
    const { data: customer, error } = await supabase
        .from('customerinfo')
        .select('userid, SubscriptionPlan')
        .eq('EmailID', email)
        .single();

    if (error || !customer) {
      setHiddenRead([]);
      setHiddenRequested([]);
      return;
    }

    const { data: readHistory } = await supabase
        .from('circulationhistory')
        .select('ISBN13')
        .eq('userid', customer.userid);

    const { data: futureRequests } = await supabase
        .from('circulationfuture')
        .select('ISBN13')
        .eq('userid', customer.userid);

    const { data: plan } = await supabase
        .from('membershipplans')
        .select('NumberOfBooks')
        .eq('PlanName', customer.SubscriptionPlan)
        .single();

    const readISBNs = (readHistory || [])
        .map(b => b.ISBN13?.trim().toLowerCase())
        .filter(Boolean);
    const requestedISBNs = (futureRequests || [])
        .map(b => b.ISBN13?.trim().toLowerCase())
        .filter(Boolean);

    const planLimit = parseInt(plan?.NumberOfBooks || '0');
    const isOverLimit = (futureRequests?.length || 0) >= planLimit + 2;

    console.log('Books read by user:', readISBNs);
    console.log('Books requested by user:', requestedISBNs);
    console.log('User over request limit:', isOverLimit);

    setHiddenRead(readISBNs);
    setHiddenRequested(requestedISBNs);
    setAddedRequests(Object.fromEntries(requestedISBNs.map(isbn => [isbn, true])));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const loadBooks = async () => {
    setLoading(true);
    console.log('📦 Loading books for page', page);

    let query = supabase
        .from('catalog')
        .select('BookID,ISBN13,Title,Authors,MinAge,MaxAge,Thumbnail,Description')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (appliedFilters) {
      const { minAge, maxAge, author, title } = appliedFilters;
      let min = minAge ? parseInt(minAge) : null;
      let max = maxAge ? parseInt(maxAge) : null;
      if (min !== null && max === null) max = min;
      else if (max !== null && min === null) min = Math.max(0, max - 3);
      if (min !== null) query = query.gte('MaxAge', min);
      if (max !== null) query = query.lte('MinAge', max);
      if (author) query = query.ilike('Authors', `%${author}%`);
      if (title) query = query.ilike('Title', `%${title}%`);
    }

    const { data: catalogBooks, error: catalogError } = await query;
    if (catalogError) {
      setLoading(false);
      return;
    }

    const isbnList = catalogBooks.map(book => book.ISBN13);
    const { data: copyinfo } = await supabase
        .from('copyinfo')
        .select('ISBN13, CopyBooked, AskPrice')
        .in('ISBN13', isbnList);

    const availabilityMap = {};
    const priceMap = {};
    for (const copy of copyinfo) {
      if (!availabilityMap[copy.ISBN13]) availabilityMap[copy.ISBN13] = false;
      if (!copy.CopyBooked) availabilityMap[copy.ISBN13] = true;
      if (copy.AskPrice !== null && (!priceMap[copy.ISBN13] || copy.AskPrice < priceMap[copy.ISBN13])) {
        priceMap[copy.ISBN13] = copy.AskPrice;
      }
    }

    const readSet = new Set((hiddenRead || []).map(id => id?.trim().toLowerCase()));
    const requestedSet = new Set((hiddenRequested || []).map(id => id?.trim().toLowerCase()));
    const filteredBooks = catalogBooks.filter(book => {
      const isbn = book.ISBN13?.trim().toLowerCase();
      return isbn && availabilityMap[book.ISBN13] && !readSet.has(isbn) && !requestedSet.has(isbn);
    });

    const droppedBooks = catalogBooks.filter(book => {
      const isbn = book.ISBN13?.trim().toLowerCase();
      return !isbn || !availabilityMap[book.ISBN13] || readSet.has(isbn) || requestedSet.has(isbn);
    });

    console.log('Catalog before filter:', catalogBooks.length);
    console.log('Books with available copies:', catalogBooks.filter(book => availabilityMap[book.ISBN13]).length);
    console.log('Read books (from history):', readSet);
    console.log('Requested books (from future):', requestedSet);
    console.log('Filtered catalog (after hiding read/requested):', filteredBooks.length);
    console.log('Dropped books (filtered out):', droppedBooks.map(b => b.ISBN13));

    filteredBooks.forEach(book => book.minPrice = priceMap[book.ISBN13] ?? null);

    const randomized = filteredBooks.sort(() => 0.5 - Math.random());
    setBooks(randomized.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    setLoading(false);
  };

  const handleBookRequest = async (book) => {
    alert('You have already requested or read this book.');
  };

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const toggleDescription = (id) => setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));

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
                  setPage(1);
                }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {hiddenRead?.length > 0 && (
            <p className="text-sm text-red-600 font-medium mb-4">
              Hidden books already read or requested previously by you.
            </p>
        )}

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
                    <img src={book.Thumbnail} alt={book.Title} className="h-60 object-contain mb-2 mx-auto" />
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
                        className={`text-white px-3 py-1 mt-2 rounded text-xs w-fit ${addedRequests[book.ISBN13] ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'}`}
                        disabled={addedRequests[book.ISBN13]}
                    >
                      {addedRequests[book.ISBN13] ? 'Already requested' : 'Request for Me'}
                    </button>
                    <div className="mt-2 text-xs text-gray-700">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {book.minPrice && <span className="text-green-600 font-semibold">Buy from us at ₹{book.minPrice}</span>}
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

        <div className="mt-6 flex justify-between items-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn">Previous</button>
          <span className="text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} className="btn">Next</button>
        </div>
      </div>
  );
}
