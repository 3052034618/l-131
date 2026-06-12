export type BodyPart = 'shoulder' | 'knee' | 'ankle';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PainLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Patient {
  id: string;
  name: string;
  gender: '男' | '女';
  age: number;
  phone: string;
  injuryType: string;
  injuryDate: string;
  bodyPart: BodyPart;
  notes: string;
  createdAt: string;
}

export interface ActionConfig {
  id: string;
  name: string;
  description: string;
  bodyPart: BodyPart;
  targetAngle: number;
  repetitions: number;
  holdSeconds: number;
  restSeconds: number;
  difficulty: Difficulty;
  icon: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  patientId: string;
  bodyPart: BodyPart;
  actions: ActionConfig[];
  totalDuration: number;
  createdAt: string;
}

export interface MotionFrame {
  timestamp: number;
  currentAngle: number;
  targetAngle: number;
  deviation: number;
  isStable: boolean;
  rhythmScore: number;
}

export interface ActionResult {
  actionId: string;
  actionName: string;
  completedReps: number;
  totalReps: number;
  rhythmScore: number;
  amplitudeScore: number;
  stabilityScore: number;
  overallScore: number;
  painLevel: PainLevel;
  frames: MotionFrame[];
  startedAt: number;
  endedAt: number;
}

export interface TrainingSession {
  id: string;
  patientId: string;
  planId: string;
  planName: string;
  bodyPart: BodyPart;
  results: ActionResult[];
  totalScore: number;
  completionRate: number;
  overallPainLevel: PainLevel;
  notes: string;
  startedAt: string;
  endedAt: string;
}

export interface ActionResult {
  actionId: string;
  actionName: string;
  completedReps: number;
  totalReps: number;
  rhythmScore: number;
  amplitudeScore: number;
  stabilityScore: number;
  overallScore: number;
  painLevel: PainLevel;
  frames: MotionFrame[];
  startedAt: number;
  endedAt: number;
  targetAngle?: number;
}

export interface ProgressPoint {
  date: string;
  score: number;
  completionRate: number;
}
