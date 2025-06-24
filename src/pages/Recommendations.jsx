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

  const handleSearch = async () => {
    setMessage('');
    const { data: catalogData } = await supabase.from('catalog').select('*').eq('ISBN13', isbn).single();

    if (catalogData) {
      setBook(catalogData);
    } else {
      const info = await fetchFromGoogleBooks(isbn);
      if (info) {
        const category = info.categories?.[0];
        let minAge = '', maxAge = '';
        if (category && CATEGORY_AGE_MAP[category]) {
          minAge = CATEGORY_AGE_MAP[category].min;
          maxAge = CATEGORY_AGE_MAP[category].max;
        }
        setBook({
          ISBN13: isbn,
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

  const handleTagChange = (tagName) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile) return book.Thumbnail || '';

    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `${isbn}_${Date.now()}.${fileExt}`;
    const filePath = `thumbnails/covers/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('bookassets').upload(filePath, thumbnailFile);
    if (uploadError) {
      setMessage('Thumbnail upload failed: ' + uploadError.message);
      return '';
    }

    const { data } = supabase.storage.from('bookassets').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    if (!book) return;
    const thumbnailUrl = await handleThumbnailUpload();
    const newBook = {
      ...book,
      Tags: selectedTags.join(','),
      ISBN13: isbn,
      MinAge: book.MinAge || 0,
      MaxAge: book.MaxAge || 18,
      Thumbnail: thumbnailUrl,
    };

    const { error: catalogError } = await supabase.from('catalog').upsert(newBook);
    if (catalogError) return setMessage('Error adding to catalog: ' + catalogError.message);

    const copyID = Date.now().toString();
    const { error: copyError } = await supabase.from('copyinfo').insert({
      CopyID: copyID,
      ISBN13: isbn,
      CopyNumber: copyNumber,
      CopyLocation: location,
      CopyLocationID: copyLocationID,
      BuyPrice: buyPrice,
      AskPrice: askPrice,
      CopyBooked: false,
    });

    if (copyError) return setMessage('Error adding copy: ' + copyError.message);

    setMessage('✅ Book and copy added successfully!');
    setBook(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setSelectedTags([]);
    setCopyLocationID('');
    setBuyPrice('');
    setAskPrice('');
  };

  const startScan = () => setShowScanner(true);
  const stopScan = async () => {
    if (scanner) {
      try { await scanner.stop(); } catch (e) { console.warn('Scanner stop error', e); }
      setScanner(null);
    }
    const el = document.getElementById('isbn-scanner');
    if (el) el.innerHTML = '';
    setShowScanner(false);
  };

  useEffect(() => {
    const initScanner = async () => {
      if (showScanner && !scanner && document.getElementById('isbn-scanner')) {
        const newScanner = new Html5Qrcode('isbn-scanner');
        setScanner(newScanner);
        try {
          await newScanner.start(
              { facingMode: 'environment' },
              { fps: 10, qrbox: 250 },
              (decodedText) => {
                setIsbn(decodedText);
                stopScan();
              },
              (err) => console.warn('Scan error', err)
          );
        } catch (err) {
          console.error('Scanner init failed', err);
          stopScan();
        }
      }
    };
    initScanner();
  }, [showScanner]);

  const handleSuggestionSelect = (suggestion) => {
    setIsbn(suggestion.ISBN13);
    setSuggestions([]);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (isbn.length < 3) return setSuggestions([]);
      const { data } = await supabase
        .from('catalog')
        .select('ISBN13, Title')
        .ilike('Title', `%${isbn}%`)
        .limit(10);

      const { data: byIsbn } = await supabase
        .from('catalog')
        .select('ISBN13, Title')
        .ilike('ISBN13', `%${isbn}%`)
        .limit(10);

      const combined = [...(data || []), ...(byIsbn || [])];
      const unique = Array.from(new Map(combined.map(item => [item.ISBN13, item])).values());
      setSuggestions(unique);
    };
    fetchSuggestions();
  }, [isbn]);

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8 relative">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Add Book by ISBN</h2>

      <div className="flex gap-2 mb-2 relative">
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="Enter ISBN13 or Title"
          className="w-full p-2 border border-gray-300 rounded"
        />
        <button onClick={startScan} className="bg-purple-600 text-white px-3 rounded">📷</button>
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded shadow z-10 max-h-60 overflow-y-auto">
            {suggestions.map((s) => (
              <li
                key={s.ISBN13}
                onClick={() => handleSuggestionSelect(s)}
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {s.Title} ({s.ISBN13})
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-2 rounded mb-4">Search</button>

      {/* The rest of your component remains unchanged */}

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow max-w-sm w-full relative">
            <button
              onClick={stopScan}
              className="absolute top-1 right-2 text-red-600 text-xl"
            >✖</button>
            <p className="text-center text-sm font-medium mb-2">Scan ISBN Barcode</p>
            <div id="isbn-scanner" className="w-full h-[300px]"></div>
          </div>
        </div>
      )}
    </div>
  );
}
