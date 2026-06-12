import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PlayCircle,
  PauseCircle,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Heart,
  Video,
  VideoOff,
  X,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react';
import { useAppStore } from '../store';
import { useMotionSimulator, computeScores } from '../hooks/useMotionSimulator';
import type { ActionResult, PainLevel, TrainingSession, Patient, BodyPart } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const phaseText: Record<string, string> = {
  up: '动作向上',
  hold: '保持不动',
  down: '动作放下',
  rest: '休息中'
};

const bodyPartMap: Record<BodyPart, string> = {
  shoulder: '肩部',
  knee: '膝部',
  ankle: '踝部'
};

export default function Training() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const plans = useAppStore((s) => s.plans);
  const patients = useAppStore((s) => s.patients);
  const sessions = useAppStore((s) => s.sessions);
  const currentPatient = useAppStore((s) => s.currentPatient);
  const addSession = useAppStore((s) => s.addSession);
  const setCurrentSession = useAppStore((s) => s.setCurrentSession);
  const setCurrentPatient = useAppStore((s) => s.setCurrentPatient);

  const plan = plans.find((p) => p.id === planId);
  const [actionIndex, setActionIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'error' | 'no-device'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [results, setResults] = useState<ActionResult[]>([]);
  const [painLevel, setPainLevel] = useState<PainLevel>(0);
  const [showPainModal, setShowPainModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [pendingResult, setPendingResult] = useState<ActionResult | null>(null);
  const [sessionPatient, setSessionPatient] = useState<Patient | null>(null);
  const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);
  const startedAtRef = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const actionCompletedRef = useRef<boolean>(false);

  const currentAction = plan?.actions[actionIndex];
  const motion = useMotionSimulator({ action: currentAction, isRunning });

  const finishedSession = finishedSessionId ? sessions.find((s) => s.id === finishedSessionId) : null;

  useEffect(() => {
    if (!plan || !currentAction) return;
    startedAtRef.current = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
  }, [plan]);

  useEffect(() => {
    if (!plan) return;
    const hasPatientInPlan = plan.patientId && patients.find((p) => p.id === plan.patientId);
    if (hasPatientInPlan) {
      const p = patients.find((x) => x.id === plan.patientId)!;
      setSessionPatient(p);
      setShowPatientSelect(false);
      return;
    }
    setCurrentPatient(null);
    setSessionPatient(null);
    setShowPatientSelect(true);
  }, [planId]);

  useEffect(() => {
    actionCompletedRef.current = false;
  }, [actionIndex]);

  useEffect(() => {
    if (!currentAction || !isRunning) {
      actionCompletedRef.current = false;
      return;
    }
    if (motion.repCount >= currentAction.repetitions && motion.repCount > 0 && !actionCompletedRef.current) {
      actionCompletedRef.current = true;
      handleActionComplete();
    }
  }, [motion.repCount, isRunning, currentAction]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((d) => d.kind === 'videoinput');
      if (!hasCamera) {
        setCameraStatus('no-device');
        setCameraError('未检测到摄像头设备');
        return;
      }
      setCameraStatus('requesting');
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus('active');
      setCameraOn(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraStatus('error');
      if (err.name === 'NotAllowedError') {
        setCameraError('摄像头权限被拒绝，请在浏览器设置中允许访问');
      } else if (err.name === 'NotFoundError') {
        setCameraStatus('no-device');
        setCameraError('未找到可用的摄像头设备');
      } else if (err.name === 'NotReadableError') {
        setCameraError('摄像头被其他程序占用');
      } else {
        setCameraError(err.message || '无法访问摄像头');
      }
      setCameraOn(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setCameraStatus('idle');
    setCameraError('');
  };

  const selectPatient = (patient: Patient) => {
    setSessionPatient(patient);
    setCurrentPatient(patient);
    setShowPatientSelect(false);
  };

  const handleActionComplete = () => {
    setIsRunning(false);
    const scores = computeScores(motion.frames);
    const result: ActionResult = {
      actionId: currentAction!.id,
      actionName: currentAction!.name,
      completedReps: currentAction!.repetitions,
      totalReps: currentAction!.repetitions,
      rhythmScore: scores.rhythmScore,
      amplitudeScore: scores.amplitudeScore,
      stabilityScore: scores.stabilityScore,
      overallScore: scores.overallScore,
      painLevel: painLevel,
      frames: motion.frames,
      startedAt: Date.now() - currentAction!.repetitions * 8000,
      endedAt: Date.now(),
      targetAngle: currentAction!.targetAngle
    };
    setPendingResult(result);
    setShowPainModal(true);
  };

  const confirmPainAndNext = () => {
    if (!pendingResult) return;
    const resultWithPain = { ...pendingResult, painLevel };
    const newResults = [...results, resultWithPain];
    setResults(newResults);
    setShowPainModal(false);
    setPendingResult(null);
    setPainLevel(0);

    if (actionIndex >= plan!.actions.length - 1) {
      finalizeSession(newResults);
    } else {
      setActionIndex((i) => i + 1);
    }
  };

  const skipAction = () => {
    setIsRunning(false);
    const scores = motion.frames.length ? computeScores(motion.frames) : { rhythmScore: 60, amplitudeScore: 60, stabilityScore: 60, overallScore: 60 };
    const completed = Math.min(motion.repCount, currentAction!.repetitions);
    const result: ActionResult = {
      actionId: currentAction!.id,
      actionName: currentAction!.name,
      completedReps: completed,
      totalReps: currentAction!.repetitions,
      rhythmScore: scores.rhythmScore,
      amplitudeScore: scores.amplitudeScore,
      stabilityScore: scores.stabilityScore,
      overallScore: scores.overallScore,
      painLevel: painLevel,
      frames: motion.frames,
      startedAt: Date.now() - 5000,
      endedAt: Date.now(),
      targetAngle: currentAction!.targetAngle
    };
    const newResults = [...results, result];
    setResults(newResults);
    if (actionIndex >= plan!.actions.length - 1) {
      finalizeSession(newResults);
    } else {
      setActionIndex((i) => i + 1);
    }
  };

  const finalizeSession = (finalResults: ActionResult[]) => {
    const totalScore = Math.round(
      finalResults.reduce((s, r) => s + r.overallScore, 0) / finalResults.length
    );
    const totalReps = finalResults.reduce((s, r) => s + r.totalReps, 0);
    const completedReps = finalResults.reduce((s, r) => s + r.completedReps, 0);
    const completionRate = Math.round((completedReps / Math.max(totalReps, 1)) * 100);
    const overallPain = Math.round(
      finalResults.reduce((s, r) => s + r.painLevel, 0) / finalResults.length
    ) as PainLevel;

    const effectivePatientId = sessionPatient?.id || plan!.patientId || '';

    const session: TrainingSession = {
      id: `sess_${Date.now()}`,
      patientId: effectivePatientId,
      planId: plan!.id,
      planName: plan!.name,
      bodyPart: plan!.bodyPart,
      results: finalResults,
      totalScore,
      completionRate,
      overallPainLevel: overallPain,
      notes: generateNotes(finalResults, totalScore),
      startedAt: startedAtRef.current,
      endedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    };
    addSession(session);
    setCurrentSession(session);
    setFinishedSessionId(session.id);
    setShowSummary(true);
  };

  const chartData = useMemo(() => {
    if (!motion.frames.length) return [];
    return motion.frames.slice(-200).map((f, i) => ({
      idx: i,
      current: f.currentAngle,
      target: f.targetAngle
    }));
  }, [motion.frames]);

  if (!plan || !currentAction) {
    return (
      <div className="empty-state">
        <ArrowLeft />
        <div className="empty-title">未找到训练方案</div>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/plans')}>
          返回方案列表
        </button>
      </div>
    );
  }

  const overallProgress = ((actionIndex + (isRunning ? motion.repCount / currentAction.repetitions : results.length > actionIndex ? 1 : 0)) / plan.actions.length) * 100;
  const repProgress = isRunning ? (motion.repCount / currentAction.repetitions) * 100 : results.length > actionIndex ? 100 : 0;

  const effectivePatient = sessionPatient || (plan?.patientId ? patients.find((p) => p.id === plan.patientId) : null) || null;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div className="flex justify-between items-center mb-16">
        <button className="btn btn-secondary" onClick={() => {
          if (confirm('当前训练未完成，确定要退出吗？')) navigate('/plans');
        }}>
          <ArrowLeft size={16} /> 退出训练
        </button>
        <div className="flex items-center gap-16">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            患者：<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{effectivePatient?.name || '未指定'}</span>
          </div>
          <span className="tag tag-blue">{plan.name}</span>
          <button
            className={`btn btn-sm ${cameraStatus === 'error' || cameraStatus === 'no-device' ? 'btn-danger' : cameraStatus === 'requesting' ? 'btn-secondary' : cameraOn ? 'btn-success' : 'btn-secondary'}`}
            onClick={cameraOn ? stopCamera : startCamera}
            disabled={cameraStatus === 'requesting'}
          >
            {cameraStatus === 'requesting' ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 请求中</>
            ) : cameraOn ? (
              <><Video size={16} /> 关闭摄像头</>
            ) : (
              <><VideoOff size={16} /> 开启摄像头</>
            )}
          </button>
        </div>
      </div>

      {(cameraStatus === 'error' || cameraStatus === 'no-device') && (
        <div style={{
          padding: '12px 16px',
          marginBottom: 16,
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-danger-bg)',
          border: '1px solid var(--accent-danger)',
          color: 'var(--accent-danger)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertCircle size={18} />
          <span>{cameraError}</span>
          <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={startCamera}>
            重试
          </button>
        </div>
      )}

      <div style={{
        marginBottom: 20,
        height: 6,
        borderRadius: 3,
        background: 'var(--bg-tertiary)',
        overflow: 'hidden'
      }}>
        <div
          style={{
            height: '100%',
            width: `${overallProgress}%`,
            background: 'var(--gradient-primary)',
            transition: 'width 0.4s ease',
            borderRadius: 3
          }}
        />
      </div>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <div style={{ gridColumn: 'span 8' }}>
          <div className={`camera-area ${cameraStatus === 'active' ? 'connected' : ''}`}>
            {cameraStatus === 'active' ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  pointerEvents: 'none'
                }}>
                  <div className={`stability-indicator ${motion.isStable ? 'stable' : 'unstable'}`}>
                    <span className="stability-dot" />
                    {motion.isStable ? '动作稳定' : '需调整姿势'}
                  </div>
                  <div className="angle-indicator">
                    <div className="angle-label">当前角度</div>
                    <div className="angle-value">{Math.round(motion.currentAngle)}°</div>
                    <div className="angle-target">目标 {motion.targetAngle}°</div>
                  </div>
                  <div className="rep-counter">
                    <div className="rep-label">次数</div>
                    <div className="rep-value">
                      {motion.repCount}/{currentAction.repetitions}
                    </div>
                  </div>
                  <div className={`phase-badge ${motion.phase}`}>{phaseText[motion.phase]}</div>
                  <div className="rhythm-bar">
                    <div className="rhythm-fill" style={{ width: `${motion.rhythmScore}%` }} />
                  </div>
                </div>
              </>
            ) : cameraStatus === 'requesting' ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={48} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: 14 }}>正在请求摄像头权限...</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>请在弹出的对话框中点击"允许"</div>
              </div>
            ) : (
              <>
                <div className="skeleton-avatar">
                  <SkeletonFigure
                    angle={motion.currentAngle}
                    bodyPart={plan.bodyPart}
                    phase={motion.phase}
                  />
                </div>
                <div className={`stability-indicator ${motion.isStable ? 'stable' : 'unstable'}`}>
                  <span className="stability-dot" />
                  {motion.isStable ? '动作稳定' : '需调整姿势'}
                </div>
                <div className="angle-indicator">
                  <div className="angle-label">当前角度</div>
                  <div className="angle-value">{Math.round(motion.currentAngle)}°</div>
                  <div className="angle-target">目标 {motion.targetAngle}°</div>
                </div>
                <div className="rep-counter">
                  <div className="rep-label">次数</div>
                  <div className="rep-value">
                    {motion.repCount}/{currentAction.repetitions}
                  </div>
                </div>
                <div className={`phase-badge ${motion.phase}`}>{phaseText[motion.phase]}</div>
                <div className="rhythm-bar">
                  <div className="rhythm-fill" style={{ width: `${motion.rhythmScore}%` }} />
                </div>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none'
                }}>
                  <VideoOff size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  摄像头未开启 - 显示模拟画面
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>实时角度追踪</div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="idx" hide />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }}
                  />
                  <ReferenceLine y={motion.targetAngle} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '目标', fill: '#f59e0b', fontSize: 11, position: 'right' }} />
                  <Line type="monotone" dataKey="current" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="当前角度" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="flex justify-between items-center mb-12">
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  动作 {actionIndex + 1} / {plan.actions.length}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{currentAction.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {actionIndex > 0 && (
                  <button className="btn btn-sm btn-secondary" onClick={() => setActionIndex((i) => i - 1)}>
                    <ChevronLeft size={16} />
                  </button>
                )}
                {actionIndex < plan.actions.length - 1 && (
                  <button className="btn btn-sm btn-secondary" onClick={() => setActionIndex((i) => i + 1)}>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16 }}>
              {currentAction.description}
            </div>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="text-center">
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>{currentAction.repetitions}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>重复次数</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-cyan)' }}>{currentAction.targetAngle}°</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>目标角度</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-success)' }}>{currentAction.holdSeconds}s</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>保持时间</div>
              </div>
            </div>
            <div className="flex gap-10">
              {!isRunning ? (
                <button
                  className="btn btn-success btn-block"
                  onClick={() => {
                    if (!effectivePatient) {
                      setShowPatientSelect(true);
                      return;
                    }
                    actionCompletedRef.current = false;
                    setIsRunning(true);
                  }}
                  style={{ padding: '12px' }}
                >
                  <PlayCircle size={20} /> {results.length > actionIndex ? '重做本动作' : '开始训练'}
                </button>
              ) : (
                <button
                  className="btn btn-warning btn-block"
                  onClick={() => setIsRunning(false)}
                  style={{ padding: '12px', background: 'var(--gradient-warning)', color: 'white', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                >
                  <PauseCircle size={20} /> 暂停
                </button>
              )}
              <button className="btn btn-secondary" onClick={skipAction}>
                <SkipForward size={18} /> 跳过
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>实时评分</div>
            <div className="score-bars">
              <div className="score-bar">
                <span className="score-label">节奏</span>
                <div className="score-track">
                  <div className="score-fill blue" style={{ width: `${motion.rhythmScore}%` }} />
                </div>
                <span className="score-number">{motion.rhythmScore}</span>
              </div>
              <div className="score-bar">
                <span className="score-label">幅度</span>
                <div className="score-track">
                  <div className="score-fill green" style={{ width: `${Math.max(0, Math.min(100, 100 - motion.deviation * 1.5))}%` }} />
                </div>
                <span className="score-number">{Math.max(0, Math.min(100, Math.round(100 - motion.deviation * 1.5)))}</span>
              </div>
              <div className="score-bar">
                <span className="score-label">稳定</span>
                <div className="score-track">
                  <div className="score-fill yellow" style={{ width: `${motion.isStable ? 92 : 62}%` }} />
                </div>
                <span className="score-number">{motion.isStable ? 92 : 62}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>动作进度</div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${repProgress}%`, background: 'var(--gradient-success)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.actions.map((a, i) => {
                const r = results[i];
                const state = i < actionIndex ? 'done' : i === actionIndex ? 'current' : 'pending';
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-10"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: state === 'current' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-primary)',
                      border: state === 'current' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                      opacity: state === 'pending' ? 0.6 : 1
                    }}
                  >
                    {state === 'done' ? (
                      <CheckCircle2 size={18} style={{ color: 'var(--accent-success)' }} />
                    ) : (
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: state === 'current' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: state === 'current' ? 'white' : 'var(--text-dim)',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>{i + 1}</div>
                    )}
                    <div style={{ flex: 1, fontSize: 13, fontWeight: state === 'current' ? 600 : 500 }}>
                      {a.name}
                    </div>
                    {r && (
                      <span className="tag tag-green" style={{ fontSize: 11 }}>
                        {r.overallScore}分
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showPatientSelect && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">请选择训练患者</div>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                本方案未关联固定患者，请选择本次训练对应的患者，以确保训练报告归属正确：
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {patients.map((p) => (
                  <button
                    key={p.id}
                    className="flex items-center gap-12"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'left',
                      color: 'inherit',
                      transition: 'var(--transition)'
                    }}
                    onClick={() => selectPatient(p)}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--gradient-primary)',
                      color: 'white', fontWeight: 600, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {p.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.name}
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          {p.gender} · {p.age}岁
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.injuryType} · {bodyPartMap[p.bodyPart]}
                      </div>
                    </div>
                    <Users size={18} style={{ color: 'var(--text-dim)' }} />
                  </button>
                ))}
              </div>
              {patients.length === 0 && (
                <div className="empty-state" style={{ padding: '30px 10px' }}>
                  <Users />
                  <div className="empty-title">暂无患者档案</div>
                  <div className="empty-desc">请先在患者档案模块创建患者</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => navigate('/plans')}>
                返回方案
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/patients')}
                disabled={patients.length > 0}
                style={{ opacity: patients.length > 0 ? 0.5 : 1, cursor: patients.length > 0 ? 'not-allowed' : 'pointer' }}
              >
                新建患者
              </button>
            </div>
          </div>
        </div>
      )}

      {showPainModal && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">疼痛反馈 - {currentAction.name}</div>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                请评估本动作训练中的疼痛程度（0 = 无痛，10 = 剧痛）
              </div>
              <div style={{ padding: '20px 0' }}>
                <div style={{
                  fontSize: 48,
                  fontWeight: 800,
                  textAlign: 'center',
                  color: painLevel >= 7 ? 'var(--accent-danger)' : painLevel >= 4 ? 'var(--accent-warning)' : 'var(--accent-success)',
                  marginBottom: 12
                }}>
                  <Heart size={40} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  {painLevel}
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(parseInt(e.target.value) as PainLevel)}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
                <div className="pain-labels" style={{ marginTop: 6 }}>
                  <span>0 无痛</span>
                  <span>3 轻度</span>
                  <span>7 中度</span>
                  <span>10 剧痛</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={confirmPainAndNext}>
                {actionIndex >= plan.actions.length - 1 ? '完成训练' : '下一个动作'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="modal-title">🎉 训练完成！</div>
            </div>
            <div className="modal-body">
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div className="stat-card success" style={{ padding: 16 }}>
                  <div className="stat-label">总分</div>
                  <div className="stat-value">{finishedSession?.totalScore ?? 0}</div>
                </div>
                <div className="stat-card" style={{ padding: 16 }}>
                  <div className="stat-label">完成率</div>
                  <div className="stat-value">
                    {finishedSession?.completionRate ?? 0}%
                  </div>
                </div>
                <div className="stat-card purple" style={{ padding: 16 }}>
                  <div className="stat-label">平均疼痛</div>
                  <div className="stat-value">
                    {finishedSession?.overallPainLevel ?? 0}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>各动作评分</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {(finishedSession?.results || []).map((r) => (
                  <div key={r.actionId} className="flex items-center gap-12" style={{
                    padding: '10px 14px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{r.actionName}</div>
                    <div className="tag tag-green">{r.overallScore} 分</div>
                    <div className="tag tag-yellow">疼痛 {r.painLevel}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => navigate('/plans')}>返回方案</button>
              <button className="btn btn-primary" onClick={() => {
                if (finishedSessionId) {
                  navigate(`/replay/${finishedSessionId}`);
                }
              }} disabled={!finishedSessionId}>
                查看回放
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function generateNotes(results: ActionResult[], score: number): string {
  const notes: string[] = [];
  if (score >= 85) notes.push('整体训练表现优秀，动作完成度高。');
  else if (score >= 70) notes.push('训练完成较好，继续保持。');
  else notes.push('动作完成质量有待提升，建议增加基础练习。');
  const lowest = results.reduce((prev, curr) => (curr.overallScore < prev.overallScore ? curr : prev), results[0]);
  if (lowest) notes.push(`"${lowest.actionName}"评分较低，需重点关注。`);
  const painAvg = results.reduce((s, r) => s + r.painLevel, 0) / results.length;
  if (painAvg >= 4) notes.push('疼痛指数偏高，下次训练可适当降低强度。');
  return notes.join(' ');
}

function SkeletonFigure({ angle, bodyPart, phase }: { angle: number; bodyPart: string; phase: string }) {
  const rad = (angle * Math.PI) / 180;
  const color = phase === 'hold' ? '#10b981' : phase === 'up' ? '#3b82f6' : phase === 'down' ? '#f59e0b' : '#64748b';

  let limb1 = { x2: 140, y2: 180 };
  let limb2 = { x2: 260, y2: 180 };

  if (bodyPart === 'shoulder') {
    const len = 80;
    limb1 = { x2: 200 - Math.cos(rad) * len, y2: 170 - Math.sin(rad) * len };
    limb2 = { x2: 200 + Math.cos(rad) * len, y2: 170 - Math.sin(rad) * len };
  } else if (bodyPart === 'knee') {
    const len = 70;
    const baseY = 300;
    limb1 = { x2: 175, y2: baseY - len + Math.sin(rad) * len * 0.5 };
    limb2 = { x2: 225, y2: baseY - len + Math.sin(rad) * len * 0.5 };
  } else {
    const baseY = 340;
    const tilt = Math.sin(rad) * 10;
    limb1 = { x2: 200 - 25 + tilt, y2: baseY };
    limb2 = { x2: 200 + 25 - tilt, y2: baseY };
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="200" cy="90" r="28" fill="none" stroke={color} strokeWidth="4" filter="url(#glow)" />
      <line x1="200" y1="118" x2="200" y2="230" stroke={color} strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />

      {bodyPart !== 'knee' && (
        <>
          <line x1="200" y1="150" x2="200" y2="230" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <line x1="200" y1="170" x2={limb1.x2} y2={limb1.y2} stroke={color} strokeWidth="4" strokeLinecap="round" filter="url(#glow)" />
          <line x1="200" y1="170" x2={limb2.x2} y2={limb2.y2} stroke={color} strokeWidth="4" strokeLinecap="round" filter="url(#glow)" />
        </>
      )}

      <line x1="200" y1="230" x2="175" y2="340" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1="200" y1="230" x2="225" y2="340" stroke={color} strokeWidth="5" strokeLinecap="round" />

      {bodyPart === 'knee' && (
        <>
          <line x1="175" y1="340" x2={limb1.x2} y2={limb1.y2} stroke={color} strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />
          <line x1="225" y1="340" x2={limb2.x2} y2={limb2.y2} stroke={color} strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />
        </>
      )}

      <circle cx={limb1.x2} cy={limb1.y2} r="5" fill={color} />
      <circle cx={limb2.x2} cy={limb2.y2} r="5" fill={color} />
    </svg>
  );
}
