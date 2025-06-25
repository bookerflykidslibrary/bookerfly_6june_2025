import { recommendBooks } from '../utils/recommendBooks';
import { useState } from 'react';

export default function RecommendRestButton({ userid, selectedCount, quota, childAge, onDone }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const remaining = quota - selectedCount;
    if (remaining <= 0) return;

    setLoading(true);
    try {
      await recommendBooks({ userid, remaining, childAge });
      alert("Recommended books added!");
      onDone?.(); // refresh list if callback provided
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={handleClick}
      className="ml-4 bg-purple-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
    >
      {loading ? 'Recommending...' : 'Recommend Rest'}
    </button>
  );
}
