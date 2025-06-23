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

  return (
      <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8 relative">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Add Book by ISBN</h2>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="Enter ISBN13"
          className="w-full p-2 border border-gray-300 rounded"
        />
        <button onClick={startScan} className="bg-purple-600 text-white px-3 rounded">📷</button>
      </div>

      <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-2 rounded mb-4">Search</button>

      {book && (
        <div className="space-y-2">
          {['ISBN13', 'Title', 'Authors', 'MinAge', 'MaxAge', 'Reviews'].map((field) => (
            <input
              key={field}
              type="text"
              value={book[field] || ''}
              onChange={(e) => setBook({ ...book, [field]: e.target.value })}
              placeholder={field}
              className="w-full p-2 border border-gray-300 rounded"
            />
          ))}

          <textarea
            value={book.Description || ''}
            onChange={(e) => setBook({ ...book, Description: e.target.value })}
            placeholder="Description"
            rows={6}
            className="w-full p-2 border border-gray-300 rounded resize-y"
          />

          {thumbnailPreview ? (
            <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-24 h-auto rounded" />
          ) : (
            book.Thumbnail && (
              <img src={book.Thumbnail} alt="thumbnail" className="w-24 h-auto rounded" />
            )
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              setThumbnailFile(file);
              setThumbnailPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="w-full p-2 border border-gray-300 rounded"
          />

          <label className="block mt-2 text-sm font-semibold">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.LocationName}>{loc.LocationName}</option>
            ))}
          </select>

          <label className="block text-sm font-semibold">Copy Location ID</label>
          <input
            type="text"
            value={copyLocationID}
            onChange={(e) => setCopyLocationID(e.target.value)}
            placeholder="Enter Copy Location ID"
            className="w-full p-2 border border-gray-300 rounded"
          />

          <label className="block text-sm font-semibold">Buy Price</label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="Enter Buy Price"
            className="w-full p-2 border border-gray-300 rounded"
          />

          <label className="block text-sm font-semibold">Ask Price</label>
          <input
            type="number"
            value={askPrice}
            onChange={(e) => setAskPrice(e.target.value)}
            placeholder="Enter Ask Price"
            className="w-full p-2 border border-gray-300 rounded"
          />

          <div className="mt-2">
            <p className="font-semibold">Tags:</p>
            <div className="grid grid-cols-2 gap-2">
              {tags.map((tag) => (
                <label key={tag.id} className="text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.TagName)}
                    onChange={() => handleTagChange(tag.TagName)}
                    className="mr-2"
                  />
                  {tag.TagName}
                </label>
              ))}
            </div>
          </div>

          <p className="mt-2 text-sm">Next Copy Number: <strong>{copyNumber}</strong></p>

          <button
            onClick={handleAdd}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded"
          >
            Confirm & Add Book
          </button>
        </div>
      )}

      {message && <p className="mt-4 text-green-700 text-center font-semibold">{message}</p>}

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