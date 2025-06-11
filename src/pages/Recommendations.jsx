import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScannerHTML5() {
  const [scannedCode, setScannedCode] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const startScanner = async () => {
    const config = { fps: 10, qrbox: 250 };

    html5QrCodeRef.current = new Html5Qrcode("scanner");
    html5QrCodeRef.current.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        setScannedCode(decodedText);
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
        });
      },
      (errorMessage) => {
        // Ignore scan errors
      }
    );
  };

  const stopScanner = () => {
    html5QrCodeRef.current?.stop().then(() => {
      html5QrCodeRef.current?.clear();
    });
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="max-w-md mx-auto mt-6 p-4 border shadow rounded">
      <h2 className="text-xl font-bold mb-2 text-center">Scan ISBN</h2>
      <button
        onClick={startScanner}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-2 w-full"
      >
        Start Scanning
      </button>
      <div id="scanner" className="w-full h-64 rounded bg-gray-100 mb-2" />
      {scannedCode && (
        <div className="text-green-600 text-center">
          ✅ Scanned: <strong>{scannedCode}</strong>
        </div>
      )}
    </div>
  );
}
