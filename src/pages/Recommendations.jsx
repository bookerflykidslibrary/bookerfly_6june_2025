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
  const [suggestions, setSuggestions] = useState([]);
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

  useEffect(() => {
    const fetchTagsAndLocations = async () => {
      const { data: tagList } = await supabase.from('tags').select('*');
      setTags(tagList || []);
      const { data: locationList } = await supabase.from('locations').select('*');
      setLocations(locationList || []);
    };
    fetchTagsAndLocations();
  }, []);

  const handleAutocomplete = async (query) => {
    setIsbn(query);
    if (query.length < 3) return setSuggestions([]);

    const { data } = await supabase
      .from('catalog')
      .select('Title, ISBN13')
      .or(`Title.ilike.%${query}%,ISBN13.ilike.%${query}%`)
      .limit(10);
    setSuggestions(data || []);
  };

  const handleSearch = async () => {
    setMessage('');
    const { data: catalogData } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();

    if (catalogData) {
      setBook(catalogData);
    } else {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const json = await res.json();
      const info = json.items?.[0]?.volumeInfo;
      if (info) {
        const category = info.categories?.[0];
        const age = CATEGORY_AGE_MAP[category] || { min: '', max: '' };
        setBook({
          ISBN13: isbn,
          Title: info.title || '',
          Authors: info.authors?.join(', ') || '',
          Description: info.description || '',
          Thumbnail: info.imageLinks?.thumbnail || '',
          MinAge: age.min,
          MaxAge: age.max,
          Reviews: '',
          Tags: [],
        });
      } else {
        setMessage('Google Books info not found. You can still enter details manually.');
        setBook({ ISBN13: isbn, Title: '', Authors: '', Description: '', Thumbnail: '', MinAge: '', MaxAge: '', Reviews: '', Tags: [] });
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from('admininfo').select('AdminLocation').eq('AdminID', user.id).single();
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
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8 relative">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Add Book by ISBN</h2>

      <div className="flex gap-2 mb-2 relative">
        <input
          type="text"
          value={isbn}
onChange={(e) => {
  const val = e.target.value;
  setIsbn(val);
  handleAutocomplete(val);
}}
          placeholder="Enter ISBN13 or Title"
          className="w-full p-2 border border-gray-300 rounded"
        />
        <button onClick={() => setShowScanner(true)} className="bg-purple-600 text-white px-3 rounded">📷</button>
        {suggestions.length > 0 && (
          <ul className="absolute z-10 bg-white border border-gray-300 mt-10 w-full max-h-48 overflow-y-auto rounded shadow text-sm">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => {
                  setIsbn(s.ISBN13);
                  setSuggestions([]);
                }}
                className="p-2 hover:bg-blue-100 cursor-pointer"
              >
                {s.Title} ({s.ISBN13})
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-2 rounded mb-4">Search</button>
      {/* Rest of existing JSX remains unchanged */}
    </div>
  );
}
