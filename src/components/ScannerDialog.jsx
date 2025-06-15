import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScannerDialog({ open, onClose, onScan }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const setupScanner = async () => {
      if (!open || html5QrCodeRef.current) return;

      html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);

      try {
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onScan(decodedText);
            handleClose();
          },
          () => {}
        );
      } catch (err) {
        console.error('Scanner start failed:', err);
        handleClose();
      }
    };

    const handleClose = () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
          onClose();
        });
      } else {
        onClose();
      }
    };

    setupScanner();

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        });
      }
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow-md w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-red-600 text-xl"
        >✖</button>
        <p className="text-center mb-2 text-sm font-medium">Scan a barcode</p>
        <div ref={scannerRef} id="shared-scanner" className="w-full h-64 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
