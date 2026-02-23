'use client';
import { useState, useEffect, useRef } from 'react';
import { TrendingDown, TrendingUp, Minus, Scale, Camera, Plus, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { today, formatDateShort, formatDate, getLastNDays, movingAverage } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { BodyWeight } from '@/types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.value?.toFixed(1)} kg <span className="text-white/40 font-normal">{p.name === 'avg' ? '(avg)' : ''}</span>
        </p>
      ))}
    </div>
  );
};

export default function BodyPage() {
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputBf, setInputBf] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadWeights = async () => {
    const days = getLastNDays(60);
    const { data } = await supabase.from('body_weights').select('*').gte('date', days[0]).order('date');
    if (data) setWeights(data as BodyWeight[]);
  };

  const loadPhotos = async () => {
    const { data } = await supabase.from('progress_photos').select('*').order('date', { ascending: false }).limit(9);
    if (data) setPhotos(data);
  };

  useEffect(() => { loadWeights(); loadPhotos(); }, []);

  const chartData = (() => {
    const days = getLastNDays(30);
    const wMap: Record<string, number> = {};
    weights.forEach(w => { wMap[w.date] = w.weight_kg; });
    const vals = days.map(d => wMap[d] ?? null);
    const filled: number[] = [];
    let last = vals.find(v => v !== null) ?? 70;
    vals.forEach(v => { last = v ?? last; filled.push(last); });
    const avg = movingAverage(filled, 7);
    return days.map((d, i) => ({
      date: formatDateShort(d),
      weight: wMap[d] ? +wMap[d].toFixed(1) : null,
      avg: +avg[i].toFixed(2),
    }));
  })();

  const recentWeights = weights.slice(-8).reverse();
  const latest = recentWeights[0]?.weight_kg;
  const prev = recentWeights[1]?.weight_kg;
  const delta = latest && prev ? +(latest - prev).toFixed(1) : null;

  // 14-day trend
  const trendWeights = weights.slice(-14);
  const trend = trendWeights.length >= 2
    ? +((trendWeights[trendWeights.length - 1].weight_kg - trendWeights[0].weight_kg) / trendWeights.length * 7).toFixed(2)
    : 0;

  // Plateau check
  const last14 = weights.slice(-14).map(w => w.weight_kg);
  const isPlateaued = last14.length >= 14 && (Math.max(...last14) - Math.min(...last14)) < 0.5;

  const addWeight = async () => {
    if (!inputWeight) return;
    setSaving(true);
    try {
      const payload = {
        date: today(),
        weight_kg: parseFloat(inputWeight),
        body_fat_pct: inputBf ? parseFloat(inputBf) : null,
      };
      await supabase.from('body_weights').upsert(payload, { onConflict: 'date' });
      setInputWeight(''); setInputBf('');
      setShowAdd(false);
      toast('Weight logged!', 'success');
      loadWeights();
    } catch { toast('Failed to save', 'error'); } finally { setSaving(false); }
  };

  const uploadPhoto = async (file: File) => {
    const path = `${today()}_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('progress-photos').upload(path, file);
    if (error) { toast('Upload failed', 'error'); return; }
    const { data: url } = supabase.storage.from('progress-photos').getPublicUrl(path);
    await supabase.from('progress_photos').insert({ date: today(), storage_path: url.publicUrl });
    toast('Photo saved!', 'success');
    loadPhotos();
  };

  const TrendIcon = !delta ? Minus : delta < 0 ? TrendingDown : TrendingUp;
  const trendColor = !delta ? 'text-white/40' : delta < 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="pb-4">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Body</h1>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-sm font-bold px-3 py-2 rounded-xl border border-blue-500/25 active:scale-95 transition-all">
            <Plus size={14} /> Log
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Current weight card */}
        <div className="card-glow animate-fade-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="section-header" style={{ marginBottom: 4 }}>CURRENT WEIGHT</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white tabular-nums tracking-tight">
                  {latest?.toFixed(1) ?? '—'}
                </span>
                <span className="text-lg text-white/40 mb-1.5">kg</span>
              </div>
              {delta !== null && (
                <div className={`flex items-center gap-1.5 mt-2 ${trendColor}`}>
                  <TrendIcon size={14} />
                  <span className="text-sm font-bold">{delta > 0 ? '+' : ''}{delta} kg since last</span>
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
              <Scale size={22} className="text-blue-400" />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '7-day avg', value: weights.length > 0 ? (weights.slice(-7).reduce((s,w) => s + w.weight_kg, 0) / Math.min(weights.length, 7)).toFixed(1) + ' kg' : '—' },
              { label: '30d trend', value: trend !== 0 ? `${trend > 0 ? '+' : ''}${trend} kg/wk` : 'Stable' },
              { label: 'Entries', value: weights.length.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.04] rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold text-white">{value}</p>
                <p className="text-[10px] text-white/35 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {isPlateaued && (
          <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl animate-bounce-in">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-300 text-sm">Weight Plateau Detected</p>
              <p className="text-xs text-orange-300/60 mt-0.5">Less than 0.5kg change in 14 days. Consider adjusting calories.</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.filter(d => d.weight !== null).length > 2 && (
          <div className="card animate-fade-up">
            <p className="section-header">30-DAY WEIGHT</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="weight" stroke="#0A84FF" strokeWidth={2} fill="url(#wg)" dot={false} connectNulls={false} name="weight" />
                <Area type="monotone" dataKey="avg" stroke="#30D158" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 3" name="avg" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent entries */}
        {recentWeights.length > 0 && (
          <div>
            <p className="section-header">HISTORY</p>
            <div className="space-y-2 stagger">
              {recentWeights.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 p-3.5 card animate-fade-up">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{formatDate(w.date)}</p>
                    {w.body_fat_pct && <p className="text-xs text-white/35 mt-0.5">Body fat: {w.body_fat_pct}%</p>}
                  </div>
                  <span className="text-xl font-black text-white tabular-nums">{w.weight_kg.toFixed(1)}</span>
                  <span className="text-sm text-white/40">kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress photos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-header" style={{ marginBottom: 0 }}>PROGRESS PHOTOS</p>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 active:scale-95 transition-all">
              <Camera size={14} /> Add Photo
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); }} />

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <div key={p.id} className="aspect-square rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.07]">
                  <img src={p.storage_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-32 border border-dashed border-white/[0.10] rounded-2xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-blue-500/40 hover:text-blue-400 transition-all">
              <Camera size={24} />
              <span className="text-sm font-medium">Add your first progress photo</span>
            </button>
          )}
        </div>
      </div>

      {/* Add weight sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={() => setShowAdd(false)} />
          <div className="relative w-full animate-slide-up sheet">
            <div className="sheet-handle" />
            <h2 className="text-xl font-bold text-white mb-5">Log Weight</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Weight (kg)</p>
                <input type="number" value={inputWeight} onChange={e => setInputWeight(e.target.value)}
                  placeholder="e.g. 75.5" className="input-number" inputMode="decimal" autoFocus />
              </div>
              <div>
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Body Fat % (optional)</p>
                <input type="number" value={inputBf} onChange={e => setInputBf(e.target.value)}
                  placeholder="e.g. 18" className="input-number" inputMode="decimal" />
              </div>
            </div>
            <button onClick={addWeight} disabled={!inputWeight || saving} className="btn-primary w-full mt-6">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}