"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Check, Circle } from "lucide-react";

interface ImageAnnotatorProps {
  imageData: string;
  onConfirm: (annotatedImage: string, circleRegion: { x: number; y: number; radius: number } | null) => void;
  onBack: () => void;
}

export default function ImageAnnotator({ imageData, onConfirm, onBack }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentCircle, setCurrentCircle] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      const container = containerRef.current;
      if (container) {
        const maxWidth = container.clientWidth;
        const scale = maxWidth / img.width;
        setCanvasSize({
          width: maxWidth,
          height: img.height * scale,
        });
      }
    };
    img.src = imageData;
  }, [imageData]);

  const drawCanvas = useCallback(
    (circle?: { x: number; y: number; radius: number } | null) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !imageObj) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageObj, 0, 0, canvas.width, canvas.height);

      const c = circle ?? currentCircle;
      if (c) {
        // Dim everything outside the circle
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw circle outline
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glow effect
        ctx.shadowColor = "#7c3aed";
        ctx.shadowBlur = 15;
        ctx.strokeStyle = "rgba(124, 58, 237, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    },
    [imageObj, currentCircle]
  );

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, canvasSize]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    setStartPoint(pos);
    setIsDrawing(true);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    const pos = getPos(e);
    const dx = pos.x - startPoint.x;
    const dy = pos.y - startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const circle = { x: startPoint.x, y: startPoint.y, radius };
    setCurrentCircle(circle);
    drawCanvas(circle);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const reset = () => {
    setCurrentCircle(null);
    setStartPoint(null);
    drawCanvas(null);
  };

  const confirm = () => {
    // Get the annotated image as data URL
    const canvas = canvasRef.current;
    if (canvas) {
      const annotatedImage = canvas.toDataURL("image/jpeg", 0.85);
      onConfirm(annotatedImage, currentCircle);
    }
  };

  const skipCircle = () => {
    onConfirm(imageData, null);
  };

  return (
    <div className="w-full max-w-lg mx-auto" ref={containerRef}>
      <div className="mb-3 flex items-center gap-2 text-text-muted text-sm">
        <Circle size={16} className="text-primary" />
        <span>Draw a circle around the person you want to approach</span>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-border">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full drawing-cursor touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-bg-card hover:bg-bg-card-hover text-white py-3 px-4 rounded-xl border border-border transition font-medium"
        >
          Retake
        </button>
        <button
          onClick={reset}
          className="bg-bg-card hover:bg-bg-card-hover text-white p-3 rounded-xl border border-border transition"
        >
          <RotateCcw size={20} />
        </button>
        {currentCircle ? (
          <button
            onClick={confirm}
            className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 px-4 rounded-xl transition font-semibold flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Analyze & Motivate
          </button>
        ) : (
          <button
            onClick={skipCircle}
            className="flex-1 bg-accent hover:bg-accent/90 text-white py-3 px-4 rounded-xl transition font-semibold"
          >
            Skip - Just Motivate Me
          </button>
        )}
      </div>
    </div>
  );
}
