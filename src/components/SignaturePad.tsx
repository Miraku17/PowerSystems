'use client';

import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  label: string;
  value?: string; // base64 image string
  onChange: (signature: string) => void;
  subtitle?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, value, onChange, subtitle }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (sigCanvas.current) {
      if (value) {
        if (sigCanvas.current.isEmpty()) {
          try {
            sigCanvas.current.fromDataURL(value);
          } catch (error) {
            console.error('Error loading signature:', error);
          }
        }
      } else {
        sigCanvas.current.clear();
      }
    }
  }, [value]);

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      onChange('');
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      // Use JPEG with 0.7 quality for better compression (reduces size by ~70%)
      const signature = sigCanvas.current.toDataURL('image/jpeg', 0.7);
      onChange(signature);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div className="border-2 border-gray-300 rounded-lg bg-white relative">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: 'w-full h-32 rounded-lg cursor-crosshair',
          }}
          onEnd={handleEnd}
        />
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded shadow transition"
        >
          Clear
        </button>
      </div>
      {subtitle && (
        <p className="text-xs text-center text-gray-400 mt-1 italic">{subtitle}</p>
      )}
    </div>
  );
};

export default SignaturePad;
