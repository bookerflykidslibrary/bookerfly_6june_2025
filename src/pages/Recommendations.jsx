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
  const [copyLocationID, setCopyLocationID] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTagsAndLocations = async () => {
      const { data: tagList } = await supabase.from('tags').select('*');
      setTags(tagList || []);

      const { data: locationList } = await supabase.from('locations').select('*');
      setLocations(locationList || []);
    };
    fetchTagsAndLocations();
  }, []);

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const fetchFromGoogleBooks = async (isbn) => {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const json = await res.json();
    return json.items?.[0]?.volumeInfo;
  };

  const handleSearch = async () => {
    setMessage('');
    const { data: catalogData } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();

    if (catalogData) {
      setBook(catalogData);
    } else {
      const info = await fetchFromGoogleBooks(isbn);
      if (info) {
        setBook({
          ISBN13: isbn,
          Title: info.title || '',
          Authors: info.authors?.join(', ') || '',
          Description: info.description || '',
          Thumbnail: info.imageLinks?.thumbnail || '',
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
        setMessage('Google Books data not found. Please fill the form manually.');
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

          {/* Add more input fields as needed */}
        </div>
      )}
    </div>
  );
}
