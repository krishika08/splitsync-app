import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReceiptScannerModal({ isOpen, onClose, onReceiptScanned }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetState = () => {
    setImagePreview(null);
    setImageData(null);
    setMimeType('image/jpeg');
    setIsScanning(false);
    setReceiptData(null);
    setError('');
    setIsDragOver(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1600;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG at 0.8 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    setError('');
    setReceiptData(null);
    setMimeType('image/jpeg'); // We will always compress to jpeg

    try {
      const compressedDataUrl = await compressImage(file);
      setImagePreview(compressedDataUrl);
      setImageData(compressedDataUrl);
    } catch (err) {
      setError('Failed to process image. Try a different one.');
    }
  }, []);

  const handleFileSelect = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    processFile(file);
  };

  const handleScan = async () => {
    if (!imageData) return;
    setIsScanning(true);
    setError('');
    setReceiptData(null);

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to scan receipt.');
      } else {
        setReceiptData(json.data);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseReceipt = () => {
    if (!receiptData) return;
    onReceiptScanned({
      amount: receiptData.total,
      description: receiptData.merchant !== 'Unknown' 
        ? receiptData.merchant 
        : receiptData.items.map(i => i.name).join(', '),
      items: receiptData.items,
      merchant: receiptData.merchant,
      date: receiptData.date,
      currency: receiptData.currency || 'INR',
      tax: receiptData.tax || 0,
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-gray-900/40 backdrop-blur-lg"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[480px] bg-white sm:rounded-[2rem] rounded-t-[2rem] shadow-[0_24px_80px_rgba(0,0,0,0.2)] flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-4 flex items-center justify-between border-b border-gray-100/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-gray-900">Scan Receipt</h2>
              <p className="text-[12px] font-medium text-gray-400 mt-0.5">AI-powered receipt reader</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5 scrollbar-hide">
          
          {/* Upload Zone */}
          {!imagePreview && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-[2px] border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[220px] ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <motion.div
                animate={isDragOver ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-16 h-16 rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center"
              >
                <svg className={`w-8 h-8 transition-colors duration-300 ${isDragOver ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </motion.div>
              <div>
                <p className="text-[15px] font-bold text-gray-900">Drop your receipt here</p>
                <p className="text-[13px] font-medium text-gray-400 mt-1">or click to browse files</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                <span>JPG</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>PNG</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>HEIC</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>WEBP</span>
              </div>
            </div>
          )}

          {/* Camera button */}
          {!imagePreview && (
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gray-900 text-white text-[14px] font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:bg-black active:scale-[0.98] transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take a Photo
            </button>
          )}

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-gray-100">
              <img src={imagePreview} alt="Receipt" className="w-full max-h-[280px] object-contain bg-gray-50" />
              
              {/* Scanning Overlay */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg"
                    >
                      <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </motion.div>
                    <div className="text-center">
                      <p className="text-[15px] font-bold text-gray-900">Scanning receipt…</p>
                      <p className="text-[12px] font-medium text-gray-400 mt-1">AI is reading your receipt</p>
                    </div>
                    {/* Scanning line animation */}
                    <motion.div
                      animate={{ top: ['10%', '90%', '10%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full"
                      style={{ position: 'absolute' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Change Image Button */}
              {!isScanning && (
                <button
                  onClick={() => { setImagePreview(null); setImageData(null); setReceiptData(null); setError(''); }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-[12px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition-all shadow-sm border border-gray-100"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 rounded-xl flex items-center gap-2.5 text-[14px] font-semibold text-red-600"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {receiptData && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                {/* Merchant + Date header */}
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">{receiptData.merchant}</h3>
                    {receiptData.date && (
                      <p className="text-[12px] font-medium text-gray-400 mt-0.5">{receiptData.date}</p>
                    )}
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100/60">
                    <span className="text-[11px] font-black tracking-widest uppercase text-emerald-600">Scanned</span>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50/80 rounded-2xl border border-gray-100/80 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-100/50 border-b border-gray-100/80">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Items Found</span>
                  </div>
                  <div className="divide-y divide-gray-100/60">
                    {receiptData.items.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.25 }}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-[14px] font-semibold text-gray-700 truncate max-w-[65%]">{item.name}</span>
                        <span className="text-[14px] font-bold text-gray-900 tabular-nums">
                          {receiptData.currency === 'INR' ? '₹' : '$'}{item.price.toFixed(2)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-4 space-y-2">
                  {receiptData.subtotal > 0 && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-gray-400">Subtotal</span>
                      <span className="font-semibold text-gray-600 tabular-nums">
                        {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.subtotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {receiptData.tax > 0 && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-gray-400">Tax</span>
                      <span className="font-semibold text-gray-600 tabular-nums">
                        {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[15px] font-bold text-gray-900">Total</span>
                    <span className="text-[20px] font-black text-gray-900 tabular-nums">
                      {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Action */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-100/50">
          {!receiptData ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleScan}
              disabled={!imagePreview || isScanning}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_8px_24px_rgba(99,102,241,0.25)] hover:shadow-[0_12px_32px_rgba(99,102,241,0.35)] disabled:opacity-40 disabled:shadow-none transition-all duration-300"
            >
              {isScanning ? (
                <>
                  <div className="w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan Receipt
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleUseReceipt}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-bold text-white bg-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] hover:bg-black transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Use This — {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.total.toFixed(2)}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
