import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  title: string;
  onSave: (signatureData: string) => void;
  onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ title, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas resolution for better clarity
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, []);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scrolling on touch devices while signing
    if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasSignature) setHasSignature(true);
    }
  };

  const endDrawing = () => {
    document.body.style.overflow = 'auto'; // Restore scrolling
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!hasSignature) {
        alert("Por favor firme antes de continuar.");
        return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col">
        <div className="p-4 border-b border-fdn-line bg-fdn-bg rounded-t-lg">
          <h3 className="text-lg font-bold text-fdn-fg text-center">{title}</h3>
          <p className="text-xs text-center text-fdn-muted mt-1">Firme dentro del recuadro</p>
        </div>
        
        <div className="p-4 bg-fdn-surface-2 flex justify-center">
          <canvas
            ref={canvasRef}
            className="bg-white rounded shadow-inner cursor-crosshair touch-none"
            style={{ width: '100%', height: '200px' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          />
        </div>

        <div className="p-4 flex gap-3 justify-end border-t border-fdn-line">
           <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-fdn-red-ink bg-red-50 hover:bg-red-100 rounded transition-colors"
          >
            Borrar
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-fdn-muted hover:bg-fdn-bg rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasSignature}
            className={`px-6 py-2 text-sm font-bold text-white rounded shadow transition-colors ${!hasSignature ? 'bg-gray-400 cursor-not-allowed' : 'bg-fdn-blue hover:bg-fdn-blue-2'}`}
          >
            Confirmar Firma
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;