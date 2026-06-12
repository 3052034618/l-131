import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  UserCircle,
  Phone,
  Calendar,
  Target,
  X,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store';
import type { Patient, BodyPart } from '../types';

const bodyPartMap: Record<BodyPart, { label: string; tag: string }> = {
  shoulder: { label: '肩部', tag: 'tag-blue' },
  knee: { label: '膝部', tag: 'tag-purple' },
  ankle: { label: '踝部', tag: 'tag-cyan' }
};

export default function Patients() {
  const navigate = useNavigate();
  const patients = useAppStore((s) => s.patients);
  const sessions = useAppStore((s) => s.sessions);
  const addPatient = useAppStore((s) => s.addPatient);
  const updatePatient = useAppStore((s) => s.updatePatient);
  const deletePatient = useAppStore((s) => s.deletePatient);
  const setCurrentPatient = useAppStore((s) => s.setCurrentPatient);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({
    name: '',
    gender: '男' as '男' | '女',
    age: 30,
    phone: '',
    injuryType: '',
    injuryDate: '',
    bodyPart: 'shoulder' as BodyPart,
    notes: ''
  });

  const filtered = patients.filter(
    (p) =>
      p.name.includes(search) ||
      p.injuryType.includes(search) ||
      p.phone.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      gender: '男',
      age: 30,
      phone: '',
      injuryType: '',
      injuryDate: new Date().toISOString().slice(0, 10),
      bodyPart: 'shoulder',
      notes: ''
    });
    setShowModal(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      name: p.name,
      gender: p.gender,
      age: p.age,
      phone: p.phone,
      injuryType: p.injuryType,
      injuryDate: p.injuryDate,
      bodyPart: p.bodyPart,
      notes: p.notes
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updatePatient(editing.id, form);
    } else {
      addPatient(form);
    }
    setShowModal(false);
  };

  const handleDelete = (p: Patient) => {
    if (confirm(`确认删除患者 ${p.name} 的档案？`)) {
      deletePatient(p.id);
    }
  };

  const getPatientSessions = (pid: string) => sessions.filter((s) => s.patientId === pid);

  return (
    <div>
      <div className="flex justify-between items-center mb-20">
        <div className="search-bar">
          <Search size={18} />
          <input
            placeholder="搜索患者姓名、诊断、电话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} /> 新建患者档案
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <UserCircle />
            <div className="empty-title">暂无患者档案</div>
            <div className="empty-desc">点击右上角按钮创建第一位患者的康复档案</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>患者信息</th>
                  <th>损伤情况</th>
                  <th>训练次数</th>
                  <th>最近训练</th>
                  <th>建档时间</th>
                  <th style={{ width: 180 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const ps = getPatientSessions(p.id);
                  const last = ps.length ? ps[ps.length - 1] : null;
                  const avg = ps.length
                    ? Math.round(ps.reduce((s, x) => s + x.totalScore, 0) / ps.length)
                    : null;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setCurrentPatient(p);
                        navigate(`/patients/${p.id}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="flex items-center gap-12">
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              background: 'var(--gradient-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: 15,
                              color: 'white'
                            }}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ fontSize: 14 }}>
                              {p.name}
                              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                {p.gender} · {p.age}岁
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                              {p.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>{p.injuryType}</div>
                        <span className={`tag ${bodyPartMap[p.bodyPart].tag}`}>
                          <Target size={10} style={{ display: 'inline', marginRight: 4 }} />
                          {bodyPartMap[p.bodyPart].label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {ps.length}
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>次</span>
                        </div>
                        {avg !== null && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>均分 {avg}</div>
                        )}
                      </td>
                      <td>
                        {last ? (
                          <div className="flex items-center gap-8">
                            <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                            <span style={{ fontSize: 13 }}>{last.startedAt.slice(0, 10)}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>暂无</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.createdAt}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-8">
                          <button className="btn btn-sm btn-secondary" onClick={() => {
                            setCurrentPatient(p);
                            navigate(`/patients/${p.id}`);
                          }}>
                            <ChevronRight size={16} />
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? '编辑患者档案' : '新建患者档案'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">姓名 *</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="请输入患者姓名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">性别</label>
                  <select
                    className="form-control"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as '男' | '女' })}
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">年龄</label>
                  <input
                    type="number"
                    className="form-control"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">联系电话</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="138xxxxxxxxx"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">损伤诊断</label>
                  <input
                    className="form-control"
                    value={form.injuryType}
                    onChange={(e) => setForm({ ...form, injuryType: e.target.value })}
                    placeholder="如：肩袖损伤"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">损伤部位</label>
                  <select
                    className="form-control"
                    value={form.bodyPart}
                    onChange={(e) => setForm({ ...form, bodyPart: e.target.value as BodyPart })}
                  >
                    <option value="shoulder">肩部</option>
                    <option value="knee">膝部</option>
                    <option value="ankle">踝部</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">损伤/手术日期</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.injuryDate}
                    onChange={(e) => setForm({ ...form, injuryDate: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">备注信息</label>
                  <textarea
                    className="form-control"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="病程描述、注意事项等"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editing ? '保存修改' : '创建档案'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
