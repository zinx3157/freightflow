'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCw, CheckCircle2, Upload, Loader2, Flashlight, FlashlightOff } from 'lucide-react';
import { Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, meta: { lat?: number; lng?: number; caption?: string }) => void;
  title?: string;
  allowGallery?: boolean;
}

/**
 * Feature #1: Real camera photo capture.
 * Uses getUserMedia for live camera (preferring back/environment camera),
 * falls back to <input type="file" capture="environment"> for devices that
 * don't allow inline camera (many Android Chrome installs still need the
 * file-input fallback for the native camera app — which on S20+ actually
 * produces better photos).
 *
 * On Galaxy S20+ Chrome: environment-facing camera works inline; if the
 * permission is denied, gallery fallback still lets user upload.
 */
export default function CameraCapture({ open, onClose, onCapture, title = 'Take Photo', allowGallery = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [caption, setCaption] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    setPreview(null);
    setCaption('');

    // Try geotagging (will prompt once on Android)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setGeo(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    }

    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setLoading(false);
      } catch (e: any) {
        setError('Camera unavailable — use Gallery upload instead. ' + (e?.message || ''));
        setLoading(false);
      }
    }
    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, facing]);

  // Toggle flash (torch)
  useEffect(() => {
    const s = streamRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities() as any;
    if ('torch' in caps) {
      track.applyConstraints({ advanced: [{ torch: flashOn } as any] }).catch(() => {});
    }
  }, [flashOn]);

  function snap() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    // Compress to JPEG 0.82 for manageable localStorage size
    const url = c.toDataURL('image/jpeg', 0.82);
    setPreview(url);
  }

  function retake() { setPreview(null); }

  function usePhoto() {
    if (!preview) return;
    onCapture(preview, { lat: geo?.lat, lng: geo?.lng, caption: caption || undefined });
    cleanup();
    onClose();
  }

  function cleanup() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
    };
    reader.readAsDataURL(f);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex items-center justify-between p-3 bg-black text-white">
        <button onClick={() => { cleanup(); onClose(); }} className="p-2 -ml-2 rounded-full hover:bg-white/10" aria-label="Close">
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg">{title}</h2>
        <div className="w-10" />
      </div>

      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center text-white/80 px-6 max-w-sm">
            <Camera className="w-14 h-14 mx-auto mb-3 opacity-40" />
            <p className="mb-4">{error}</p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Choose from Gallery / Camera
            </Button>
          </div>
        ) : loading ? (
          <div className="text-white/70 flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            Starting camera…
          </div>
        ) : preview ? (
          <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline muted autoPlay className="max-w-full max-h-full w-full h-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {preview ? (
        <div className="bg-black p-3 space-y-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)…"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder:text-white/50 outline-none text-base"
          />
          {geo && <p className="text-white/60 text-xs">📍 {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</p>}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" onClick={retake} className="w-full !bg-white/10 !text-white !border-white/20 !min-h-[52px]">
              <RotateCw className="w-5 h-5 mr-2" /> Retake
            </Button>
            <Button onClick={usePhoto} className="w-full !bg-emerald-500 hover:!bg-emerald-600 !text-white !min-h-[52px]">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Use Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-black pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] px-4 flex items-center justify-around">
          <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Gallery">
            <Upload className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            onClick={snap}
            className="w-[76px] h-[76px] rounded-full bg-white border-4 border-white/50 active:scale-95 transition flex items-center justify-center shadow-lg"
            aria-label="Take photo"
          >
            <div className="w-14 h-14 rounded-full bg-white border-4 border-black" />
          </button>
          <div className="flex flex-col gap-2">
            <button onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Flip camera">
              <RotateCw className="w-5 h-5" />
            </button>
            <button onClick={() => setFlashOn(f => !f)} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Toggle flash">
              {flashOn ? <Flashlight className="w-5 h-5 text-amber-300" /> : <FlashlightOff className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
