import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart,
  TrendingUp,
  UserCircle,
  Calendar,
  Heart,
  Target,
  Activity,
  ChevronRight,
  Search,
  Award,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '../store';
import type { BodyPart } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const bodyPartMap: Record<BodyPart, string> = {
  shoulder: '肩部',
  knee: '膝部',
  ankle: '踝部'
};

export default function Reports() {
  const navigate = useNavigate();
  const sessions = useAppStore((s) => s.sessions);
  const patients = useAppStore((s) => s.patients);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = sessions.filter((s) => {
    const p = patients.find((x) => x.id === s.patientId);
    return (
      s.planName.includes(search) ||
      (p?.name.includes(search) ?? false)
    );
  }).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const selected = sessions.find((s) => s.id === selectedId) || filtered[0];

  const allTrend = useMemo(() => {
    const data: { date: string; score: number; rate: number }[] = [];
    const grouped = new Map<string, { scores: number[]; rates: number[] }>();
    sessions.forEach((s) => {
      const d = s.startedAt.slice(0, 10);
      if (!grouped.has(d)) grouped.set(d, { scores: [], rates: [] });
      grouped.get(d)!.scores.push(s.totalScore);
      grouped.get(d)!.rates.push(s.completionRate);
    });
    const sortedDates = Array.from(grouped.keys()).sort();
    sortedDates.slice(-14).forEach((d) => {
      const { scores, rates } = grouped.get(d)!;
      data.push({
        date: d.slice(5),
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        rate: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
      });
    });
    return data;
  }, [sessions]);

  const radarData = useMemo(() => {
    if (!selected) return [];
    const rhythm = Math.round(selected.results.reduce((s, r) => s + r.rhythmScore, 0) / selected.results.length);
    const amplitude = Math.round(selected.results.reduce((s, r) => s + r.amplitudeScore, 0) / selected.results.length);
    const stability = Math.round(selected.results.reduce((s, r) => s + r.stabilityScore, 0) / selected.results.length);
    const completion = selected.completionRate;
    const endurance = Math.round((10 - selected.overallPainLevel) * 10);
    return [
      { subject: '节奏', value: rhythm, fullMark: 100 },
      { subject: '幅度', value: amplitude, fullMark: 100 },
      { subject: '稳定', value: stability, fullMark: 100 },
      { subject: '完成度', value: completion, fullMark: 100 },
      { subject: '耐力', value: endurance, fullMark: 100 }
    ];
  }, [selected]);

  const painByAction = useMemo(() => {
    if (!selected) return [];
    return selected.results.map((r, i) => ({
      name: `动作${i + 1}`,
      fullName: r.actionName,
      pain: r.painLevel,
      score: r.overallScore
    }));
  }, [selected]);

  const recommendations = useMemo(() => {
    if (!selected) return [];
    const list: { type: 'success' | 'warning' | 'info'; title: string; text: string }[] = [];
    if (selected.totalScore >= 85) {
      list.push({
        type: 'success',
        title: '优秀表现',
        text: `本次训练总评分 ${selected.totalScore} 分，整体动作质量高，继续保持当前训练强度。`
      });
    } else if (selected.totalScore >= 70) {
      list.push({
        type: 'info',
        title: '稳步提升',
        text: `训练评分 ${selected.totalScore} 分，建议适当增加保持时间以巩固训练效果。`
      });
    } else {
      list.push({
        type: 'warning',
        title: '需加强基础',
        text: `本次评分偏低，建议先降低角度目标，着重提升动作稳定性。`
      });
    }

    const weakest = [...selected.results].sort((a, b) => a.overallScore - b.overallScore)[0];
    if (weakest && weakest.stabilityScore < 75) {
      list.push({
        type: 'warning',
        title: `重点改进：${weakest.actionName}`,
        text: `该动作稳定性评分仅 ${weakest.stabilityScore} 分，建议进行专项分解练习，放慢动作节奏。`
      });
    }
    if (selected.overallPainLevel >= 4) {
      list.push({
        type: 'warning',
        title: '疼痛监测',
        text: `平均疼痛指数 ${selected.overallPainLevel}/10，偏高，下次训练前应与医师确认是否调整强度。`
      });
    } else {
      list.push({
        type: 'success',
        title: '疼痛控制良好',
        text: `训练过程中疼痛可控（${selected.overallPainLevel}/10），可在下次尝试略微提高难度。`
      });
    }

    list.push({
      type: 'info',
      title: '下次训练建议',
      text: `建议 48 小时后进行下一次训练，训练前进行 10 分钟热身；保持规律训练是康复的关键。`
    });

    return list;
  }, [selected]);

  return (
    <div>
      <div className="stats-grid mb-24">
        <div className="stat-card success">
          <div className="stat-label">总训练次数</div>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-change up">
            <Activity size={14} />
            累计数据
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均综合评分</div>
          <div className="stat-value">
            {sessions.length
              ? Math.round(sessions.reduce((s, x) => s + x.totalScore, 0) / sessions.length)
              : 0}
          </div>
          <div className="stat-change up">
            <Award size={14} />
            整体良好
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">平均完成率</div>
          <div className="stat-value">
            {sessions.length
              ? Math.round(sessions.reduce((s, x) => s + x.completionRate, 0) / sessions.length)
              : 0}%
          </div>
          <div className="stat-change up">
            <Target size={14} />
            达标
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">整体疼痛均值</div>
          <div className="stat-value">
            {sessions.length
              ? (sessions.reduce((s, x) => s + x.overallPainLevel, 0) / sessions.length).toFixed(1)
              : 0}
          </div>
          <div className="stat-change up">
            <Heart size={14} />
            控制良好
          </div>
        </div>
      </div>

      <div className="row mb-24">
        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div className="card-header">
            <div className="card-title">全局训练趋势（近14天）</div>
            <span className="tag tag-blue">全体患者</span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={allTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#f8fafc', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} name="综合评分" />
                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="完成率(%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">训练记录列表</div>
          </div>
          <div className="search-bar" style={{ maxWidth: 'none', marginBottom: 12 }}>
            <Search size={16} />
            <input
              placeholder="搜索患者或方案..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 330, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 10px' }}>
                <FileBarChart />
                <div className="empty-title">暂无记录</div>
              </div>
            ) : (
              filtered.map((s) => {
                const p = patients.find((x) => x.id === s.patientId);
                const active = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: active ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-primary)',
                      border: active ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-color)',
                      textAlign: 'left',
                      color: 'inherit',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-10">
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--gradient-primary)',
                          color: 'white', fontWeight: 600, fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {p?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p?.name || '未指定'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            <Calendar size={10} style={{ verticalAlign: 'middle' }} /> {s.startedAt.slice(0, 16)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: s.totalScore >= 80 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                          {s.totalScore}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{s.completionRate}%</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selected && (
        <>
          <div className="card mb-24">
            <div className="card-header">
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  {selected.planName} - 详细报告
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {(() => {
                    const p = patients.find((x) => x.id === selected.patientId);
                    return `${p?.name || '未指定'} · ${bodyPartMap[selected.bodyPart]} · 训练时间 ${selected.startedAt}`;
                  })()}
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => navigate(`/replay/${selected.id}`)}>
                查看回放 <ChevronRight size={16} />
              </button>
            </div>

            <div className="row">
              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>综合能力雷达</div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Radar name="评分" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} strokeWidth={2} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>各动作疼痛 & 评分</div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={painByAction}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }}
                        formatter={(value: any, name: string, props: any) => {
                          if (name === 'pain') return [value + '/10', '疼痛指数'];
                          return [value, '评分'];
                        }}
                        labelFormatter={(label: string, payload: any) => payload?.[0]?.payload?.fullName || label}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === 'pain' ? '疼痛' : v === 'score' ? '评分' : v} />
                      <Bar dataKey="score" name="score" radius={[4, 4, 0, 0]}>
                        {painByAction.map((_, i) => (
                          <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>训练概览</div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--accent-success-bg)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>综合评分</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent-success)' }}>
                      {selected.totalScore}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent-success)', marginTop: 4 }}>
                      <ArrowUpRight size={12} style={{ display: 'inline' }} /> 良好
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>完成率</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {selected.completionRate}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 4 }}>
                      <BarChart3 size={12} style={{ display: 'inline' }} /> 达标
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.1)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>动作数</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#a78bfa' }}>
                      {selected.results.length}
                    </div>
                    <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 4 }}>
                      总动作数
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--accent-danger-bg)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>平均疼痛</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--accent-danger)' }}>
                      {selected.overallPainLevel}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent-danger)', marginTop: 4 }}>
                      <Heart size={12} style={{ display: 'inline' }} /> /10 级
                    </div>
                  </div>
                </div>
                {selected.notes && (
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    border: '1px solid var(--border-color)'
                  }}>
                    <Sparkles size={13} style={{ display: 'inline', color: 'var(--accent-warning)', verticalAlign: 'middle', marginRight: 4 }} />
                    医师备注：{selected.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Sparkles size={18} style={{ display: 'inline', color: 'var(--accent-warning)', marginRight: 6, verticalAlign: 'middle' }} />
                康复评估与下次训练建议
              </div>
            </div>
            <div>
              {recommendations.map((r, i) => (
                <div key={i} className={`recommendation-card ${r.type}`}>
                  <div className="recommendation-title">
                    {r.type === 'success' ? <Award size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> :
                      r.type === 'warning' ? <AlertCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> :
                        <TrendingUp size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />}
                    {r.title}
                  </div>
                  <div className="recommendation-text">{r.text}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
