import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  PlayCircle,
  ChevronRight,
  Search,
  UserCircle,
  ClipboardList,
  Target,
  Clock,
  Activity
} from 'lucide-react';
import { useAppStore } from '../store';
import { useState } from 'react';
import type { BodyPart, Difficulty } from '../types';

const bodyPartMap: Record<BodyPart, { label: string; tag: string; iconBg: string }> = {
  shoulder: { label: '肩部', tag: 'tag-blue', iconBg: 'var(--gradient-primary)' },
  knee: { label: '膝部', tag: 'tag-purple', iconBg: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' },
  ankle: { label: '踝部', tag: 'tag-cyan', iconBg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }
};

const difficultyMap: Record<Difficulty, { label: string; tag: string }> = {
  easy: { label: '简单', tag: 'tag-green' },
  medium: { label: '中等', tag: 'tag-yellow' },
  hard: { label: '困难', tag: 'tag-red' }
};

export default function Plans() {
  const navigate = useNavigate();
  const plans = useAppStore((s) => s.plans);
  const patients = useAppStore((s) => s.patients);
  const sessions = useAppStore((s) => s.sessions);
  const setCurrentPlan = useAppStore((s) => s.setCurrentPlan);
  const setCurrentPatient = useAppStore((s) => s.setCurrentPatient);

  const [search, setSearch] = useState('');
  const [filterPart, setFilterPart] = useState<'all' | BodyPart>('all');

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      const matchSearch = p.name.includes(search);
      const matchPart = filterPart === 'all' || p.bodyPart === filterPart;
      return matchSearch && matchPart;
    });
  }, [plans, search, filterPart]);

  const startTraining = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    const patient = plan ? patients.find((x) => x.id === plan.patientId) : null;
    if (plan) {
      setCurrentPlan(plan);
      if (patient) setCurrentPatient(patient);
      navigate(`/training/${planId}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-20 flex-wrap" style={{ gap: 16 }}>
        <div className="flex gap-12 items-center flex-wrap">
          <div className="search-bar">
            <Search size={18} />
            <input
              placeholder="搜索方案名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-8">
            {(['all', 'shoulder', 'knee', 'ankle'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPart(p)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: filterPart === p ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
                  color: filterPart === p ? 'white' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'var(--transition)'
                }}
              >
                {p === 'all' ? '全部' : bodyPartMap[p].label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/plans/build')}>
          <Plus size={18} /> 新建训练方案
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ClipboardList />
            <div className="empty-title">暂无训练方案</div>
            <div className="empty-desc">点击右上角按钮创建新的康复训练方案</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map((plan) => {
            const patient = patients.find((p) => p.id === plan.patientId);
            const planSessions = sessions.filter((s) => s.planId === plan.id);
            const avgScore = planSessions.length
              ? Math.round(planSessions.reduce((s, x) => s + x.totalScore, 0) / planSessions.length)
              : null;
            const diffs = plan.actions.map((a) => a.difficulty);
            const overallDiff: Difficulty =
              diffs.includes('hard') ? 'hard' : diffs.includes('medium') ? 'medium' : 'easy';

            return (
              <div
                key={plan.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  transition: 'var(--transition)',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    padding: '20px 20px 16px',
                    background: bodyPartMap[plan.bodyPart].iconBg,
                    color: 'white'
                  }}
                >
                  <div className="flex justify-between items-start mb-12">
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Activity size={24} />
                    </div>
                    <span
                      className="tag"
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      {bodyPartMap[plan.bodyPart].label}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {plan.actions.length} 个动作 · 共约 {Math.round(plan.totalDuration / 60)} 分钟
                  </div>
                </div>

                <div style={{ padding: 16 }}>
                  <div className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-8" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      <UserCircle size={16} style={{ color: 'var(--text-dim)' }} />
                      {patient?.name || '未指定'}
                    </div>
                    <span className={`tag ${difficultyMap[overallDiff].tag}`}>
                      {difficultyMap[overallDiff].label}
                    </span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    {plan.actions.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-8"
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-primary)',
                          marginBottom: 6,
                          fontSize: 12,
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <Target size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name}
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>
                          {a.repetitions}次 · {a.targetAngle}°
                        </span>
                      </div>
                    ))}
                    {plan.actions.length > 3 && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '4px 10px' }}>
                        还有 {plan.actions.length - 3} 个动作...
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0 0',
                      borderTop: '1px solid var(--border-color)',
                      fontSize: 12
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)' }}>
                      <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      已训练 {planSessions.length} 次
                      {avgScore !== null && (
                        <span style={{ marginLeft: 8, color: 'var(--accent-success)', fontWeight: 600 }}>
                          均分 {avgScore}
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        startTraining(plan.id);
                      }}
                    >
                      <PlayCircle size={14} /> 开始
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
