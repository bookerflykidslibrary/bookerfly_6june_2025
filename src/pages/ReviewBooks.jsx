import React, { useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function ReviewBooks({ adminLocation }) {
  const [isbnInput, setIsbnInput] = useState('');
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBookByISBN = async (isbn) => {
    setLoading(true);
    const { data: catalogData, error: catalogError } = await supabase
      .from('catalog')
      .select('*')
      .eq('ISBN13', isbn)
      .not('BookReviewed', 'is', true)
      .single();

    if (catalogError || !catalogData) {
      alert('Book not found or already reviewed.');
      setLoading(false);
      return;
    }

    const { data: copyData } = await supabase
      .from('copyinfo')
      .select('*')
      .eq('ISBN13', isbn)
      .eq('CopyLocation', adminLocation)
      .maybeSingle();

    setBookData({ ...catalogData, ...copyData });
    setLoading(false);
  };

  const fetchRandomBook = async () => {
    setLoading(true);
    const { data: catalogList } = await supabase
      .from('catalog')
      .select('*')
      .not('BookReviewed', 'is', true);

    if (!catalogList || catalogList.length === 0) {
      alert('No unreviewed books found.');
      setLoading(false);
      return;
    }

    const randomBook = catalogList[Math.floor(Math.random() * catalogList.length)];

    const { data: copyData } = await supabase
      .from('copyinfo')
      .select('*')
      .eq('ISBN13', randomBook.ISBN13)
      .eq('CopyLocation', adminLocation)
      .maybeSingle();

    setBookData({ ...randomBook, ...copyData });
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookData({ ...bookData, [name]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);

    const { ISBN13, CopyID, ...catalogFields } = bookData;

    const { error: updateCatalogErr } = await supabase
      .from('catalog')
      .update({ ...catalogFields, BookReviewed: true })
      .eq('ISBN13', ISBN13);

    const { error: updateCopyErr } = await supabase
      .from('copyinfo')
      .update({
        CopyLocation: bookData.CopyLocation,
        CopyBooked: bookData.CopyBooked === 'true' || bookData.CopyBooked === true,
        CopyLocationID: bookData.CopyLocationID,
        BuyPrice: bookData.BuyPrice,
        AskPrice: bookData.AskPrice,
      })
      .eq('CopyID', CopyID);

    if (!updateCatalogErr && !updateCopyErr) {
      alert('Book review submitted successfully!');
      setBookData(null);
    } else {
      alert('Failed to submit review.');
      console.error(updateCatalogErr, updateCopyErr);
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Review Books</h1>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={isbnInput}
          onChange={(e) => setIsbnInput(e.target.value)}
          placeholder="Enter ISBN13"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={() => fetchBookByISBN(isbnInput)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Fetch by ISBN
        </button>
        <button
          onClick={fetchRandomBook}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Display Random
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {bookData && (
        <div className="bg-white shadow p-4 rounded space-y-4">
          <div>
            <label className="block font-medium">ISBN13</label>
            <input
              type="text"
              name="ISBN13"
              value={bookData.ISBN13 || ''}
              disabled
              className="border p-2 rounded w-full bg-gray-100"
            />
          </div>

          {[
            'Title',
            'Authors',
            'Description',
            'Thumbnail',
            'Reviews',
            'Tags',
            'MinAge',
            'MaxAge',
            'CopyLocation',
            'CopyLocationID',
            'BuyPrice',
            'AskPrice'
          ].map((field) => (
            <div key={field}>
              <label className="block font-medium">{field}</label>
              {['Description', 'Reviews', 'Tags'].includes(field) ? (
                <textarea
                  name={field}
                  value={bookData[field] || ''}
                  onChange={handleChange}
                  className="border p-2 rounded w-full min-h-[100px]"
                />
              ) : (
                <input
                  type="text"
                  name={field}
                  value={bookData[field] || ''}
                  onChange={handleChange}
                  className="border p-2 rounded w-full"
                />
              )}
            </div>
          ))}

          <div>
            <label className="block font-medium">CopyBooked</label>
            <select
              name="CopyBooked"
              value={bookData.CopyBooked ? 'true' : 'false'}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            >
              <option value="false">False</option>
              <option value="true">True</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            className="bg-purple-700 text-white px-6 py-2 rounded mt-4"
          >
            Submit Review
          </button>
        </div>
      )}
    </div>
  );
}
