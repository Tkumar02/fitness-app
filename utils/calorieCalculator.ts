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
        'Dips': 6.0,
        'Lunges': 5.5,
        'Rows': 5.0,
        'Bicep Curls': 3.5,
        'Tricep Extensions': 3.5,
        'Leg Press': 5.5,
        'Lat Pulldown': 4.5,
        'Cable Fly': 3.5,
    };
    
    const baseMET = intensityMap[stats.activity] || 4.5;
    const sets = stats.sets || 1;
    const reps = stats.reps || 1;
    const weightUsed = stats.weightUsed || 0;
    
    // 1. MET-based baseline from duration and body weight
    const effortMultiplier = Math.max(0.5, stats.rpe / 5); 
    const metCalories = (baseMET * user.weight * (stats.duration / 60)) * effortMultiplier;
    
    // 2. Volume-based component: total mechanical work
    // Work (joules) = sets × reps × weight(kg) × gravity(9.81) × avg range of motion (~0.5m)
    // 1 kcal = 4184 joules
    // Muscles are ~25% efficient, so actual energy cost ≈ work / 0.25
    const totalWork = sets * reps * weightUsed * 9.81 * 0.5; // joules
    const volumeCalories = (totalWork / 0.25) / 4184; // kcal
    
    // 3. Blend both: use whichever is higher, with a bonus for high volume
    const blended = Math.max(metCalories, volumeCalories) + (Math.min(metCalories, volumeCalories) * 0.3);
    
    return Math.round(blended);
};
