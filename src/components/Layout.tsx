import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  PlayCircle,
  History,
  FileBarChart,
  Activity,
  UserCircle,
  Bell
} from 'lucide-react';
import { useAppStore } from '../store';

const navItems = [
  { to: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { to: '/patients', label: '患者档案', icon: Users },
  { to: '/plans', label: '训练方案', icon: ClipboardList },
  { to: '/reports', label: '康复报告', icon: FileBarChart }
];

export default function Layout() {
  const location = useLocation();
  const currentPatient = useAppStore((s) => s.currentPatient);
  const sessions = useAppStore((s) => s.sessions);
  const todaySessions = sessions.filter((s) => s.startedAt.startsWith(new Date().toISOString().slice(0, 10)));

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Activity size={28} />
          </div>
          <div>
            <div className="logo-title">智慧康复</div>
            <div className="logo-sub">Smart Rehab System</div>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive || location.pathname.startsWith(item.to + '/') ? 'active' : ''}`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-user">
            <UserCircle size={36} />
            <div>
              <div className="footer-name">康复师 · 陈医生</div>
              <div className="footer-role">物理治疗科</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <div>
            <h1 className="page-title">{getPageTitle(location.pathname)}</h1>
            <div className="page-sub">{getPageSubtitle(location.pathname)}</div>
          </div>
          <div className="topbar-actions">
            {currentPatient && (
              <div className="patient-chip">
                <UserCircle size={22} />
                <span>当前患者: {currentPatient.name}</span>
              </div>
            )}
            <button className="icon-btn">
              <Bell size={20} />
              {todaySessions.length > 0 && <span className="badge">{todaySessions.length}</span>}
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getPageTitle(path: string): string {
  if (path.startsWith('/dashboard')) return '工作台';
  if (path.startsWith('/patients') && path.includes('/patients/')) return '患者详情';
  if (path.startsWith('/patients')) return '患者档案管理';
  if (path.startsWith('/plans/build')) return '构建训练方案';
  if (path.startsWith('/plans')) return '训练方案库';
  if (path.startsWith('/training')) return '实时训练';
  if (path.startsWith('/replay')) return '训练回放';
  if (path.startsWith('/reports')) return '康复分析报告';
  return '工作台';
}

function getPageSubtitle(path: string): string {
  if (path.startsWith('/dashboard')) return '今日训练概览和关键指标';
  if (path.startsWith('/patients') && path.includes('/patients/')) return '查看患者信息和训练历史';
  if (path.startsWith('/patients')) return '管理所有康复患者档案';
  if (path.startsWith('/plans/build')) return '自定义训练动作和参数';
  if (path.startsWith('/plans')) return '浏览和选择康复训练方案';
  if (path.startsWith('/training')) return '实时动作指导和评分反馈';
  if (path.startsWith('/replay')) return '逐帧分析动作偏差';
  if (path.startsWith('/reports')) return '综合康复效果评估和建议';
  return '';
}
