"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, SwitchCamera, X, Check, Upload } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [preview, setPreview] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch {
      alert("Camera access denied. Please allow camera access or upload a photo instead.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPreview(dataUrl);
      stopCamera();
    }
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const confirmPhoto = () => {
    if (preview) {
      onCapture(preview);
    }
  };

  const retake = () => {
    setPreview(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={preview} alt="Captured" className="w-full" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={retake}
              className="bg-red-500/90 backdrop-blur p-3 rounded-full text-white hover:bg-red-600 transition"
            >
              <X size={24} />
            </button>
            <button
              onClick={confirmPhoto}
              className="bg-green-500/90 backdrop-blur p-3 rounded-full text-white hover:bg-green-600 transition"
            >
              <Check size={24} />
            </button>
          </div>
        </div>
      ) : cameraActive ? (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={switchCamera}
              className="bg-bg-card/80 backdrop-blur p-3 rounded-full text-white hover:bg-bg-card-hover transition"
            >
              <SwitchCamera size={20} />
            </button>
            <button
              onClick={takePhoto}
              className="bg-primary p-4 rounded-full text-white hover:bg-primary-dark transition animate-pulse-ring"
            >
              <Camera size={28} />
            </button>
            <button
              onClick={stopCamera}
              className="bg-bg-card/80 backdrop-blur p-3 rounded-full text-white hover:bg-bg-card-hover transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={startCamera}
            className="flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-6 rounded-2xl transition text-lg"
          >
            <Camera size={24} />
            Open Camera
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 bg-bg-card hover:bg-bg-card-hover text-white font-semibold py-4 px-6 rounded-2xl border border-border transition text-lg"
          >
            <Upload size={24} />
            Upload Photo / Screenshot
          </button>
        </div>
      )}
    </div>
  );
}
