import React, { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';

export default function AdminAddBook() {
  const [isbn, setIsbn] = useState('');
  const [book, setBook] = useState(null);
  const [tags, setTags] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('');
  const [copyNumber, setCopyNumber] = useState(1);
  const [buyPrice, setBuyPrice] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [message, setMessage] = useState('');

  // Fetch tags and locations on mount
  useEffect(() => {
    const fetchTagsAndLocations = async () => {
      const { data: tagList } = await supabase.from('tags').select('*');
      setTags(tagList || []);

      const { data: locationList } = await supabase.from('locations').select('*');
      setLocations(locationList || []);
    };
    fetchTagsAndLocations();
  }, []);

  // Clean up thumbnail preview
  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  // Fetch book info from Supabase Edge Function
  const handleSearch = async () => {
    setMessage('');
    try {
      const response = await fetch(
        'https://sawufgyypmprtnuwvgnd.supabase.co/functions/v1/get-catalog-by-isbn-ts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.REACT_APP_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ isbn })
        }
      );

      const result = await response.json();

      if (response.ok && result) {
        setBook({
          ISBN13: isbn,
          Title: result.title || '',
          Authors: result.authors?.join(', ') || '',
          Description: result.description || '',
          Thumbnail: result.thumbnail || '',
          MinAge: '',
          MaxAge: '',
          Reviews: '',
          Tags: [],
        });
      } else {
        setBook({
          ISBN13: isbn,
          Title: '',
          Authors: '',
          Description: '',
          Thumbnail: '',
          MinAge: '',
          MaxAge: '',
          Reviews: '',
          Tags: [],
        });
        setMessage('Book not found. Please fill manually.');
      }
    } catch (err) {
      console.error('Edge Function Error:', err);
      setMessage('Error calling edge function.');
    }

    // Get admin location and existing copies
    const { data: { user } } = await supabase.auth.getUser();

    const { data: admin } = await supabase
      .from('admininfo')
      .select('AdminLocation')
      .eq('AdminID', user.id)
      .single();

    const loc = admin?.AdminLocation || '';
    setLocation(loc);

    const { data: existingCopies } = await supabase
      .from('copyinfo')
      .select('*')
      .eq('ISBN13', isbn)
      .eq('CopyLocation', loc);

    setCopyNumber((existingCopies?.length || 0) + 1);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Admin: Add Book</h1>

      <input
        type="text"
        value={isbn}
        onChange={(e) => setIsbn(e.target.value)}
        placeholder="Enter ISBN13"
        className="border p-2 rounded w-full mb-2"
      />
      <button
        onClick={handleSearch}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700"
      >
        Search Book
      </button>

      {message && <div className="text-red-600 mb-2">{message}</div>}

      {book && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold">Title</label>
            <input
              type="text"
              value={book.Title}
              onChange={(e) => setBook({ ...book, Title: e.target.value })}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold">Authors</label>
            <input
              type="text"
              value={book.Authors}
              onChange={(e) => setBook({ ...book, Authors: e.target.value })}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold">Description</label>
            <textarea
              value={book.Description}
              onChange={(e) => setBook({ ...book, Description: e.target.value })}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold">Thumbnail</label>
            <img src={book.Thumbnail} alt="Book Thumbnail" className="h-32 my-2" />
          </div>

          <div>
            <label className="block text-sm font-semibold">Age Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min Age"
                value={book.MinAge}
                onChange={(e) => setBook({ ...book, MinAge: e.target.value })}
                className="border px-2 py-1 rounded w-full"
              />
              <input
                type="number"
                placeholder="Max Age"
                value={book.MaxAge}
                onChange={(e) => setBook({ ...book, MaxAge: e.target.value })}
                className="border px-2 py-1 rounded w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold">Location: {location}</label>
            <label className="block text-sm">Copy Number: {copyNumber}</label>
          </div>

          <div>
            <label className="block text-sm font-semibold">Select Tags</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map((tag) => (
                <button
                  key={tag.TagName}
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag.TagName)
                        ? prev.filter((t) => t !== tag.TagName)
                        : [...prev, tag.TagName]
                    )
                  }
                  className={`px-2 py-1 rounded-full border ${
                    selectedTags.includes(tag.TagName)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tag.TagName}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold">Buy Price</label>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold">Ask Price</label>
            <input
              type="number"
              value={askPrice}
              onChange={(e) => setAskPrice(e.target.value)}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          {/* Add form submit handler if needed */}
        </div>
      )}
    </div>
  );
}
