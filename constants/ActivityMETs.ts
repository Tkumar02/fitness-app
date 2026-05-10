/**
 * MET (Metabolic Equivalent of Task) values for standard activities.
 * Source: Compendium of Physical Activities
 */

export const ACTIVITY_METS: Record<string, number> = {
    'Running': 9.8,
    'Cycling': 7.5,
    'Swimming': 8.0,
    'Treadmill': 8.0,
    'Rowing': 7.0,
    'Elliptical': 5.0,
    'Stairmaster': 9.0,
    'Walking': 3.5,
};

export const DEFAULT_MET = 5.0; // Fallback value
