import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import supabase from '../utils/supabaseClient';

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

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (isbn.length < 2) return setSuggestions([]);
      const { data } = await supabase
        .from('catalog')
        .select('ISBN13, Title')
        .or(`Title.ilike.%${isbn}%,ISBN13.ilike.%${isbn}%`)
        .limit(10);
      setSuggestions(data || []);
    };
    fetchSuggestions();
  }, [isbn]);

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

    const { error: uploadError } = await supabase.storage
      .from('bookassets')
      .upload(filePath, thumbnailFile);

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

  const startScan = () => {
    setShowScanner(true);
  };

  const stopScan = async () => {
    if (scanner) {
      try {
        await scanner.stop();
      } catch (e) {
        console.warn('Scanner stop error', e);
      }
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
            (err) => {
              console.warn('Scan error', err);
            }
          );
        } catch (err) {
          console.error('Scanner init failed', err);
          stopScan();
        }
      }
    };
    initScanner();
  }, [showScanner]);

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
          <ul className="absolute top-full left-0 right-0 bg-white border z-10 max-h-48 overflow-auto">
            {suggestions.map((s) => (
              <li
                key={s.ISBN13}
                onClick={() => {
                  setIsbn(s.ISBN13);
                  setSuggestions([]);
                }}
                className="p-2 hover:bg-blue-100 cursor-pointer"
              >
                {s.Title} — {s.ISBN13}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-2 rounded mb-4">Search</button>

      {message && <p className="text-center text-blue-700 mb-2 font-semibold">{message}</p>}

      {/* existing book editing/adding UI here */}
    </div>
  );
}
