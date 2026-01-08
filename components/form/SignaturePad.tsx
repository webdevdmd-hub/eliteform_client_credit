import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Components';

interface SignaturePadProps {
  label: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  height?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, value, onChange, disabled, height = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);

  const redrawFromValue = (ctx: CanvasRenderingContext2D, width: number, h: number, source?: string) => {
    ctx.clearRect(0, 0, width, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, h);
    const imgValue = source !== undefined ? source : value;
    if (imgValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, h);
        setIsEmpty(false);
      };
      img.src = imgValue;
    } else {
      setIsEmpty(true);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const h = height;

    canvas.width = width * ratio;
    canvas.height = h * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';

    redrawFromValue(ctx, width, h, value);
  }, [height, value]);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const toCanvasCoords = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = getCanvasContext();
    if (!ctx) return;
    const { x, y } = toCanvasCoords(event);
    drawing.current = true;
    lastPoint.current = { x, y };
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawing.current) return;
    const ctx = getCanvasContext();
    if (!ctx) return;
    const { x, y } = toCanvasCoords(event);
    const last = lastPoint.current;
    if (!last) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  const finishStroke = () => {
    if (disabled) return;
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    drawing.current = false;
    lastPoint.current = null;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setIsEmpty(false);
  };

  const handlePointerUp = () => finishStroke();

  const handlePointerLeave = () => {
    if (drawing.current) finishStroke();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    redrawFromValue(ctx, canvas.clientWidth, height, '');
    onChange('');
    setIsEmpty(true);
  };

  return (
    <div className="border border-dashed border-stone-300 rounded-xl p-4 bg-stone-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        {!disabled && (
          <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={handleClear} disabled={disabled || isEmpty}>
            Clear
          </Button>
        )}
      </div>
      <div className="rounded-lg overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className={`w-full ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-crosshair'}`}
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
      <p className="text-xs text-stone-500 mt-2">Sign with your mouse or touch. The signature is saved with your submission.</p>
    </div>
  );
};
