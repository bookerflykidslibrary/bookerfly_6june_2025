import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { FaExternalLinkAlt } from 'react-icons/fa';

const PAGE_SIZE = 50;

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ minAge: '', maxAge: '', author: '', title: '' });
  const [hiddenRead, setHiddenRead] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, [page, filters]);

  const loadBooks = async () => {
    setLoading(true);

    let readISBNs = [];
    if (user) {
      const { data: customer } = await supabase
        .from('customerinfo')
        .select('CustomerID')
        .or(`EmailID.eq.${user.email},MobileNumber.eq.${user.phone}`)
        .single();

      if (customer) {
        const { data: readHistory } = await supabase
          .from('circulationhistory')
          .select('ISBN13')
          .eq('MemberID', customer.CustomerID);
        readISBNs = readHistory.map(b => b.ISBN13);
        if (readISBNs.length) setHiddenRead(true);
      }
    }

    let query = supabase
      .from('catalog')
      .select('*')
      .limit(PAGE_SIZE);

    const { minAge, maxAge, author, title } = filters;
    const filtersList = [];
    if (minAge) filtersList.push(`MinAge.gte.${minAge}`);
    if (maxAge) filtersList.push(`MaxAge.lte.${maxAge}`);
    if (author) filtersList.push(`Authors.ilike.%${author}%`);
    if (title) filtersList.push(`Title.ilike.%${title}%`);

    if (filtersList.length) {
      query = query.or(filtersList.join(','));
    }

    let { data: catalogBooks } = await query;

    const filteredBooks = [];
    for (const book of catalogBooks.sort(() => 0.5 - Math.random())) {
      const { data: copies } = await supabase
        .from('copyinfo')
        .select('CopyBooked, AskPrice')
        .eq('ISBN13', book.ISBN13);

      const available = copies?.some(c => !c.CopyBooked);
      if (!available) continue;

      if (readISBNs.includes(book.ISBN13)) continue;

      const minPrice = Math.min(...(copies?.map(c => c.AskPrice).filter(Boolean) ?? []));
      book.minPrice = isFinite(minPrice) ? minPrice : null;
      filteredBooks.push(book);

      if (!book.Thumbnail || !book.Description) {
        const enriched = await fetchGoogleBooks(book.ISBN13);
        if (enriched) {
          await supabase.from('catalog').update({
            Thumbnail: enriched.thumbnail,
            Description: enriched.description,
          }).eq('ISBN13', book.ISBN13);
          book.Thumbnail = enriched.thumbnail;
          book.Description = enriched.description;
        }
      }

      if (filteredBooks.length === PAGE_SIZE) break;
    }

    setBooks(filteredBooks);
    setLoading(false);
  };

  const fetchGoogleBooks = async (isbn) => {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const json = await res.json();
      const item = json.items?.[0]?.volumeInfo;
      if (!item) return null;
      return {
        thumbnail: item.imageLinks?.thumbnail,
        description: item.description || 'No description available.',
      };
    } catch (e) {
      console.error('Error fetching Google Books', e);
      return null;
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const toggleDescription = (id) => {
    setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-pink-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center text-purple-700">Bookerfly Kids Library - Book Catalog</h1>

      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input type="number" placeholder="Min Age" className="input" onChange={e => handleFilterChange('minAge', e.target.value)} />
          <input type="number" placeholder="Max Age" className="input" onChange={e => handleFilterChange('maxAge', e.target.value)} />
          <input type="text" placeholder="Author" className="input" onChange={e => handleFilterChange('author', e.target.value)} />
          <input type="text" placeholder="Title" className="input" onChange={e => handleFilterChange('title', e.target.value)} />
        </div>
        <button className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-800" onClick={() => loadBooks()}>
          Apply Filters
        </button>
      </div>

      {hiddenRead && <p className="text-sm text-red-600 font-medium mb-4">Hidden books already read previously by you.</p>}

      {loading ? <p>Loading...</p> : (
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
              <a href="#" className="text-white bg-blue-500 px-3 py-1 mt-2 rounded hover:bg-blue-700 text-xs w-fit">Book for Me</a>
              <div className="mt-2 text-xs text-gray-700">
                <div className="flex flex-col sm:flex-row gap-2">
                  {book.minPrice && <span className="text-green-600 font-semibold">Buy from us at ₹{book.minPrice}</span>}
                  <a href={`https://www.amazon.in/dp/${book.ISBN13}/?tag=123432543556`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-orange-600 hover:underline">
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
