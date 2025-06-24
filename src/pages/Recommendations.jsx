// AdminAddBook.jsx
import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import supabase from '../utils/supabaseClient';

const CATEGORY_AGE_MAP = {
  'Juvenile Fiction': { min: 8, max: 12 },
  'Young Adult': { min: 13, max: 18 },
  "Children's Books": { min: 4, max: 8 },
  'Board Book': { min: 0, max: 3 },
  'Picture Book': { min: 3, max: 6 },
  'Early Reader': { min: 5, max: 7 },
};

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
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  const fetchFromGoogleBooks = async (isbn) => {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const json = await res.json();
    return json.items?.[0]?.volumeInfo;
  };

  const handleSearch = async (manualIsbn = null) => {
    const searchIsbn = manualIsbn || isbn;
    setMessage('');
    const { data: catalogData } = await supabase.from('catalog').select('*').eq('ISBN13', searchIsbn).single();

    if (catalogData) {
      setBook(catalogData);
    } else {
      const info = await fetchFromGoogleBooks(searchIsbn);
      if (info) {
        const category = info.categories?.[0];
        let minAge = '', maxAge = '';
        if (category && CATEGORY_AGE_MAP[category]) {
          minAge = CATEGORY_AGE_MAP[category].min;
          maxAge = CATEGORY_AGE_MAP[category].max;
        }
        setBook({
          ISBN13: searchIsbn,
          Title: info.title || '',
          Authors: info.authors?.join(', ') || '',
          Description: info.description || '',
          Thumbnail: info.imageLinks?.thumbnail || '',
          MinAge: minAge,
          MaxAge: maxAge,
          Reviews: '',
          Tags: [],
        });
      } else {
        setMessage('Google Books info not found. You can still enter details manually.');
        setBook({
          ISBN13: searchIsbn,
          Title: '',
          Authors: '',
          Description: '',
          Thumbnail: '',
          MinAge: '',
          MaxAge: '',
          Reviews: '',
          Tags: [],
        });
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from('admininfo').select('AdminLocation').eq('AdminID', user.id).single();
    const loc = admin?.AdminLocation || '';
    setLocation(loc);

    const { data: existingCopies } = await supabase
      .from('copyinfo')
      .select('*')
      .eq('ISBN13', searchIsbn)
      .eq('CopyLocation', loc);

    setCopyNumber((existingCopies?.length || 0) + 1);
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setIsbn(value);
    setShowSuggestions(true);
    if (value.length > 2) {
      const { data } = await supabase
        .from('catalog')
        .select('ISBN13, Title')
        .ilike('Title', `%${value}%`);
      setSuggestions(data || []);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (s) => {
    setIsbn(s.ISBN13);
    setShowSuggestions(false);
  };

  // ... (rest of your existing unchanged functions like handleAdd, handleThumbnailUpload, scanner logic)

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8 relative">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Add Book by ISBN</h2>

      <div className="relative">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={isbn}
            onChange={handleInputChange}
            placeholder="Enter ISBN13"
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button onClick={startScan} className="bg-purple-600 text-white px-3 rounded">📷</button>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 bg-white border border-gray-300 w-full max-h-40 overflow-y-auto rounded shadow">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="p-2 cursor-pointer hover:bg-blue-100"
              >
                {s.Title} ({s.ISBN13})
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={() => handleSearch()} className="w-full bg-blue-600 text-white py-2 rounded mb-4">Search</button>

      {/* ...rest of your JSX as-is... */}
    </div>
  );
}
