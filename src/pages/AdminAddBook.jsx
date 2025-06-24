// AdminAddBook.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import supabase from '../utils/supabaseClient';
import imageCompression from 'browser-image-compression';

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
  const fileInputRef = useRef();

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

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleCaptureAndUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !isbn) return;

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${isbn}_${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/covers/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('bookassets').upload(filePath, compressedFile);
      if (uploadError) {
        setMessage('Thumbnail upload failed: ' + uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('bookassets').getPublicUrl(filePath);
      setThumbnailPreview(URL.createObjectURL(file));
      setThumbnailFile(null);

      if (book) {
        setBook(prev => ({ ...prev, Thumbnail: data.publicUrl }));
      }
      setMessage('📷 Thumbnail uploaded successfully!');
    } catch (err) {
      console.error('Image capture/upload error', err);
      setMessage('Image compression or upload failed');
    }
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
        const thumbnailUrl = info.imageLinks?.thumbnail || '';
        setBook({
          ISBN13: isbn,
          Title: info.title || '',
          Authors: info.authors?.join(', ') || '',
          Description: info.description || '',
          Thumbnail: thumbnailUrl,
          MinAge: minAge,
          MaxAge: maxAge,
          Reviews: '',
          Tags: [],
        });
      } else {
        setMessage('Google Books info not found. You can still enter details manually.');
        alert('No info or thumbnail found. Please click a photo of the book cover.');
        document.getElementById('thumbnail-upload')?.scrollIntoView({ behavior: 'smooth' });
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

  return (
      <div className="space-y-2">
        {thumbnailPreview ? (
            <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-24 h-auto rounded" />
        ) : (
            book?.Thumbnail && <img src={book.Thumbnail} alt="thumbnail" className="w-24 h-auto rounded" />
        )}

        <div className="flex items-center gap-2">
          <button
              type="button"
              onClick={handleCaptureClick}
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm"
          >
            📷 Capture/Upload New Thumbnail
          </button>
          <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCaptureAndUpload}
              id="thumbnail-upload"
          />
        </div>
      </div>
  );
}
