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
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      // Get the canvas element
      const canvas = sigCanvas.current.getCanvas();

      // Create a new canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        // Fill with white background
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the signature on top
        tempCtx.drawImage(canvas, 0, 0);

        // Convert to JPEG with white background for better compression
        const signature = tempCanvas.toDataURL('image/jpeg', 0.8);
        onChange(signature);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div className="border-2 border-gray-300 rounded-lg bg-white relative touch-none">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: 'w-full h-32 rounded-lg cursor-crosshair',
            style: { touchAction: 'none' },
          }}
          onEnd={handleEnd}
          backgroundColor="rgb(255, 255, 255)"
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
