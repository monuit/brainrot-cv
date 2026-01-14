/**
 * Brainrot Configuration
 * All thresholds and settings (tuned for real-time responsiveness)
 */

export const CONFIG = {
    // Expression detection thresholds (LOWERED for better sensitivity)
    thresholds: {
        eyeOpening: 0.03,       // Shock detection (lowered from 0.04)
        mouthOpen: 0.025,       // Tongue/mouth open detection (lowered from 0.04)
        squinting: 0.018,       // Glare detection (lowered from 0.021)
        smile: 0.012,           // Smile detection (lowered from 0.02)
        browRaise: 0.01,        // Eyebrow raise (lowered from 0.015)
        winkRatio: 0.6,         // Wink asymmetry ratio (raised for easier trigger)
        puckerRatio: 0.25,      // Kissy face (lowered from 0.3)
        sleepyThreshold: 0.018, // Sleepy eyes (raised from 0.015)
    },

    // Transition timing (SLOWER for stability)
    transitions: {
        holdTime: 300,          // Must detect for 300ms before switching (increased from 100)
        debounce: 500,          // Minimum time between switches (increased from 200)
        crossfadeDuration: 300, // CSS transition duration (ms)
        historyLength: 10,      // Smoothing over N frames (increased from 5)
    },

    // Gesture detection
    gestures: {
        fingerExtendedThreshold: 0.6,  // Finger considered extended (lowered)
        fingerCurledThreshold: 0.4,    // Finger considered curled (raised)
        confidenceThreshold: 0.5,      // Minimum hand detection confidence (lowered)
    },

    // MediaPipe settings
    mediapipe: {
        faceMesh: {
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        },
        hands: {
            maxNumHands: 2,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        },
    },
} as const;

// Expression types
export type ExpressionType =
    | 'shock' | 'scream' | 'tongue' | 'happy' | 'sad'
    | 'wink' | 'glare' | 'suspicious' | 'sleepy'
    | 'eyebrow' | 'confused' | 'pout' | 'disgust' | 'kissy' | 'neutral';

// Gesture types
export type GestureType =
    | 'middleFinger' | 'thumbsUp' | 'thumbsDown' | 'peace'
    | 'ok' | 'rockOn' | 'wave' | 'fist' | 'pointing' | 'none';

// Combined detection result
export type DetectionType = ExpressionType | GestureType;

// Expression display info
export const EXPRESSION_INFO: Record<ExpressionType, { emoji: string; name: string }> = {
    shock: { emoji: '😮', name: 'Shock' },
    scream: { emoji: '😱', name: 'Scream' },
    tongue: { emoji: '😛', name: 'Tongue' },
    happy: { emoji: '😊', name: 'Happy' },
    sad: { emoji: '😢', name: 'Sad' },
    wink: { emoji: '😉', name: 'Wink' },
    glare: { emoji: '😒', name: 'Glare' },
    suspicious: { emoji: '🤨', name: 'Suspicious' },
    sleepy: { emoji: '😴', name: 'Sleepy' },
    eyebrow: { emoji: '🤔', name: 'Eyebrow' },
    confused: { emoji: '😕', name: 'Confused' },
    pout: { emoji: '😤', name: 'Pout' },
    disgust: { emoji: '🤢', name: 'Disgust' },
    kissy: { emoji: '😘', name: 'Kissy' },
    neutral: { emoji: '😐', name: 'Neutral' },
};

// Gesture display info
export const GESTURE_INFO: Record<GestureType, { emoji: string; name: string }> = {
    middleFinger: { emoji: '🖕', name: 'Middle Finger' },
    thumbsUp: { emoji: '👍', name: 'Thumbs Up' },
    thumbsDown: { emoji: '👎', name: 'Thumbs Down' },
    peace: { emoji: '✌️', name: 'Peace' },
    ok: { emoji: '👌', name: 'OK' },
    rockOn: { emoji: '🤘', name: 'Rock On' },
    wave: { emoji: '👋', name: 'Wave' },
    fist: { emoji: '👊', name: 'Fist' },
    pointing: { emoji: '☝️', name: 'Pointing' },
    none: { emoji: '✋', name: 'No Gesture' },
};
