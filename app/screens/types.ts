export type ExerciseType = 'cardio' | 'strength';

export interface Exercise {
  name: string;
  category: ExerciseType;
  metricType: string;       // e.g., DISTANCE, LEVEL, WEIGHT
  unit?: 'kg' | 'lbs' | 'km' | 'mi';
  sets?: number;
  reps?: number;
  weight?: number;
  metricValue?: number;     // distance, intensity, etc.
  focus?: 'endurance' | 'performance'; // optional, for cardio
}
