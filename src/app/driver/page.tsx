'use client';

import { useEffect, useState, useRef } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge } from '@/components/ui';
import { db } from '@/lib/store';
import type { TruckingDispatch, Pod } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useQueryParams } from '@/lib/useQueryParams';
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  Camera,
  Signature,
  ClipboardCheck,
  ArrowLeft,
  Package,
  AlertTriangle,
  Navigation,
  Clock,
  User,
  LogOut,
  ChevronRight,
  Star,
  Circle,
  Check,
} from 'lucide-react';
import { formatDate, formatDateTime, titleCase } from '@/lib/utils';
import { logout } from '@/lib/auth';
import { useAuth } from '@/components/AuthProvider';

// Mobile-first driver app — POD capture
export default function DriverAppPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useQueryParams();
  const [dispatches, setDispatches] = useState<TruckingDispatch[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [data, setData] = useState(db.getAll());

  const refresh = () => {
    const d = db.getAll();
    setData(d);
    // Show dispatches assigned to the logged-in driver (match by driver name/user id) or all for simplicity
    const myTrucks = user?.role === 'driver'
      ? d.trucking.filter(t => t.status !== 'completed' || t.signedBy) // driver sees their own
      : d.trucking;
    setDispatches(myTrucks);
    setPods(d.pods);
  };

  useEffect(() => {
    refresh();
    window.addEventListener('ff:data-changed', refresh);
    return () => window.removeEventListener('ff:data-changed', refresh);
  }, [user]);

  const activeId = params.get('id');
  const active = activeId ? dispatches.find(t => t.id === activeId) || null : null;
  const existingPod = active ? pods.find(p => p.truckingId === active.id) : null;

  if (active) {
    return (
      <PodCaptureView
        dispatch={active}
        existingPod={existingPod}
        onBack={() => router.push('/driver/')}
        onDone={() => { refresh(); router.push('/driver/'); }}
      />
    );
  }

  const today = dispatches.filter(t => t.status !== 'completed');
  const completed = dispatches.filter(t => t.status === 'completed');
  const myName = user?.name || 'Driver';

  return (
    <PageShell title="Driver App" subtitle="Your pickups & deliveries for today">
      {/* Mobile-first header */}
      <div className="max-w-md mx-auto">
        <Card className="p-5 mb-4 bg-gradient-to-br from-brand to-brand-dark text-white border-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-white/70">Welcome back</div>
              <div className="text-xl font-bold flex items-center gap-2">
                {myName} <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
              </div>
            </div>
            <button onClick={() => { logout(); router.push('/'); }}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-lg py-2">
              <div className="text-2xl font-bold">{today.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/70">Pending</div>
            </div>
            <div className="bg-white/10 rounded-lg py-2">
              <div className="text-2xl font-bold">{today.filter(t => t.status === 'en_route').length}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/70">En route</div>
            </div>
            <div className="bg-white/10 rounded-lg py-2">
              <div className="text-2xl font-bold">{completed.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/70">Delivered</div>
            </div>
          </div>
        </Card>

        {today.length > 0 && (
          <>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 mb-2">Today's assignments</div>
            <div className="space-y-3 mb-6">
              {today.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    // Advance from scheduled→dispatched if opening
                    if (t.status === 'scheduled') db.updateTrucking(t.id, { status: 'dispatched' });
                    router.push(`/driver/?id=${t.id}`);
                  }}
                  className="w-full text-left"
                >
                  <Card className="p-4 hover:shadow-lg transition-shadow active:scale-[0.99]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {t.reference}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(t.status)}`}>
                            {titleCase(t.status)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{t.customerName}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-slate-400">Pickup</div>
                        <div className="text-slate-800 dark:text-slate-200">{t.pickupLocation}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm mt-2">
                      <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-slate-400">Delivery</div>
                        <div className="text-slate-800 dark:text-slate-200">{t.deliveryLocation}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Truck className="w-3.5 h-3.5" /> {t.vehiclePlate}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> {formatDate(t.scheduledDate)}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-brand">
                        Start job <Navigation className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </>
        )}

        {completed.length > 0 && (
          <>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 mb-2">
              Recent deliveries
            </div>
            <div className="space-y-2">
              {completed.slice(0, 5).map((t) => {
                const pod = pods.find(p => p.truckingId === t.id);
                return (
                  <Card key={t.id} className="p-3 flex items-center gap-3 opacity-80">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{t.reference} · {t.customerName}</div>
                      <div className="text-xs text-slate-500">
                        Delivered {pod?.deliveredAt ? formatDate(pod.deliveredAt) : formatDate(t.completedDate || t.scheduledDate)}
                        {pod?.receiverName && <> · Signed by {pod.receiverName}</>}
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500" />
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {today.length === 0 && completed.length === 0 && (
          <Card className="p-8 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-500">No assignments yet. Check back later.</div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function PodCaptureView({ dispatch, existingPod, onBack, onDone }: { dispatch: TruckingDispatch; existingPod?: Pod | null; onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'arrived'|'unloading'|'condition'|'signature'|'photo'|'done'>(
    existingPod ? 'done' : 'arrived'
  );
  const [piecesSigned, setPiecesSigned] = useState(0);
  const [condition, setCondition] = useState<Pod['condition']>('good');
  const [receiverName, setReceiverName] = useState('');
  const [comments, setComments] = useState('');
  const [signaturePoints, setSignaturePoints] = useState<{x:number;y:number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load existing pod if any
  useEffect(() => {
    if (existingPod) {
      setPiecesSigned(existingPod.piecesSigned);
      setCondition(existingPod.condition);
      setReceiverName(existingPod.receiverName);
      setComments(existingPod.comments || '');
    } else {
      setPiecesSigned(dispatch.weight ? Math.ceil(dispatch.weight/1000) : 1);
    }
  }, [existingPod, dispatch]);

  // Draw signature on canvas
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (signaturePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(signaturePoints[0].x, signaturePoints[0].y);
      for (let i = 1; i < signaturePoints.length; i++) ctx.lineTo(signaturePoints[i].x, signaturePoints[i].y);
      ctx.stroke();
    }
  }, [signaturePoints]);

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (step !== 'signature') return;
    const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
    setIsDrawing(true);
    setSignaturePoints([{ x: e.clientX - r.left, y: e.clientY - r.top }]);
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
    setSignaturePoints(p => [...p, { x: e.clientX - r.left, y: e.clientY - r.top }]);
  }
  function endDraw() { setIsDrawing(false); }
  function clearSig() { setSignaturePoints([]); }

  function simulatePhoto() {
    // Generate a synthetic "photo" as colored canvas data URL (placeholder for real camera)
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
    const ctx = c.getContext('2d')!;
    // Sky gradient
    const g = ctx.createLinearGradient(0,0,0,c.height);
    g.addColorStop(0, '#93c5fd'); g.addColorStop(0.6, '#fde68a'); g.addColorStop(1, '#86efac');
    ctx.fillStyle = g; ctx.fillRect(0,0,c.width,c.height);
    // Truck box
    ctx.fillStyle = '#1e40af'; ctx.fillRect(40, 90, 220, 90);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(220, 100, 35, 60);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(80, 185, 15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(215, 185, 15, 0, Math.PI*2); ctx.fill();
    // Palette boxes (cargo)
    ctx.fillStyle = '#b45309'; ctx.fillRect(60, 100, 40, 35);
    ctx.fillStyle = '#92400e'; ctx.fillRect(110, 100, 40, 35);
    ctx.fillStyle = '#78350f'; ctx.fillRect(160, 100, 45, 35);
    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,c.height-28,c.width,28);
    ctx.fillStyle = 'white'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`POD ${dispatch.reference} · ${new Date().toLocaleString()}`, 8, c.height-10);
    setPhotoTaken(c.toDataURL('image/jpeg', 0.7));
  }

  function submitPOD() {
    if (!receiverName.trim() || signaturePoints.length < 5) {
      alert('Receiver name and signature are required');
      return;
    }
    setSubmitting(true);
    const sigCanvas = canvasRef.current;
    const sigData = sigCanvas?.toDataURL('image/png');
    db.createPod({
      truckingId: dispatch.id,
      shipmentId: dispatch.shipmentId,
      receiverName: receiverName.trim(),
      receiverSignature: sigData,
      podPhotoDataUrl: photoTaken || undefined,
      comments: comments || undefined,
      deliveredAt: new Date().toISOString(),
      condition,
      piecesSigned,
    });
    setTimeout(() => { setSubmitting(false); setStep('done'); }, 600);
  }

  if (existingPod || step === 'done') {
    const pod = existingPod || { receiverName, condition, piecesSigned, comments, deliveredAt: new Date().toISOString(), receiverSignature: signaturePoints.length ? canvasRef.current?.toDataURL() : undefined, podPhotoDataUrl: photoTaken || undefined } as Pod;
    return (
      <PageShell title="POD Submitted" subtitle={dispatch.reference}>
        <div className="max-w-md mx-auto text-center py-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Delivery Complete!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">POD captured & synced to operations.</p>
          <Card className="p-5 text-left mb-6">
            <div className="space-y-2 text-sm">
              <Row label="Reference" value={dispatch.reference} />
              <Row label="Receiver" value={pod.receiverName} />
              <Row label="Pieces signed" value={String(pod.piecesSigned)} />
              <Row label="Condition" value={titleCase(pod.condition)} />
              <Row label="Delivered" value={formatDateTime(pod.deliveredAt)} />
              {pod.comments && <Row label="Notes" value={pod.comments} />}
            </div>
            {pod.podPhotoDataUrl && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-500 mb-1">Delivery photo</div>
                <img src={pod.podPhotoDataUrl} alt="POD" className="w-full rounded-lg border border-slate-200" />
              </div>
            )}
          </Card>
          <Button onClick={onBack} className="w-full"><ArrowLeft className="w-4 h-4" /> Back to jobs</Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Capture POD" subtitle={dispatch.reference}>
      <div className="max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-3"><ArrowLeft className="w-4 h-4" /> Back</Button>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-4 px-1">
          {['arrived','unloading','condition','signature','photo'].map((s, i) => {
            const sIdx = ['arrived','unloading','condition','signature','photo'].indexOf(step);
            const done = i < sIdx;
            const active = s === step;
            return (
              <div key={s} className="flex-1 flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-brand text-white ring-4 ring-brand/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>{done ? <Check className="w-3.5 h-3.5" /> : i+1}</div>
                {i < 4 && <div className={`h-0.5 flex-1 ${done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
            );
          })}
        </div>

        <Card className="p-5 mb-4">
          <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-rose-500" /> {dispatch.deliveryLocation}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{dispatch.customerName} · {t_pieces(dispatch)} pieces · {(dispatch.weight/1000).toFixed(1)}t</div>
        </Card>

        {/* Step: Arrived */}
        {step === 'arrived' && (
          <Card className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Arrived at delivery</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-5">Confirm you've reached {dispatch.deliveryLocation}</p>
            <Button className="w-full py-4 text-lg" onClick={() => {
              db.updateTrucking(dispatch.id, { status: 'loaded' });
              setStep('unloading');
            }}>
              <Navigation className="w-5 h-5" /> I've arrived
            </Button>
          </Card>
        )}

        {/* Step: Unloading */}
        {step === 'unloading' && (
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-brand" /> Unloading status
            </h3>
            <div className="space-y-3">
              {['scheduled','dispatched','en_route','loaded','unloaded','completed'].map((st, idx) => {
                const done = ['scheduled','dispatched','en_route','loaded'].includes(st) || (st === 'unloaded');
                const current = st === 'unloaded';
                const upcoming = ['unloaded','completed'].includes(st) && st !== 'unloaded';
                return (
                  <div key={st} className={`flex items-center gap-3 p-2 rounded-lg ${current ? 'bg-brand/10' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      done ? 'bg-emerald-500 text-white' : upcoming ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100'
                    }`}>
                      {done && st !== 'unloaded' ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className={`font-medium ${done && !current ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                      {titleCase(st)}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button className="w-full mt-5" onClick={() => {
              db.updateTrucking(dispatch.id, { status: 'unloaded' });
              setStep('condition');
            }}>
              <CheckCircle2 className="w-4 h-4" /> Cargo unloaded — next
            </Button>
          </Card>
        )}

        {/* Step: Condition */}
        {step === 'condition' && (
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-brand" /> Cargo condition
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Report any exceptions before receiver signs</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { key: 'good', label: 'Good order', icon: <CheckCircle2 className="w-5 h-5" />, color: 'emerald' },
                { key: 'damaged', label: 'Damaged', icon: <AlertTriangle className="w-5 h-5" />, color: 'amber' },
                { key: 'short', label: 'Short-ship', icon: <Package className="w-5 h-5" />, color: 'orange' },
                { key: 'over', label: 'Over-ship', icon: <Package className="w-5 h-5" />, color: 'blue' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setCondition(opt.key as Pod['condition'])}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    condition === opt.key
                      ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-900/20`
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                  <div className={`text-${opt.color}-600 dark:text-${opt.color}-400 mb-1`}>{opt.icon}</div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{opt.label}</div>
                </button>
              ))}
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pieces received</label>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => setPiecesSigned(Math.max(0, piecesSigned - 1))}
                  className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-xl font-bold">-</button>
                <input type="number" value={piecesSigned} onChange={e => setPiecesSigned(Number(e.target.value))}
                  className="flex-1 text-center text-2xl font-bold py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                <button onClick={() => setPiecesSigned(piecesSigned + 1)}
                  className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-xl font-bold">+</button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comments (optional)</label>
              <textarea value={comments} onChange={e => setComments(e.target.value)}
                placeholder="e.g. Minor water stain on CTN-003; receiver accepted"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm min-h-[72px]" />
            </div>

            <Button className="w-full" onClick={() => setStep('signature')}>
              Continue to signature <ChevronRight className="w-4 h-4" />
            </Button>
          </Card>
        )}

        {/* Step: Signature */}
        {step === 'signature' && (
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Signature className="w-5 h-5 text-brand" /> Receiver signature
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Hand the device to the receiver to sign</p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receiver name</label>
              <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
                placeholder="Full name"
                className="w-full mt-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </div>

            <div className="mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sign below</label>
              <div className="mt-1 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={160}
                  className="w-full h-40 cursor-crosshair bg-white dark:bg-slate-950"
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />
              </div>
              <button onClick={clearSig} className="text-xs text-slate-500 mt-1">Clear signature</button>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep('condition')}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button className="flex-1" onClick={() => setStep('photo')} disabled={!receiverName.trim() || signaturePoints.length < 5}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Photo */}
        {step === 'photo' && (
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Camera className="w-5 h-5 text-brand" /> Proof-of-delivery photo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Take a photo of delivered cargo at the consignee (optional but recommended)</p>

            {photoTaken ? (
              <div className="mb-4">
                <img src={photoTaken} alt="POD" className="w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                <button onClick={() => setPhotoTaken(null)} className="text-xs text-slate-500 mt-1">Retake photo</button>
              </div>
            ) : (
              <button onClick={simulatePhoto}
                className="w-full h-48 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 mb-4">
                <Camera className="w-10 h-10" />
                <span className="font-semibold">Tap to take photo</span>
                <span className="text-xs">(Demo: simulated delivery photo)</span>
              </button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('signature')}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button variant="outline" className="flex-1" onClick={submitPOD} disabled={submitting}>
                Skip photo
              </Button>
              <Button className="flex-1" onClick={submitPOD} disabled={submitting}>
                {submitting ? 'Submitting…' : <>Submit POD <CheckCircle2 className="w-4 h-4" /></>}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-500 text-xs uppercase tracking-wider pt-0.5">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

function t_pieces(t: TruckingDispatch) {
  // estimate: 1 piece per tonne, min 1
  return Math.max(1, Math.ceil(t.weight / 1000));
}

function statusColor(s: string) {
  const map: Record<string,string> = {
    scheduled: 'border-slate-300 bg-slate-100 text-slate-700',
    dispatched: 'border-blue-300 bg-blue-100 text-blue-700',
    en_route: 'border-amber-300 bg-amber-100 text-amber-800',
    loaded: 'border-indigo-300 bg-indigo-100 text-indigo-700',
    unloaded: 'border-violet-300 bg-violet-100 text-violet-700',
    completed: 'border-emerald-300 bg-emerald-100 text-emerald-700',
  };
  return map[s] || map.scheduled;
}
