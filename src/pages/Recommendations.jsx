// Updated AdminAddBook.jsx with working autocomplete and ISBN-only set
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const inputRef = useRef();

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

  const handleSearch = async (selectedISBN = null) => {
    setMessage('');
    const queryISBN = selectedISBN || isbn;
    setIsbn(queryISBN);

    const { data: catalogData } = await supabase.from('catalog').select('*').eq('ISBN13', queryISBN).single();

    if (catalogData) {
      setBook(catalogData);
    } else {
      const info = await fetchFromGoogleBooks(queryISBN);
      if (info) {
        setBook({
          ISBN13: queryISBN,
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
          ISBN13: queryISBN,
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
      .eq('ISBN13', queryISBN)
      .eq('CopyLocation', loc);

    setCopyNumber((existingCopies?.length || 0) + 1);
  };

  const handleAutocomplete = async (term) => {
    if (!term || term.trim().length < 2) return setSuggestions([]);
    const { data } = await supabase
      .from('catalog')
      .select('ISBN13, Title')
      .or(`Title.ilike.%${term}%,ISBN13.ilike.%${term}%`)
      .limit(10);
    setSuggestions(data || []);
  };

  const handleTagChange = (tagName) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
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

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile) return book.Thumbnail || '';
    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `${isbn}_${Date.now()}.${fileExt}`;
    const filePath = `thumbnails/covers/${fileName}`;
    const { error } = await supabase.storage.from('bookassets').upload(filePath, thumbnailFile);
    if (error) return '';
    const { data } = supabase.storage.from('bookassets').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8 relative">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Add Book by ISBN</h2>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isbn}
          onChange={(e) => {
            setIsbn(e.target.value);
            handleAutocomplete(e.target.value);
          }}
          placeholder="Enter ISBN13 or Title"
          className="w-full p-2 border border-gray-300 rounded"
        />
        {suggestions.length > 0 && (
          <ul className="absolute bg-white border rounded shadow max-h-48 overflow-auto w-full z-10">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                onClick={() => {
                  setIsbn(s.ISBN13);
                  setSuggestions([]);
                  handleSearch(s.ISBN13);
                }}
              >
                <strong>{s.Title}</strong> — {s.ISBN13}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={() => handleSearch()} className="w-full bg-blue-600 text-white py-2 rounded mt-2 mb-4">Search</button>
      {/* Remainder of book editing UI stays unchanged */}
      {/* ... */}
    </div>
  );
}
