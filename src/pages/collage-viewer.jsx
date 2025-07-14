// pages/collage-viewer.jsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function CollageViewer() {
  const router = useRouter();
  const [images, setImages] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (router.isReady) {
      const params = new URLSearchParams(window.location.search);
      const encodedImages = params.get('images');
      const customerName = params.get('name');
      try {
        const decoded = JSON.parse(decodeURIComponent(encodedImages || '[]'));
        setImages(decoded || []);
        setName(customerName || '');
      } catch (err) {
        console.error('Error decoding images', err);
      }
    }
  }, [router.isReady]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <h1 className="text-xl font-semibold mb-4 text-center">
        📚 Books from Bookerfly for <span className="text-purple-600">{name}</span>
      </h1>
      <div className="grid grid-cols-3 gap-4">
        {images.map((src, i) => (
          <img
            key={i}
            src={src.startsWith('http:') ? src.replace('http:', 'https:') : src}
            alt={`Book ${i + 1}`}
            className="w-28 h-40 object-cover border rounded shadow"
          />
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-6">
        Screenshot this page or share it with the customer
      </p>
    </div>
  );
}
