import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 2000;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [readISBNs, setReadISBNs] = useState([]);
  const [requestedISBNs, setRequestedISBNs] = useState([]);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [loading, setLoading] = useState(true);
  const [addedRequests, setAddedRequests] = useState({});

  useEffect(() => {
    if (user?.email) {
      fetchUserBookData(user.email);
    } else {
      setReadISBNs([]);
      setRequestedISBNs([]);
    }
  }, [user]);

  useEffect(() => {
    if (readISBNs && requestedISBNs) {
      loadBooks();
    }
  }, [page, appliedFilters, readISBNs, requestedISBNs]);

  const fetchUserBookData = async (email) => {
    const { data: customer, error } = await supabase
      .from('customerinfo')
      .select('userid')
      .eq('EmailID', email)
      .single();

    if (error || !customer) {
      setReadISBNs([]);
      setRequestedISBNs([]);
      return;
    }

    const userid = customer.userid;

    const [{ data: readHistory }, { data: futureRequests }] = await Promise.all([
      supabase.from('circulationhistory').select('ISBN13').eq('userid', userid),
      supabase.from('circulationfuture').select('ISBN13').eq('userid', userid),
    ]);

    const readSet = new Set((readHistory || []).map(b => b.ISBN13?.trim().toLowerCase()).filter(Boolean));
    const requestedSet = new Set((futureRequests || []).map(b => b.ISBN13?.trim().toLowerCase()).filter(Boolean));

    setReadISBNs(readSet);
    setRequestedISBNs(requestedSet);

    console.log('Books read by user:', [...readSet]);
    console.log('Books already requested by user:', [...requestedSet]);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
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

    const { data: existingRequests, error: serialFetchError } = await supabase
      .from('circulationfuture')
      .select('SerialNumberOfIssue')
      .eq('ISBN13', book.ISBN13)
      .eq('userid', userID)
      .order('SerialNumberOfIssue', { ascending: false })
      .limit(1);

    if (serialFetchError) {
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
      alert('Failed to add request.');
      return;
    }

    setAddedRequests(prev => ({ ...prev, [book.ISBN13]: true }));
  };

  const loadBooks = async () => {
    setLoading(true);

    let query = supabase
      .from('catalog')
      .select('BookID,ISBN13,Title,Authors,MinAge,MaxAge,Thumbnail,Description')
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (appliedFilters) {
      const { minAge, maxAge, author, title } = appliedFilters;

      let min = minAge ? parseInt(minAge) : null;
      let max = maxAge ? parseInt(maxAge) : null;

      if (min !== null && max === null) {
        max = min;
      } else if (max !== null && min === null) {
        min = Math.max(0, max - 3);
      }

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

    const filteredBooks = catalogBooks.filter(book => {
      const isbn = book.ISBN13?.trim().toLowerCase();
      return isbn && availabilityMap[book.ISBN13] && !readISBNs.has(isbn) && !requestedISBNs.has(isbn);
    });

    filteredBooks.forEach(book => book.minPrice = priceMap[book.ISBN13] ?? null);
    const randomized = filteredBooks.sort(() => 0.5 - Math.random());
    setBooks(randomized.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    setLoading(false);
  };

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const toggleDescription = (id) => setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-pink-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center text-purple-700">Bookerfly Kids Library - Book Catalog</h1>

      {/* ... filter UI code ... */}

      {loading ? (
        <p>Loading...</p>
      ) : books.length === 0 ? (
        <div>No books found.</div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {books.map(book => {
            const isbn = book.ISBN13?.trim().toLowerCase();
            const isDisabled = readISBNs.has(isbn) || requestedISBNs.has(isbn);
            const label = readISBNs.has(isbn)
              ? 'Already read'
              : requestedISBNs.has(isbn)
              ? 'Already requested'
              : addedRequests[book.ISBN13]
              ? 'Added to your future requests :-)'
              : 'Request for Me';

            return (
              <div key={book.BookID} className="bg-white rounded-xl p-4 shadow-md flex flex-col">
                <img src={book.Thumbnail} alt={book.Title} className="h-60 object-contain mb-2 mx-auto" />
                <h2 className="text-lg font-bold text-purple-800">{book.Title}</h2>
                <p className="text-sm text-gray-600 italic">{book.Authors}</p>
                <p className="text-xs text-gray-800 mt-1">{book.Description}</p>
                <p className="text-sm text-gray-700 mt-1">Age Group: {book.MinAge} - {book.MaxAge}</p>
                <button
                  onClick={() => handleBookRequest(book)}
                  className={`text-white px-3 py-1 mt-2 rounded text-xs w-fit ${isDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'}`}
                  disabled={isDisabled}
                >
                  {label}
                </button>
              </div>
            );
          })}
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
