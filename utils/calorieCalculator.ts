import { ACTIVITY_METS, DEFAULT_MET } from '../constants/ActivityMETs';

type UserBiometrics = {
    weight: number; // kg
    height: number; // cm
    age: number;
    sex: 'male' | 'female';
};

type WorkoutStats = {
    category: 'strength' | 'cardio';
    activity: string;
    duration: number; // minutes
    sets?: number;
    reps?: number;
    weightUsed?: number; // kg
    rpe: number; // 1-10
};

/**
 * Estimates calories burned based on exercise type and user biometrics.
 * Focused on net active expenditure (excluding baseline BMR).
 */
export const calculateCalories = (stats: WorkoutStats, user: UserBiometrics): number => {
    if (stats.category === 'cardio') {
        return calculateCardioCalories(stats, user);
    } else {
        return calculateStrengthCalories(stats, user);
    }
};

const calculateCardioCalories = (stats: WorkoutStats, user: UserBiometrics): number => {
    const met = ACTIVITY_METS[stats.activity] || DEFAULT_MET;
    // Calories = (MET * 3.5 * weightKg / 200) * durationMinutes
    const calories = (met * 3.5 * user.weight / 200) * stats.duration;
    
    // Adjust for RPE (1-10 scale, normalized to ~0.5 - 1.5 multiplier)
    const effortMultiplier = Math.max(0.5, Math.min(1.5, stats.rpe / 7)); 
    return Math.round(calories * effortMultiplier);
};

const calculateStrengthCalories = (stats: WorkoutStats, user: UserBiometrics): number => {
    // Dictionary of base MET values for strength movements
    const intensityMap: Record<string, number> = { 
        'Plank': 3.5, 
        'Squats': 6.0, 
        'Bench Press': 5.0, 
        'Deadlift': 6.5, 
        'Shoulder Press': 4.5,
        'Pull Ups': 7.0,
        'Dips': 6.0
    };
    
    const baseMET = intensityMap[stats.activity] || 4.5;
    
    // Net Active Burn = (MET * WeightKg * TimeHours) * effortFactor
    // We adjust for effort (RPE 1-10, 5 is baseline)
    const effortMultiplier = Math.max(0.5, stats.rpe / 5); 
    const calories = (baseMET * user.weight * (stats.duration / 60)) * effortMultiplier;
    
    return Math.round(calories);
};
