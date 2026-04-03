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
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-gray-900/30 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[460px] bg-white sm:rounded-[2rem] rounded-t-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col max-h-[95vh] sm:max-h-[85vh] overflow-hidden border border-gray-100"
      >

        <div className="relative px-8 pt-8 pb-5 flex items-center justify-between z-10 border-b border-gray-100/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 shadow-sm">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[20px] font-extrabold tracking-tight text-gray-900">Scan Receipt</h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100/50 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-hide relative z-10">
          
          {/* Upload Zone */}
          {!imagePreview && (
            <div className="flex flex-col gap-6 -mt-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className={`relative cursor-pointer rounded-[2rem] border-[2.5px] border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[220px] group ${
                  isDragOver
                    ? 'border-indigo-400 bg-indigo-50/80 scale-[1.02] shadow-[0_8px_30px_rgba(79,70,229,0.12)]'
                    : 'border-indigo-100/80 bg-indigo-50/20 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-[0_8px_24px_rgba(79,70,229,0.06)]'
                }`}
              >
                
                <motion.div
                  animate={isDragOver ? { scale: 1.15, y: -4, rotate: 5 } : { scale: 1, y: 0, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-14 h-14 rounded-full bg-white shadow-[0_4px_16px_rgba(79,70,229,0.12)] border border-indigo-50 flex items-center justify-center mb-1 group-hover:shadow-[0_8px_24px_rgba(79,70,229,0.2)] transition-shadow duration-300"
                >
                  <svg className={`w-6 h-6 transition-colors duration-300 ${isDragOver ? 'text-indigo-600' : 'text-indigo-500 group-hover:text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </motion.div>

                <div className="relative z-10 space-y-1">
                  <p className="text-[17px] font-extrabold text-gray-900 tracking-tight transition-colors group-hover:text-indigo-950">Upload receipt</p>
                  <p className="text-[14px] font-medium text-gray-500">Drag & drop or <span className="text-indigo-600 font-bold hover:underline underline-offset-2 decoration-indigo-300">browse files</span></p>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                  <span>JPG</span><span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span>PNG</span><span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <span>HEIC</span>
                </div>
              </div>

              <div className="flex items-center gap-4 px-4 opacity-70">
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-gray-200 flex-1" />
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">OR</span>
                <div className="h-px bg-gradient-to-l from-transparent via-gray-200 to-gray-200 flex-1" />
              </div>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[1.25rem] bg-white border border-gray-200/80 text-gray-800 text-[15px] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-indigo-200 hover:bg-indigo-50/30 hover:text-indigo-700 active:scale-[0.98] transition-all group"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take a Photo
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

          {/* Image Preview */}
          {imagePreview && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-[2rem] overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.1)] border-[4px] border-white ring-1 ring-gray-100 bg-gray-50 w-full flex items-center justify-center p-2 isolate"
            >
              <img src={imagePreview} alt="Receipt" className="w-full h-auto max-h-[300px] object-contain rounded-[1.25rem] z-0" />
              
              {/* Scanning Overlay */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg"
                    >
                      <svg className="w-6 h-6 text-gray-900 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </motion.div>
                    <div className="text-center text-white">
                      <p className="text-[16px] font-bold shadow-sm">Extracting details…</p>
                      <p className="text-[13px] font-medium text-gray-200 mt-0.5 tracking-wide">AI is analyzing the receipt</p>
                    </div>

                    {/* Laser Scanner Animation */}
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-[2px] bg-white shadow-[0_0_15px_3px_rgba(255,255,255,0.8)] z-30"
                      style={{ position: 'absolute' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Change Image Button */}
              {!isScanning && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setImagePreview(null); setImageData(null); setReceiptData(null); setError(''); }}
                  className="absolute top-4 right-4 px-3.5 py-2 bg-gray-900/80 backdrop-blur-md rounded-xl text-[12px] font-bold text-white hover:bg-gray-800 transition-colors shadow-lg z-10 border border-white/10"
                >
                  Change
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="p-4 bg-red-50 rounded-[1.25rem] flex items-center gap-3 text-[14px] font-semibold text-red-600/90 border border-red-100 shadow-[0_4px_12px_rgba(239,68,68,0.05)]"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {receiptData && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                {/* Merchant + Date header */}
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-[19px] font-extrabold text-gray-900 tracking-tight">{receiptData.merchant}</h3>
                    {receiptData.date && (
                      <p className="text-[13px] font-semibold text-indigo-500 mt-0.5">{receiptData.date}</p>
                    )}
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-br from-emerald-100 to-green-50 border border-emerald-200/50 shadow-sm">
                    <span className="text-[11px] font-black tracking-widest uppercase text-emerald-700">Success</span>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-[1.5rem] border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Scanned Items</span>
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">{receiptData.items.length}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {receiptData.items.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 + 0.1, duration: 0.3 }}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-100/50 transition-colors"
                      >
                        <span className="text-[14px] font-bold text-gray-700 truncate max-w-[65%] leading-tight pr-2">{item.name}</span>
                        <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                          {receiptData.currency === 'INR' ? '₹' : '$'}{item.price.toFixed(2)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="bg-white rounded-[1.5rem] border-2 border-indigo-50 shadow-[0_8px_24px_rgba(99,102,241,0.06)] p-5 space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-bl-full pointer-events-none" />
                  
                  {receiptData.subtotal > 0 && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="font-semibold text-gray-500">Subtotal</span>
                      <span className="font-bold text-gray-700 tabular-nums">
                        {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.subtotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {receiptData.tax > 0 && (
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="font-semibold text-gray-500">Tax</span>
                      <span className="font-bold text-gray-700 tabular-nums">
                        {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t-2 border-gray-50 mt-1 relative z-10">
                    <span className="text-[16px] font-black text-gray-900 uppercase tracking-wider">Total</span>
                    <span className="text-[26px] font-black text-indigo-600 tabular-nums drop-shadow-sm">
                      {receiptData.currency === 'INR' ? '₹' : '$'}{receiptData.total.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Action */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-100/50">
          {!receiptData ? (
              <motion.button
              whileTap={!(!imagePreview || isScanning) ? { scale: 0.98 } : {}}
              onClick={handleScan}
              disabled={!imagePreview || isScanning}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-[16px] font-bold transition-all duration-300 disabled:bg-indigo-50/50 disabled:text-indigo-300 disabled:shadow-none bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_10px_25px_rgba(79,70,229,0.35)] hover:bg-indigo-700"
            >
              <div className="flex items-center gap-2.5 text-inherit">
                {isScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Extract Receipt
                  </>
                )}
              </div>
            </motion.button>
          ) : (
            <motion.button
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUseReceipt}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gray-900 shadow-sm hover:bg-black transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Use Details
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
