import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function Catalog({ user }) {
  const [books, setBooks] = useState([]);
  const [requestedISBNs, setRequestedISBNs] = useState(new Set());
  const [readISBNs, setReadISBNs] = useState(new Set());
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: allBooks, error: booksError } = await supabase
        .from('catalog')
        .select('*');

      const { data: futureData, error: futureError } = await supabase
        .from('circulationfuture')
        .select('ISBN13')
        .eq('userid', user.id);

      const { data: pastData, error: pastError } = await supabase
        .from('circulationhistory')
        .select('ISBN13')
        .eq('MemberID', user.id);

      console.log('Fetched catalog:', allBooks?.length);
      console.log('Requested books:', futureData);
      console.log('Read books:', pastData);

      setBooks(allBooks || []);
      setRequestedISBNs(new Set((futureData || []).map(b => b.ISBN13)));
      setReadISBNs(new Set((pastData || []).map(b => b.ISBN13)));
      setRequestCount((futureData || []).length);

      if (booksError || futureError || pastError) {
        console.error('Error:', booksError || futureError || pastError);
      }
    };

    fetchData();
  }, [user]);

  const handleRequest = async (isbn13) => {
    if (!user) return;

    const serialRes = await supabase.rpc('get_next_serial_for_user_book', {
      input_userid: user.id,
      input_isbn13: isbn13,
    });

    if (serialRes.error) {
      console.error('Error fetching serial:', serialRes.error);
      return;
    }

    const { data, error } = await supabase.from('circulationfuture').insert({
      isbn13,
      userid: user.id,
      copynumber: 0,
      serialnumberofissue: serialRes.data,
    });

    if (error) {
      console.error('Error requesting book:', error);
    } else {
      console.log(`Book ${isbn13} requested successfully.`);
      setRequestedISBNs(prev => new Set([...prev, isbn13]));
      setRequestCount(prev => prev + 1);
    }
  };

  const isDisabled = (isbn13) =>
    requestedISBNs.has(isbn13) || readISBNs.has(isbn13);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Bookerfly Kids Library - Book Catalog</h1>
      <p className="mb-6">Books requested: {requestCount}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {books.map((book) => (
          <div
            key={book.ISBN13}
            className="border rounded-lg p-3 flex flex-col items-center bg-white shadow"
          >
            <img
              src={book.Thumbnail}
              alt={book.Title}
              className="w-32 h-44 object-cover mb-2 rounded"
              loading="lazy"
            />
            <div className="text-center text-sm font-medium">{book.Title}</div>

            <button
              className={`mt-2 px-2 py-1 text-xs rounded ${
                isDisabled(book.ISBN13)
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={isDisabled(book.ISBN13)}
              onClick={() => handleRequest(book.ISBN13)}
            >
              {requestedISBNs.has(book.ISBN13)
                ? 'Already requested'
                : readISBNs.has(book.ISBN13)
                ? 'Already read'
                : 'Book for me'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
