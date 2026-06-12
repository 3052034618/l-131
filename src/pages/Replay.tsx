import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PlayCircle,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  UserCircle
} from 'lucide-react';
import { useAppStore } from '../store';
import type { MotionFrame } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

export default function Replay() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessions = useAppStore((s) => s.sessions);
  const patients = useAppStore((s) => s.patients);

  const session = sessions.find((s) => s.id === sessionId);
  const [actionIdx, setActionIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);

  const result = session?.results[actionIdx];
  const frames = result?.frames || [];

  useEffect(() => {
    if (!isPlaying) return;
    let i = frameIdx;
    const timer = setInterval(() => {
      i++;
      if (i >= frames.length) {
        setIsPlaying(false);
        setFrameIdx(frames.length - 1);
        clearInterval(timer);
      } else {
        setFrameIdx(i);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [isPlaying, frames.length, frameIdx]);

  const currentFrame: MotionFrame | null = frames[frameIdx] || null;

  const deviationSegments = useMemo(() => {
    if (!frames.length) return [];
    const segments: { start: number; end: number; maxDev: number }[] = [];
    const threshold = 15;
    let start = -1;
    let maxDev = 0;
    frames.forEach((f, i) => {
      if (f.deviation >= threshold) {
        if (start === -1) {
          start = i;
          maxDev = f.deviation;
        } else {
          maxDev = Math.max(maxDev, f.deviation);
        }
      } else {
        if (start !== -1) {
          segments.push({ start, end: i - 1, maxDev });
          start = -1;
          maxDev = 0;
        }
      }
    });
    if (start !== -1) segments.push({ start, end: frames.length - 1, maxDev });
    return segments;
  }, [frames]);

  const targetAngleFromFrames = result?.frames[0]?.targetAngle ?? 0;
  const chartData = frames.map((f, i) => ({
    idx: i,
    current: f.currentAngle,
    target: f.targetAngle,
    deviation: f.deviation,
    rhythm: f.rhythmScore
  }));

  const currentAngle = currentFrame?.currentAngle || 0;
  const rad = (currentAngle * Math.PI) / 180;
  const bodyPart = session?.bodyPart || 'shoulder';
  const color = currentFrame?.isStable ? '#10b981' : '#ef4444';

  if (!session || !result) {
    return (
      <div className="empty-state">
        <Clock />
        <div className="empty-title">未找到训练记录</div>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/reports')}>
          <ArrowLeft size={16} /> 返回报告
        </button>
      </div>
    );
  }

  const patient = patients.find((p) => p.id === session.patientId);

  return (
    <div>
      <div className="flex justify-between items-center mb-20 flex-wrap" style={{ gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
          <ArrowLeft size={16} /> 返回报告
        </button>
        <div className="flex items-center gap-16">
          {patient && (
            <div className="patient-chip">
              <UserCircle size={20} />
              {patient.name}
            </div>
          )}
          <span className="tag tag-blue">{session.planName}</span>
          <span className="tag tag-green">总分 {session.totalScore}</span>
          <span className="tag tag-yellow">疼痛 {session.overallPainLevel}/10</span>
        </div>
      </div>

      <div className="row">
        <div style={{ gridColumn: 'span 5' }}>
          <div className={`camera-area ${currentFrame?.isStable ? 'connected' : ''}`}>
            <div className="skeleton-avatar">
              <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                <circle cx="200" cy="90" r="28" fill="none" stroke={color} strokeWidth="4" />
                <line x1="200" y1="118" x2="200" y2="230" stroke={color} strokeWidth="5" strokeLinecap="round" />
                {bodyPart !== 'knee' && (
                  <>
                    <line x1="200" y1="170"
                      x2={200 - Math.cos(rad) * 80}
                      y2={170 - Math.sin(rad) * 80}
                      stroke={color} strokeWidth="4" strokeLinecap="round" />
                    <line x1="200" y1="170"
                      x2={200 + Math.cos(rad) * 80}
                      y2={170 - Math.sin(rad) * 80}
                      stroke={color} strokeWidth="4" strokeLinecap="round" />
                  </>
                )}
                <line x1="200" y1="230" x2="175" y2="340" stroke={color} strokeWidth="5" strokeLinecap="round" />
                <line x1="200" y1="230" x2="225" y2="340" stroke={color} strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={`stability-indicator ${currentFrame?.isStable ? 'stable' : 'unstable'}`}>
              {currentFrame?.isStable ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {currentFrame?.isStable ? '动作稳定' : '偏差较大'}
            </div>
            <div className="angle-indicator">
              <div className="angle-label">当前角度</div>
              <div className="angle-value">{Math.round(currentAngle)}°</div>
              <div className="angle-target">目标 {currentFrame?.targetAngle || 0}°</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, padding: 16 }}>
            <div className="flex items-center justify-between mb-12">
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                帧 {frameIdx + 1} / {frames.length}
              </div>
              <div className="flex gap-8">
                <button className="btn btn-sm btn-secondary" onClick={() => setFrameIdx(0)}>
                  <ChevronLeft size={14} /><ChevronLeft size={14} style={{ marginLeft: -8 }} />
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setFrameIdx(Math.max(0, frameIdx - 10))}>
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    background: isPlaying ? 'var(--gradient-warning)' : 'var(--gradient-success)',
                    color: 'white',
                    minWidth: 80
                  }}
                  onClick={() => setIsPlaying((v) => !v)}
                >
                  {isPlaying ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                  {isPlaying ? '暂停' : '播放'}
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setFrameIdx(Math.min(frames.length - 1, frameIdx + 10))}>
                  <ChevronRight size={14} />
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setFrameIdx(frames.length - 1)}>
                  <ChevronRight size={14} /><ChevronRight size={14} style={{ marginLeft: -8 }} />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={frameIdx}
              onChange={(e) => {
                setIsPlaying(false);
                setFrameIdx(parseInt(e.target.value));
              }}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div className="flex items-center gap-12">
                <button className="btn btn-sm btn-secondary"
                  onClick={() => setActionIdx(Math.max(0, actionIdx - 1))}
                  disabled={actionIdx === 0}
                >
                  <ChevronLeft size={14} />
                </button>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    动作 {actionIdx + 1} / {session.results.length}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{result.actionName}</div>
                </div>
                <button className="btn btn-sm btn-secondary"
                  onClick={() => setActionIdx(Math.min(session.results.length - 1, actionIdx + 1))}
                  disabled={actionIdx === session.results.length - 1}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-16">
                <div className="text-center">
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-primary)' }}>{result.rhythmScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>节奏</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-success)' }}>{result.amplitudeScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>幅度</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-warning)' }}>{result.stabilityScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>稳定</div>
                </div>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `conic-gradient(var(--gradient-primary) ${result.overallScore}%, var(--bg-tertiary) 0)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16
                  }}>{result.overallScore}</div>
                </div>
              </div>
            </div>

            <div className="score-bars">
              <div className="score-bar">
                <span className="score-label">节奏</span>
                <div className="score-track">
                  <div className="score-fill blue" style={{ width: `${result.rhythmScore}%` }} />
                </div>
                <span className="score-number">{result.rhythmScore}</span>
              </div>
              <div className="score-bar">
                <span className="score-label">幅度</span>
                <div className="score-track">
                  <div className="score-fill green" style={{ width: `${result.amplitudeScore}%` }} />
                </div>
                <span className="score-number">{result.amplitudeScore}</span>
              </div>
              <div className="score-bar">
                <span className="score-label">稳定</span>
                <div className="score-track">
                  <div className="score-fill yellow" style={{ width: `${result.stabilityScore}%` }} />
                </div>
                <span className="score-number">{result.stabilityScore}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>角度轨迹</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="idx" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }}
                  />
                  <ReferenceLine y={targetAngleFromFrames} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="目标" />
                  <Line type="monotone" dataKey="current" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="实际" />
                  <Line
                    type="monotone"
                    dataKey={() => frameIdx}
                    stroke="transparent"
                    dot={{ r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }}
                    activeDot={false}
                  />
                  <Brush
                    dataKey="idx"
                    height={24}
                    stroke="#3b82f6"
                    fill="#1e293b"
                    startIndex={0}
                    endIndex={frames.length - 1}
                    onChange={(e: any) => {
                      if (e && typeof e.startIndex === 'number') {
                        setFrameIdx(e.startIndex);
                        setIsPlaying(false);
                      }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="flex items-center justify-between mb-12">
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ display: 'inline', color: 'var(--accent-warning)', marginRight: 6, verticalAlign: 'middle' }} />
                动作偏差分段分析
              </div>
              <span className="tag tag-yellow">{deviationSegments.length} 处异常</span>
            </div>
            {deviationSegments.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--accent-success)', fontSize: 13 }}>
                <CheckCircle2 size={28} style={{ display: 'block', margin: '0 auto 8px' }} />
                本次动作表现良好，未检测到明显偏差
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {deviationSegments.map((seg, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-12"
                    style={{
                      padding: '10px 14px',
                      background: 'var(--accent-warning-bg)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'left',
                      color: 'inherit'
                    }}
                    onClick={() => {
                      setFrameIdx(seg.start);
                      setIsPlaying(false);
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'var(--accent-warning)',
                      color: 'white', fontWeight: 700, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>
                        第 {Math.floor(seg.start / 40) + 1} 次重复
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        帧 {seg.start}-{seg.end} · 最大偏差 {seg.maxDev.toFixed(1)}°
                      </div>
                    </div>
                    <Target size={16} style={{ color: 'var(--text-dim)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {session.results.map((r, i) => (
              <button
                key={r.actionId}
                className="flex items-center gap-8"
                onClick={() => {
                  setActionIdx(i);
                  setFrameIdx(0);
                  setIsPlaying(false);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: i === actionIdx ? 'var(--gradient-primary)' : 'var(--bg-card)',
                  color: i === actionIdx ? 'white' : 'var(--text-secondary)',
                  border: i === actionIdx ? 'none' : '1px solid var(--border-color)',
                  fontSize: 13,
                  fontWeight: i === actionIdx ? 600 : 500,
                  transition: 'var(--transition)',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.8 }}>#{i + 1}</span>
                {r.actionName}
                <span style={{
                  marginLeft: 4,
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 100,
                  background: i === actionIdx ? 'rgba(255,255,255,0.2)' : 'var(--accent-success-bg)',
                  color: i === actionIdx ? 'white' : 'var(--accent-success)'
                }}>{r.overallScore}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
