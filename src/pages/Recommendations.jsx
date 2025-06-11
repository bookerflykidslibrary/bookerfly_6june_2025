import React, { useState } from 'react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";

export default function BarcodeScannerDemo() {
  const [scanning, setScanning] = useState(false);
  const [scannedISBN, setScannedISBN] = useState('');

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center">📷 Scan ISBN Demo</h2>

      <button
        onClick={() => setScanning(!scanning)}
        className="w-full mb-4 bg-blue-600 text-white py-2 rounded"
      >
        {scanning ? 'Stop Scanner' : 'Start Scanner'}
      </button>

      {scanning && (
        <BarcodeScannerComponent
          width={300}
          height={300}
          onUpdate={(err, result) => {
            if (result?.text) {
              setScannedISBN(result.text);
              setScanning(false);
            }
          }}
        />
      )}

      {scannedISBN && (
        <div className="mt-4 text-center">
          <p className="text-green-700 font-semibold">✅ Scanned ISBN:</p>
          <p className="text-xl font-mono text-blue-800">{scannedISBN}</p>
        </div>
      )}
    </div>
  );
}
