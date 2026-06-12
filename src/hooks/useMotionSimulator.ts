import { useEffect, useState } from 'react';
import type { ActionConfig, MotionFrame } from '../types';

export interface SimulatedMotion {
  currentAngle: number;
  targetAngle: number;
  deviation: number;
  isStable: boolean;
  rhythmScore: number;
  phase: 'up' | 'hold' | 'down' | 'rest';
  repCount: number;
  frames: MotionFrame[];
}

interface Options {
  action: ActionConfig;
  isRunning: boolean;
}

export const useMotionSimulator = ({ action, isRunning }: Options) => {
  const [motion, setMotion] = useState<SimulatedMotion>({
    currentAngle: 0,
    targetAngle: action.targetAngle,
    deviation: action.targetAngle,
    isStable: false,
    rhythmScore: 0,
    phase: 'rest',
    repCount: 0,
    frames: []
  });

  useEffect(() => {
    if (!isRunning) return;

    const phaseDuration = {
      up: 1500,
      hold: action.holdSeconds * 1000,
      down: 1500,
      rest: action.restSeconds * 1000
    };

    let rep = 0;
    let phaseStart = Date.now();
    let currentPhase: SimulatedMotion['phase'] = 'up';
    const frames: MotionFrame[] = [];
    let frameCount = 0;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - phaseStart;
      const duration = phaseDuration[currentPhase];

      if (elapsed >= duration) {
        phaseStart = now;
        switch (currentPhase) {
          case 'up':
            currentPhase = 'hold';
            break;
          case 'hold':
            currentPhase = 'down';
            break;
          case 'down':
            currentPhase = 'rest';
            break;
          case 'rest':
            rep++;
            currentPhase = 'up';
            break;
        }
        if (rep >= action.repetitions && currentPhase === 'up') {
          clearInterval(interval);
          return;
        }
      }

      const phaseProgress = Math.min(elapsed / duration, 1);
      let currentAngle = 0;
      const wobble = (Math.random() - 0.5) * 6;

      switch (currentPhase) {
        case 'up':
          currentAngle = action.targetAngle * easeOutQuad(phaseProgress) + wobble;
          break;
        case 'hold':
          currentAngle = action.targetAngle + wobble * 0.8;
          break;
        case 'down':
          currentAngle = action.targetAngle * (1 - easeOutQuad(phaseProgress)) + wobble;
          break;
        case 'rest':
          currentAngle = wobble * 0.3;
          break;
      }

      currentAngle = Math.max(0, currentAngle);
      const deviation = Math.abs(currentAngle - action.targetAngle);
      const isStable = deviation < 8;
      let rhythmScore = 70;
      if (currentPhase === 'up' || currentPhase === 'down') {
        rhythmScore = 85 + Math.random() * 12;
      } else if (currentPhase === 'hold') {
        rhythmScore = Math.max(60, 100 - deviation * 3);
      } else {
        rhythmScore = 90 + Math.random() * 10;
      }
      rhythmScore = Math.min(100, Math.round(rhythmScore));

      const frame: MotionFrame = {
        timestamp: frameCount++,
        currentAngle: Math.round(currentAngle * 10) / 10,
        targetAngle: action.targetAngle,
        deviation: Math.round(deviation * 10) / 10,
        isStable,
        rhythmScore
      };
      frames.push(frame);

      setMotion({
        currentAngle: Math.round(currentAngle * 10) / 10,
        targetAngle: action.targetAngle,
        deviation: Math.round(deviation * 10) / 10,
        isStable,
        rhythmScore,
        phase: currentPhase,
        repCount: rep,
        frames: [...frames]
      });
    }, 50);

    return () => clearInterval(interval);
  }, [action, isRunning]);

  return motion;
};

const easeOutQuad = (t: number): number => t * (2 - t);

export const computeScores = (frames: MotionFrame[]): {
  rhythmScore: number;
  amplitudeScore: number;
  stabilityScore: number;
  overallScore: number;
} => {
  if (frames.length === 0) {
    return { rhythmScore: 0, amplitudeScore: 0, stabilityScore: 0, overallScore: 0 };
  }
  const holdFrames = frames.filter((f) => f.targetAngle > 0 && f.currentAngle > f.targetAngle * 0.7);
  const rhythmScore = Math.round(frames.reduce((s, f) => s + f.rhythmScore, 0) / frames.length);
  const amplitudeScore = holdFrames.length > 0
    ? Math.round(Math.min(100, 100 - holdFrames.reduce((s, f) => s + f.deviation, 0) / holdFrames.length * 2))
    : 75;
  const stabilityScore = Math.round((frames.filter((f) => f.isStable).length / frames.length) * 100);
  const overallScore = Math.round((rhythmScore + amplitudeScore + stabilityScore) / 3);
  return { rhythmScore, amplitudeScore, stabilityScore, overallScore };
};
