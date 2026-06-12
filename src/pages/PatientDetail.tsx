import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserCircle,
  Phone,
  Calendar,
  Target,
  FileText,
  PlayCircle,
  ClipboardList,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { useAppStore } from '../store';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import type { BodyPart } from '../types';

const bodyPartMap: Record<BodyPart, string> = {
  shoulder: '肩部',
  knee: '膝部',
  ankle: '踝部'
};

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patients = useAppStore((s) => s.patients);
  const plans = useAppStore((s) => s.plans);
  const sessions = useAppStore((s) => s.sessions);
  const setCurrentPatient = useAppStore((s) => s.setCurrentPatient);
  const setCurrentPlan = useAppStore((s) => s.setCurrentPlan);

  const patient = patients.find((p) => p.id === id);
  if (!patient) {
    return (
      <div className="empty-state">
        <UserCircle />
        <div className="empty-title">未找到患者</div>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/patients')}>
          <ArrowLeft size={16} /> 返回列表
        </button>
      </div>
    );
  }

  const patientPlans = plans.filter((p) => p.patientId === patient.id);
  const patientSessions = sessions
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  const progressData = patientSessions.map((s) => ({
    date: s.startedAt.slice(5, 10),
    score: s.totalScore,
    completion: s.completionRate
  }));

  const avgScore = patientSessions.length
    ? Math.round(patientSessions.reduce((s, x) => s + x.totalScore, 0) / patientSessions.length)
    : 0;
  const avgCompletion = patientSessions.length
    ? Math.round(patientSessions.reduce((s, x) => s + x.completionRate, 0) / patientSessions.length)
    : 0;
  const avgPain = patientSessions.length
    ? (patientSessions.reduce((s, x) => s + x.overallPainLevel, 0) / patientSessions.length).toFixed(1)
    : 0;

  const startTraining = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
      setCurrentPatient(patient);
      navigate(`/training/${planId}`);
    }
  };

  return (
    <div>
      <button
        className="btn btn-secondary mb-20"
        onClick={() => navigate('/patients')}
      >
        <ArrowLeft size={16} /> 返回患者列表
      </button>

      <div className="card mb-20">
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 20 }}>
          <div className="flex items-center gap-20">
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 28,
                color: 'white',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)'
              }}
            >
              {patient.name.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{patient.name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                {patient.gender} · {patient.age}岁 · {bodyPartMap[patient.bodyPart]}康复
              </div>
              <div className="flex gap-16 flex-wrap" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{patient.phone}</span>
                <span><Target size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{patient.injuryType}</span>
                <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />受伤日期 {patient.injuryDate}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-12">
            {patientPlans.length > 0 ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => startTraining(patientPlans[0].id)}
              >
                <PlayCircle size={18} /> 开始最新训练
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  setCurrentPatient(patient);
                  navigate('/plans/build');
                }}
              >
                <ClipboardList size={18} /> 创建训练方案
              </button>
            )}
          </div>
        </div>
        {patient.notes && (
          <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
            <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            {patient.notes}
          </div>
        )}
      </div>

      <div className="stats-grid mb-24">
        <div className="stat-card success">
          <div className="stat-label">训练总次数</div>
          <div className="stat-value">{patientSessions.length}</div>
          <div className="stat-change up"><ClipboardList size={14} /> 累计参与</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均评分</div>
          <div className="stat-value">{avgScore}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span></div>
          <div className="stat-change up"><TrendingUp size={14} /> 趋势上升</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">平均完成率</div>
          <div className="stat-value">{avgCompletion}%</div>
          <div className="stat-change up">达标</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">平均疼痛指数</div>
          <div className="stat-value">{avgPain}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/10</span></div>
          <div className="stat-change up">控制良好</div>
        </div>
      </div>

      <div className="row mb-24">
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <div className="card-header">
            <div className="card-title">康复进步曲线</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>共 {patientSessions.length} 次训练记录</div>
          </div>
          {progressData.length === 0 ? (
            <div className="empty-state">
              <TrendingUp />
              <div className="empty-title">暂无训练数据</div>
              <div className="empty-desc">开始训练后将在这里展示进步曲线</div>
            </div>
          ) : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: 12
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fill="url(#scoreGrad)" name="评分" />
                  <Area type="monotone" dataKey="completion" stroke="#10b981" strokeWidth={3} fill="url(#compGrad)" name="完成率%" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-header">
            <div className="card-title">可用训练方案</div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setCurrentPatient(patient);
                navigate('/plans/build');
              }}
            >
              <ClipboardList size={14} /> 新建
            </button>
          </div>
          <div className="action-list">
            {patientPlans.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <ClipboardList />
                <div className="empty-title">尚未创建方案</div>
                <div className="empty-desc">为患者创建个性化康复训练方案</div>
              </div>
            ) : (
              patientPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="action-item"
                  onClick={() => startTraining(plan.id)}
                >
                  <div className="action-icon">
                    <PlayCircle size={22} />
                  </div>
                  <div className="action-info">
                    <div className="action-name">{plan.name}</div>
                    <div className="action-desc">
                      {plan.actions.length} 个动作 · 约 {Math.round(plan.totalDuration / 60)} 分钟
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--text-dim)' }} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-header">
            <div className="card-title">历史训练记录</div>
          </div>
          {patientSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <FileText />
              <div className="empty-title">暂无训练记录</div>
              <div className="empty-desc">完成训练后可在此查看详情</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>方案</th>
                    <th>完成率</th>
                    <th>评分</th>
                    <th>疼痛</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {[...patientSessions].reverse().map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontSize: 13 }}>{s.startedAt}</td>
                      <td>{s.planName}</td>
                      <td>
                        <span className={`tag ${s.completionRate >= 95 ? 'tag-green' : s.completionRate >= 80 ? 'tag-yellow' : 'tag-red'}`}>
                          {s.completionRate}%
                        </span>
                      </td>
                      <td className="font-semibold">{s.totalScore}</td>
                      <td>{s.overallPainLevel}/10</td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/replay/${s.id}`)}
                        >
                          查看回放
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
