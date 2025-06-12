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
        setMessage('Book not found in Google Books API.');
        return;
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

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-8">
      <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">Add Book by ISBN</h2>
      <input
        type="text"
        value={isbn}
        onChange={(e) => setIsbn(e.target.value)}
        placeholder="Enter ISBN13"
        className="w-full p-2 border border-gray-300 rounded mb-2"
      />
      <button onClick={handleSearch} className="w-full bg-blue-600 text-white py-2 rounded">Search</button>

      {book && (
        <div className="mt-4 space-y-2">
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

              if (file) {
                setThumbnailPreview(URL.createObjectURL(file));
              } else {
                setThumbnailPreview(null);
              }
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

          <label className="block mt-2 text-sm font-semibold">Copy Location ID</label>
          <input
            type="text"
            value={copyLocationID}
            onChange={(e) => setCopyLocationID(e.target.value)}
            placeholder="Enter Copy Location ID"
            className="w-full p-2 border border-gray-300 rounded"
          />

          <label className="block mt-2 text-sm font-semibold">Buy Price</label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="Enter Buy Price"
            className="w-full p-2 border border-gray-300 rounded"
          />

          <label className="block mt-2 text-sm font-semibold">Ask Price</label>
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
    </div>
  );
}
