import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Target,
  Clock,
  Repeat,
  Pause,
  UserCircle,
  Settings2
} from 'lucide-react';
import { useAppStore, getDefaultActionsByBodyPart } from '../store';
import type { ActionConfig, BodyPart, Difficulty } from '../types';

const bodyPartOptions: { value: BodyPart; label: string }[] = [
  { value: 'shoulder', label: '肩部训练' },
  { value: 'knee', label: '膝部训练' },
  { value: 'ankle', label: '踝部训练' }
];

const difficultyOptions: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy', label: '简单', color: 'var(--accent-success)' },
  { value: 'medium', label: '中等', color: 'var(--accent-warning)' },
  { value: 'hard', label: '困难', color: 'var(--accent-danger)' }
];

export default function PlanBuilder() {
  const navigate = useNavigate();
  const patients = useAppStore((s) => s.patients);
  const currentPatient = useAppStore((s) => s.currentPatient);
  const addPlan = useAppStore((s) => s.addPlan);

  const [planName, setPlanName] = useState(currentPatient
    ? `${currentPatient.name}康复方案`
    : '自定义康复方案');
  const [patientId, setPatientId] = useState(currentPatient?.id || '');
  const [bodyPart, setBodyPart] = useState<BodyPart>(currentPatient?.bodyPart || 'shoulder');
  const [actions, setActions] = useState<ActionConfig[]>(
    getDefaultActionsByBodyPart(currentPatient?.bodyPart || 'shoulder')
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const updateBodyPart = (bp: BodyPart) => {
    setBodyPart(bp);
    setActions(getDefaultActionsByBodyPart(bp));
  };

  const updateAction = (id: string, updates: Partial<ActionConfig>) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const removeAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const addNewAction = () => {
    const base = getDefaultActionsByBodyPart(bodyPart)[0];
    setActions((prev) => [
      ...prev,
      {
        ...base,
        id: `a_custom_${Date.now()}`,
        name: '自定义动作',
        description: '请填写动作描述',
        repetitions: 10,
        targetAngle: 45,
        holdSeconds: 3,
        restSeconds: 5
      }
    ]);
  };

  const totalDuration = useMemo(
    () => actions.reduce((acc, a) => acc + a.repetitions * (a.holdSeconds + a.restSeconds), 0),
    [actions]
  );

  const savePlan = () => {
    if (!planName.trim() || actions.length === 0) {
      alert('请填写方案名称并至少添加一个动作');
      return;
    }
    addPlan({
      name: planName,
      patientId,
      bodyPart,
      actions,
      totalDuration
    });
    navigate('/plans');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-20 flex-wrap" style={{ gap: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/plans')}>
          <ArrowLeft size={16} /> 返回方案列表
        </button>
        <div className="flex gap-12">
          <button className="btn btn-secondary" onClick={() => navigate('/plans')}>
            取消
          </button>
          <button className="btn btn-primary" onClick={savePlan}>
            <Save size={16} /> 保存方案
          </button>
        </div>
      </div>

      <div className="row">
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">方案基本信息</div>
          </div>

          <div className="form-group">
            <label className="form-label">方案名称 *</label>
            <input
              className="form-control"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="请输入方案名称"
            />
          </div>

          <div className="form-group">
            <label className="form-label">关联患者</label>
            <select
              className="form-control"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">-- 暂不指定 --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.injuryType}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">训练部位</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bodyPartOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateBodyPart(opt.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: bodyPart === opt.value ? 'var(--gradient-primary)' : 'var(--bg-primary)',
                    color: bodyPart === opt.value ? 'white' : 'var(--text-secondary)',
                    border: bodyPart === opt.value ? 'none' : '1px solid var(--border-color)',
                    fontSize: 14,
                    fontWeight: bodyPart === opt.value ? 600 : 500,
                    textAlign: 'left',
                    transition: 'var(--transition)'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            padding: 16,
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            marginTop: 16
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>方案统计</div>
            <div className="grid-2">
              <div className="text-center">
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)' }}>{actions.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>动作数量</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-success)' }}>{Math.round(totalDuration / 60)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>预估分钟</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 8' }}>
          <div className="card mb-20">
            <div className="card-header">
              <div className="card-title">动作列表</div>
              <button className="btn btn-sm btn-primary" onClick={addNewAction}>
                <Plus size={14} /> 添加自定义动作
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="empty-state">
                <Settings2 />
                <div className="empty-title">暂无动作配置</div>
                <div className="empty-desc">点击上方按钮添加自定义动作</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {actions.map((action, idx) => {
                  const isOpen = expanded === action.id;
                  return (
                    <div
                      key={action.id}
                      style={{
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        className="flex items-center gap-12"
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpanded(isOpen ? null : action.id)}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--gradient-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{action.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {action.description}
                          </div>
                        </div>
                        <div className="flex gap-16" style={{ flexShrink: 0 }}>
                          <div className="text-center">
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)' }}>
                              {action.repetitions}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>次数</div>
                          </div>
                          <div className="text-center">
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              {action.targetAngle}°
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>角度</div>
                          </div>
                          <div className="text-center">
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-success)' }}>
                              {action.holdSeconds}s
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>保持</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAction(action.id);
                            }}
                            className="btn btn-sm btn-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                          {isOpen ? <ChevronUp size={18} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-dim)' }} />}
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ padding: '16px 0 4px' }}>
                            <div className="grid-2 mb-20">
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">动作名称</label>
                                <input
                                  className="form-control"
                                  value={action.name}
                                  onChange={(e) => updateAction(action.id, { name: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">难度等级</label>
                                <select
                                  className="form-control"
                                  value={action.difficulty}
                                  onChange={(e) => updateAction(action.id, { difficulty: e.target.value as Difficulty })}
                                >
                                  {difficultyOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">动作描述</label>
                              <textarea
                                className="form-control"
                                value={action.description}
                                onChange={(e) => updateAction(action.id, { description: e.target.value })}
                                style={{ minHeight: 60 }}
                              />
                            </div>
                            <div className="grid-4">
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">
                                  <Repeat size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                  重复次数
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={1}
                                  value={action.repetitions}
                                  onChange={(e) => updateAction(action.id, { repetitions: parseInt(e.target.value) || 1 })}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">
                                  <Target size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                  目标角度 (°)
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  max={180}
                                  value={action.targetAngle}
                                  onChange={(e) => updateAction(action.id, { targetAngle: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">
                                  <Pause size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                  保持时间 (秒)
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={1}
                                  value={action.holdSeconds}
                                  onChange={(e) => updateAction(action.id, { holdSeconds: parseInt(e.target.value) || 1 })}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">
                                  <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                  休息间隔 (秒)
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  min={1}
                                  value={action.restSeconds}
                                  onChange={(e) => updateAction(action.id, { restSeconds: parseInt(e.target.value) || 1 })}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
