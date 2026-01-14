/**
 * Hand Gesture Detection
 * Uses MediaPipe Hands to detect hand gestures including middle finger, peace sign, etc.
 */

import { CONFIG, type GestureType } from './config';

// MediaPipe Hand Landmark Indices
const HAND_LANDMARKS = {
    WRIST: 0,

    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,

    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,

    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,

    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,

    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20,
} as const;

interface Landmark {
    x: number;
    y: number;
    z?: number;
}

interface GestureResult {
    gesture: GestureType;
    confidence: number;
}

/**
 * Calculate if a finger is extended
 * Compares tip position to MCP (knuckle) position
 */
function isFingerExtended(landmarks: Landmark[], tipIdx: number, pipIdx: number, mcpIdx: number): boolean {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];

    if (!tip || !pip || !mcp) return false;

    // Finger is extended if tip is higher than PIP (using Y coordinate)
    // More lenient: just check tip vs pip, don't require pip vs mcp
    return tip.y < pip.y - 0.02;
}

/**
 * Calculate if thumb is extended (different logic due to orientation)
 */
function isThumbExtended(landmarks: Landmark[]): boolean {
    const tip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const ip = landmarks[HAND_LANDMARKS.THUMB_IP];
    const mcp = landmarks[HAND_LANDMARKS.THUMB_MCP];
    const wrist = landmarks[HAND_LANDMARKS.WRIST];

    if (!tip || !ip || !mcp || !wrist) return false;

    // Thumb extended if tip is far from palm center in X direction
    const palmCenterX = (landmarks[HAND_LANDMARKS.INDEX_MCP].x + landmarks[HAND_LANDMARKS.PINKY_MCP].x) / 2;
    return Math.abs(tip.x - palmCenterX) > Math.abs(mcp.x - palmCenterX) * 1.2;
}

/**
 * Check if thumb is pointing up
 */
function isThumbUp(landmarks: Landmark[]): boolean {
    const tip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const mcp = landmarks[HAND_LANDMARKS.THUMB_MCP];
    const wrist = landmarks[HAND_LANDMARKS.WRIST];

    if (!tip || !mcp || !wrist) return false;

    // Thumb pointing up if tip Y is above wrist Y and thumb is extended
    return tip.y < wrist.y - 0.1 && isThumbExtended(landmarks);
}

/**
 * Check if thumb is pointing down
 */
function isThumbDown(landmarks: Landmark[]): boolean {
    const tip = landmarks[HAND_LANDMARKS.THUMB_TIP];
    const wrist = landmarks[HAND_LANDMARKS.WRIST];

    if (!tip || !wrist) return false;

    // Thumb pointing down if tip Y is below wrist Y and thumb is extended
    return tip.y > wrist.y + 0.1 && isThumbExtended(landmarks);
}

/**
 * Get finger extension states
 */
function getFingerStates(landmarks: Landmark[]): {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
} {
    return {
        thumb: isThumbExtended(landmarks),
        index: isFingerExtended(landmarks,
            HAND_LANDMARKS.INDEX_TIP, HAND_LANDMARKS.INDEX_PIP, HAND_LANDMARKS.INDEX_MCP),
        middle: isFingerExtended(landmarks,
            HAND_LANDMARKS.MIDDLE_TIP, HAND_LANDMARKS.MIDDLE_PIP, HAND_LANDMARKS.MIDDLE_MCP),
        ring: isFingerExtended(landmarks,
            HAND_LANDMARKS.RING_TIP, HAND_LANDMARKS.RING_PIP, HAND_LANDMARKS.RING_MCP),
        pinky: isFingerExtended(landmarks,
            HAND_LANDMARKS.PINKY_TIP, HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_MCP),
    };
}

/**
 * Gesture Detector Class
 */
export class GestureDetector {
    private gestureHistory: GestureType[] = [];
    private lastGestureTime = 0;
    private currentGesture: GestureType = 'none';
    private holdStartTime = 0;
    private pendingGesture: GestureType | null = null;

    /**
     * Detect middle finger gesture
     * Only middle finger extended, others curled
     */
    private detectMiddleFinger(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (fingers.middle && !fingers.index && !fingers.ring && !fingers.pinky && !fingers.thumb) {
            return { gesture: 'middleFinger', confidence: 0.9 };
        }
        return null;
    }

