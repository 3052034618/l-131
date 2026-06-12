import { create } from 'zustand';
import type {
  Patient,
  ActionConfig,
  TrainingPlan,
  TrainingSession,
  ActionResult,
  BodyPart
} from '../types';

const STORAGE_KEY = 'smart-rehab-data-v1';
const STORAGE_VERSION = 1;

interface PersistedData {
  version: number;
  patients: Patient[];
  plans: TrainingPlan[];
  sessions: TrainingSession[];
  savedAt: number;
}

const loadFromStorage = (): { patients: Patient[]; plans: TrainingPlan[]; sessions: TrainingSession[] } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: PersistedData = JSON.parse(raw);
    if (!data || data.version !== STORAGE_VERSION) return null;
    if (!Array.isArray(data.patients) || !Array.isArray(data.plans) || !Array.isArray(data.sessions)) return null;
    return {
      patients: data.patients,
      plans: data.plans,
      sessions: data.sessions
    };
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
};

const saveToStorage = (state: Pick<AppState, 'patients' | 'plans' | 'sessions'>) => {
  try {
    const data: PersistedData = {
      version: STORAGE_VERSION,
      patients: state.patients,
      plans: state.plans,
      sessions: state.sessions,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

interface AppState {
  patients: Patient[];
  plans: TrainingPlan[];
  sessions: TrainingSession[];
  currentPatient: Patient | null;
  currentPlan: TrainingPlan | null;
  currentSession: TrainingSession | null;
  currentActionIndex: number;

  setCurrentPatient: (patient: Patient | null) => void;
  setCurrentPlan: (plan: TrainingPlan | null) => void;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addPlan: (plan: Omit<TrainingPlan, 'id' | 'createdAt'>) => void;
  addSession: (session: TrainingSession) => void;
  setCurrentActionIndex: (index: number) => void;
  setCurrentSession: (session: TrainingSession | null) => void;
}

const mockPatients: Patient[] = [
  {
    id: 'p1',
    name: '张伟',
    gender: '男',
    age: 35,
    phone: '13800138001',
    injuryType: '肩袖损伤',
    injuryDate: '2026-03-15',
    bodyPart: 'shoulder',
    notes: '右肩运动损伤，术后第4周，轻度活动受限',
    createdAt: '2026-04-01'
  },
  {
    id: 'p2',
    name: '李芳',
    gender: '女',
    age: 28,
    phone: '13800138002',
    injuryType: '前十字韧带重建术后',
    injuryDate: '2026-02-20',
    bodyPart: 'knee',
    notes: '左膝ACL重建术后第8周，可部分负重',
    createdAt: '2026-04-10'
  },
  {
    id: 'p3',
    name: '王磊',
    gender: '男',
    age: 42,
    phone: '13800138003',
    injuryType: '踝关节扭伤',
    injuryDate: '2026-05-05',
    bodyPart: 'ankle',
    notes: '右脚踝外踝韧带扭伤，肿胀基本消退',
    createdAt: '2026-05-10'
  }
];

const shoulderActions: ActionConfig[] = [
  {
    id: 'a_s1',
    name: '肩前屈抬臂',
    description: '手臂自然下垂，缓慢向前上方抬起至目标角度，保持后缓慢放下',
    bodyPart: 'shoulder',
    targetAngle: 90,
    repetitions: 10,
    holdSeconds: 3,
    restSeconds: 5,
    difficulty: 'easy',
    icon: 'ArrowUp'
  },
  {
    id: 'a_s2',
    name: '肩外展抬臂',
    description: '手臂自然下垂，向身体侧方抬起至目标角度，保持后缓慢放下',
    bodyPart: 'shoulder',
    targetAngle: 80,
    repetitions: 8,
    holdSeconds: 3,
    restSeconds: 5,
    difficulty: 'easy',
    icon: 'MoveHorizontal'
  },
  {
    id: 'a_s3',
    name: '肩外旋训练',
    description: '肘部贴紧身体成90度，前臂向外旋转至最大角度后返回',
    bodyPart: 'shoulder',
    targetAngle: 45,
    repetitions: 12,
    holdSeconds: 2,
    restSeconds: 4,
    difficulty: 'medium',
    icon: 'RotateCw'
  }
];

const kneeActions: ActionConfig[] = [
  {
    id: 'a_k1',
    name: '坐位屈膝',
    description: '端坐于椅子边缘，缓慢弯曲膝关节至最大角度，保持后缓慢伸直',
    bodyPart: 'knee',
    targetAngle: 90,
    repetitions: 10,
    holdSeconds: 3,
    restSeconds: 5,
    difficulty: 'easy',
    icon: 'ArrowDown'
  },
  {
    id: 'a_k2',
    name: '直腿抬高',
    description: '仰卧或坐位，伸直膝关节缓慢抬腿至30度，保持后缓慢放下',
    bodyPart: 'knee',
    targetAngle: 30,
    repetitions: 10,
    holdSeconds: 5,
    restSeconds: 5,
    difficulty: 'easy',
    icon: 'ArrowUpCircle'
  },
  {
    id: 'a_k3',
    name: '静蹲训练',
    description: '背靠墙，缓慢下蹲至目标角度，保持规定时间后站起',
    bodyPart: 'knee',
    targetAngle: 60,
    repetitions: 5,
    holdSeconds: 10,
    restSeconds: 15,
    difficulty: 'medium',
    icon: 'Sofa'
  }
];

const ankleActions: ActionConfig[] = [
  {
    id: 'a_a1',
    name: '踝背屈训练',
    description: '坐位，缓慢将脚尖向上勾起至最大角度，保持后放松',
    bodyPart: 'ankle',
    targetAngle: 20,
    repetitions: 15,
    holdSeconds: 3,
    restSeconds: 3,
    difficulty: 'easy',
    icon: 'ChevronUp'
  },
  {
    id: 'a_a2',
    name: '踝跖屈训练',
    description: '坐位，缓慢将脚尖向下踩至最大角度，保持后放松',
    bodyPart: 'ankle',
    targetAngle: 30,
    repetitions: 15,
    holdSeconds: 3,
    restSeconds: 3,
    difficulty: 'easy',
    icon: 'ChevronDown'
  },
  {
    id: 'a_a3',
    name: '单腿平衡',
    description: '单脚站立，保持身体平衡，尽量减少晃动',
    bodyPart: 'ankle',
    targetAngle: 0,
    repetitions: 3,
    holdSeconds: 20,
    restSeconds: 10,
    difficulty: 'medium',
    icon: 'CircleDot'
  }
];

const mockPlans: TrainingPlan[] = [
  {
    id: 'plan1',
    name: '肩部康复基础方案',
    patientId: 'p1',
    bodyPart: 'shoulder',
    actions: shoulderActions,
    totalDuration: shoulderActions.reduce(
      (acc, a) => acc + a.repetitions * (a.holdSeconds + a.restSeconds),
      0
    ),
    createdAt: '2026-04-15'
  },
  {
    id: 'plan2',
    name: '膝关节术后中期方案',
    patientId: 'p2',
    bodyPart: 'knee',
    actions: kneeActions,
    totalDuration: kneeActions.reduce(
      (acc, a) => acc + a.repetitions * (a.holdSeconds + a.restSeconds),
      0
    ),
    createdAt: '2026-04-20'
  },
  {
    id: 'plan3',
    name: '踝关节扭伤康复方案',
    patientId: 'p3',
    bodyPart: 'ankle',
    actions: ankleActions,
    totalDuration: ankleActions.reduce(
      (acc, a) => acc + a.repetitions * (a.holdSeconds + a.restSeconds),
      0
    ),
    createdAt: '2026-05-12'
  }
];

const generateMockFrames = (targetAngle: number, reps: number): ActionResult['frames'] => {
  const frames: ActionResult['frames'] = [];
  for (let rep = 0; rep < reps; rep++) {
    for (let t = 0; t < 40; t++) {
      const phase = t / 40;
      let currentAngle: number;
      if (phase < 0.25) {
        currentAngle = (targetAngle * phase) / 0.25;
      } else if (phase < 0.6) {
        currentAngle = targetAngle;
      } else {
        currentAngle = targetAngle * (1 - (phase - 0.6) / 0.4);
      }
      const noise = (Math.random() - 0.5) * 10;
      currentAngle = Math.max(0, currentAngle + noise);
      const deviation = Math.abs(currentAngle - targetAngle);
      frames.push({
        timestamp: rep * 40 + t,
        currentAngle: Math.round(currentAngle * 10) / 10,
        targetAngle,
        deviation: Math.round(deviation * 10) / 10,
        isStable: deviation < 8,
        rhythmScore: phase >= 0.25 && phase <= 0.6 ? (deviation < 5 ? 100 : 90 - deviation * 2) : 85 + Math.random() * 10
      });
    }
  }
  return frames;
};

const generateMockResult = (action: ActionConfig): ActionResult => {
  const frames = generateMockFrames(action.targetAngle, action.repetitions);
  const rhythmScore = Math.round(80 + Math.random() * 18);
  const amplitudeScore = Math.round(78 + Math.random() * 20);
  const stabilityScore = Math.round(75 + Math.random() * 22);
  return {
    actionId: action.id,
    actionName: action.name,
    completedReps: action.repetitions,
    totalReps: action.repetitions,
    rhythmScore,
    amplitudeScore,
    stabilityScore,
    overallScore: Math.round((rhythmScore + amplitudeScore + stabilityScore) / 3),
    painLevel: (Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3),
    frames,
    startedAt: Date.now() - action.repetitions * 8000,
    endedAt: Date.now()
  };
};

const mockSessions: TrainingSession[] = [
  {
    id: 'sess1',
    patientId: 'p1',
    planId: 'plan1',
    planName: '肩部康复基础方案',
    bodyPart: 'shoulder',
    results: shoulderActions.map(generateMockResult),
    totalScore: 86,
    completionRate: 97,
    overallPainLevel: 2,
    notes: '患者配合良好，动作完成质量较高，建议下次增加难度',
    startedAt: '2026-06-10 09:30:00',
    endedAt: '2026-06-10 10:05:00'
  },
  {
    id: 'sess2',
    patientId: 'p1',
    planId: 'plan1',
    planName: '肩部康复基础方案',
    bodyPart: 'shoulder',
    results: shoulderActions.map(generateMockResult),
    totalScore: 89,
    completionRate: 100,
    overallPainLevel: 1,
    notes: '进步明显，外展活动度提升',
    startedAt: '2026-06-12 09:00:00',
    endedAt: '2026-06-12 09:32:00'
  },
  {
    id: 'sess3',
    patientId: 'p2',
    planId: 'plan2',
    planName: '膝关节术后中期方案',
    bodyPart: 'knee',
    results: kneeActions.map(generateMockResult),
    totalScore: 82,
    completionRate: 95,
    overallPainLevel: 3,
    notes: '屈膝角度进步明显，静蹲训练中末端疼痛',
    startedAt: '2026-06-11 14:00:00',
    endedAt: '2026-06-11 14:40:00'
  }
];

export const getDefaultActionsByBodyPart = (bodyPart: BodyPart): ActionConfig[] => {
  switch (bodyPart) {
    case 'shoulder':
      return shoulderActions.map(a => ({ ...a }));
    case 'knee':
      return kneeActions.map(a => ({ ...a }));
    case 'ankle':
      return ankleActions.map(a => ({ ...a }));
  }
};

const getInitialState = () => {
  const stored = loadFromStorage();
  if (stored && (stored.patients.length > 0 || stored.plans.length > 0 || stored.sessions.length > 0)) {
    return stored;
  }
  return {
    patients: mockPatients,
    plans: mockPlans,
    sessions: mockSessions
  };
};

const initialData = getInitialState();

export const useAppStore = create<AppState>((set) => ({
  patients: initialData.patients,
  plans: initialData.plans,
  sessions: initialData.sessions,
  currentPatient: null,
  currentPlan: null,
  currentSession: null,
  currentActionIndex: 0,

  setCurrentPatient: (patient) => set({ currentPatient: patient }),
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setCurrentSession: (session) => set({ currentSession: session }),

  addPatient: (data) =>
    set((state) => {
      const newState = {
        patients: [
          ...state.patients,
          {
            ...data,
            id: `p_${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 10)
          }
        ]
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    }),

  updatePatient: (id, data) =>
    set((state) => {
      const newState = {
        patients: state.patients.map((p) => (p.id === id ? { ...p, ...data } : p))
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    }),

  deletePatient: (id) =>
    set((state) => {
      const newState = {
        patients: state.patients.filter((p) => p.id !== id)
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    }),

  addPlan: (plan) =>
    set((state) => {
      const newState = {
        plans: [
          ...state.plans,
          {
            ...plan,
            id: `plan_${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 10)
          }
        ]
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    }),

  addSession: (session) =>
    set((state) => {
      const newState = {
        sessions: [...state.sessions, session]
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    }),

  setCurrentActionIndex: (index) => set({ currentActionIndex: index })
}));
