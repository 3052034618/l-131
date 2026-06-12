import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Activity,
  ChevronRight,
  Calendar,
  Zap,
  Heart
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
  BarChart,
  Bar,
  Legend
} from 'recharts';

const bodyPartMap = {
  shoulder: { label: '肩部', color: '#3b82f6' },
  knee: { label: '膝部', color: '#8b5cf6' },
  ankle: { label: '踝部', color: '#06b6d4' }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const patients = useAppStore((s) => s.patients);
  const plans = useAppStore((s) => s.plans);
  const sessions = useAppStore((s) => s.sessions);

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.startedAt.startsWith(today));
  const weekSessions = sessions.filter((s) => {
    const diff = (Date.now() - new Date(s.startedAt).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.totalScore, 0) / sessions.length)
    : 0;
  const avgCompletion = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.completionRate, 0) / sessions.length)
    : 0;

  const progressData = useMemo(() => {
    const last7: { date: string; score: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySessions = sessions.filter((s) => s.startedAt.startsWith(dateStr));
      last7.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        score: daySessions.length
          ? Math.round(daySessions.reduce((s, x) => s + x.totalScore, 0) / daySessions.length)
          : 0,
        count: daySessions.length
      });
    }
    return last7;
  }, [sessions]);

  const bodyPartData = useMemo(() => {
    const counts = { shoulder: 0, knee: 0, ankle: 0 };
    patients.forEach((p) => {
      counts[p.bodyPart]++;
    });
    return [
      { name: '肩部', value: counts.shoulder, fill: '#3b82f6' },
      { name: '膝部', value: counts.knee, fill: '#8b5cf6' },
      { name: '踝部', value: counts.ankle, fill: '#06b6d4' }
    ];
  }, [patients]);

  const recentSessions = sessions.slice(-5).reverse();

  return (
    <div>
      <div className="stats-grid mb-24">
        <div className="stat-card success">
          <div className="stat-label">今日训练场次</div>
          <div className="stat-value">{todaySessions.length}</div>
          <div className="stat-change up">
            <Zap size={14} />
            较昨日 +{Math.max(0, todaySessions.length - 1)}
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">在管患者数量</div>
          <div className="stat-value">{patients.length}</div>
          <div className="stat-change up">
            <Users size={14} />
            本周新增 2 位
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">平均训练评分</div>
          <div className="stat-value">{avgScore}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span></div>
          <div className="stat-change up">
            <TrendingUp size={14} />
            较上周 +4.2
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均完成率</div>
          <div className="stat-value">{avgCompletion}%</div>
          <div className="stat-change up">
            <ClipboardCheck size={14} />
            达标
          </div>
        </div>
      </div>

      <div className="row mb-24">
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-header">
            <div className="card-title">近7日训练趋势</div>
            <div className="flex gap-12 text-muted" style={{ fontSize: 12 }}>
              <span><Zap size={14} style={{ color: '#3b82f6' }} /> 场均评分</span>
              <span><Activity size={14} style={{ color: '#10b981' }} /> 训练场次</span>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    color: '#f8fafc',
                    fontSize: 12
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} name="评分" />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} name="场次" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-header">
            <div className="card-title">患者损伤部位分布</div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bodyPartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    color: '#f8fafc',
                    fontSize: 12
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={40}>
                  {bodyPartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div className="card-header">
            <div className="card-title">近期训练记录</div>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/reports')}>
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>患者</th>
                  <th>方案</th>
                  <th>完成率</th>
                  <th>评分</th>
                  <th>疼痛</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => {
                  const p = patients.find((x) => x.id === s.patientId);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-8">
                          <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                          <span style={{ fontSize: 13 }}>{s.startedAt.slice(0, 16)}</span>
                        </div>
                      </td>
                      <td className="font-semibold">{p?.name || '-'}</td>
                      <td>{s.planName}</td>
                      <td>
                        <span className={`tag ${s.completionRate >= 95 ? 'tag-green' : s.completionRate >= 80 ? 'tag-yellow' : 'tag-red'}`}>
                          {s.completionRate}%
                        </span>
                      </td>
                      <td className="font-semibold" style={{ color: s.totalScore >= 85 ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                        {s.totalScore}
                      </td>
                      <td>
                        <div className="flex items-center gap-8">
                          <Heart size={14} style={{ color: 'var(--accent-danger)' }} />
                          <span>{s.overallPainLevel}/10</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/replay/${s.id}`)}>
                          回放
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">快捷操作</div>
          </div>
          <div className="flex flex-col" style={{ flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary btn-block"
              style={{ justifyContent: 'flex-start', padding: '14px 18px' }}
              onClick={() => navigate('/patients')}
            >
              <Users size={20} /> 管理患者档案
            </button>
            <button
              className="btn btn-secondary btn-block"
              style={{ justifyContent: 'flex-start', padding: '14px 18px' }}
              onClick={() => navigate('/plans/build')}
            >
              <ClipboardCheck size={20} /> 新建训练方案
            </button>
            <button
              className="btn btn-success btn-block"
              style={{ justifyContent: 'flex-start', padding: '14px 18px' }}
              onClick={() => navigate('/plans')}
            >
              <Activity size={20} /> 开始训练
            </button>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
              今日提示
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              • 张伟的肩部训练已完成2次，建议下次增加角度目标至100°<br />
              • 李芳下周需进行膝关节活动度评估<br />
              • 王磊的平衡训练稳定性评分偏低，需加强本体感觉训练
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