    /**
     * Detect peace sign (V sign)
     * Index and middle extended, others curled
     */
    private detectPeace(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
            return { gesture: 'peace', confidence: 0.85 };
        }
        return null;
    }

    /**
     * Detect thumbs up
     * Thumb up, fist closed
     */
    private detectThumbsUp(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (isThumbUp(landmarks) && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
            return { gesture: 'thumbsUp', confidence: 0.9 };
        }
        return null;
    }

    /**
     * Detect thumbs down
     * Thumb down, fist closed
     */
    private detectThumbsDown(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (isThumbDown(landmarks) && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
            return { gesture: 'thumbsDown', confidence: 0.9 };
        }
        return null;
    }

    /**
     * Detect OK sign
     * Thumb and index form circle, others extended
     */
    private detectOK(landmarks: Landmark[]): GestureResult | null {
        const thumbTip = landmarks[HAND_LANDMARKS.THUMB_TIP];
        const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP];
        const fingers = getFingerStates(landmarks);

        if (!thumbTip || !indexTip) return null;

        // Check if thumb and index tips are close together
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2)
        );

        if (distance < 0.05 && fingers.middle && fingers.ring && fingers.pinky) {
            return { gesture: 'ok', confidence: 0.85 };
        }
        return null;
    }

    /**
     * Detect rock on (metal horns)
     * Index and pinky extended, middle and ring curled
     */
    private detectRockOn(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (fingers.index && fingers.pinky && !fingers.middle && !fingers.ring) {
            return { gesture: 'rockOn', confidence: 0.85 };
        }
        return null;
    }

    /**
     * Detect wave (open palm)
     * All fingers extended
     */
    private detectWave(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
            return { gesture: 'wave', confidence: 0.8 };
        }
        return null;
    }

    /**
     * Detect fist
     * All fingers curled
     */
    private detectFist(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (!fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
            return { gesture: 'fist', confidence: 0.8 };
        }
        return null;
    }

    /**
     * Detect pointing (index finger up)
     * Only index extended
     */
    private detectPointing(landmarks: Landmark[]): GestureResult | null {
        const fingers = getFingerStates(landmarks);

        if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
            return { gesture: 'pointing', confidence: 0.85 };
        }
        return null;
    }

    /**
     * Analyze hand landmarks and detect gesture
     */
    analyze(landmarks: Landmark[]): GestureResult {
        if (!landmarks || landmarks.length < 21) {
            return { gesture: 'none', confidence: 0 };
        }

        const now = Date.now();
        const { transitions } = CONFIG;

        // Run all detection functions in priority order
        const detectors = [
            () => this.detectMiddleFinger(landmarks),
            () => this.detectThumbsUp(landmarks),
            () => this.detectThumbsDown(landmarks),
            () => this.detectPeace(landmarks),
            () => this.detectOK(landmarks),
            () => this.detectRockOn(landmarks),
            () => this.detectPointing(landmarks),
            () => this.detectWave(landmarks),
            () => this.detectFist(landmarks),
        ];

        let rawGesture: GestureType = 'none';
        let rawConfidence = 0;

        for (const detect of detectors) {
            const result = detect();
            if (result) {
                rawGesture = result.gesture;
                rawConfidence = result.confidence;
                break;
            }
        }

        // Add to history for smoothing
        this.gestureHistory.push(rawGesture);
        if (this.gestureHistory.length > transitions.historyLength) {
            this.gestureHistory.shift();
        }

        // Get most common gesture in history
        const counts: Record<string, number> = {};
        this.gestureHistory.forEach(g => {
            counts[g] = (counts[g] || 0) + 1;
        });
        const smoothedGesture = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0][0] as GestureType;

        // Check if gesture is changing
        if (smoothedGesture !== this.currentGesture) {
            if (this.pendingGesture !== smoothedGesture) {
                this.pendingGesture = smoothedGesture;
                this.holdStartTime = now;
            } else if (now - this.holdStartTime >= transitions.holdTime) {
                if (now - this.lastGestureTime >= transitions.debounce) {
                    this.currentGesture = smoothedGesture;
                    this.lastGestureTime = now;
                    this.pendingGesture = null;
                }
            }
        } else {
            this.pendingGesture = null;
        }

        return {
            gesture: this.currentGesture,
            confidence: rawConfidence,
        };
    }

    /**
     * Reset detector state
     */
    reset(): void {
        this.gestureHistory = [];
        this.currentGesture = 'none';
        this.pendingGesture = null;
        this.holdStartTime = 0;
        this.lastGestureTime = 0;
    }
}

// Singleton instance
export const gestureDetector = new GestureDetector();
