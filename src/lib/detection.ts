/**
 * Face Expression Detection
 * Uses MediaPipe Face Mesh landmarks to detect facial expressions
 */

import { CONFIG, type ExpressionType } from './config';

// MediaPipe Face Mesh Landmark Indices
const LANDMARKS = {
    // Eyes
    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,
    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,

    // Eyebrows
    LEFT_BROW_TOP: 63,
    RIGHT_BROW_TOP: 293,

    // Mouth
    UPPER_LIP_TOP: 13,
    LOWER_LIP_BOTTOM: 14,
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
    LOWER_LIP_CENTER: 17,

    // Nose
    NOSE_TIP: 4,

    // Chin
    CHIN: 152,
} as const;

interface Landmark {
    x: number;
    y: number;
    z?: number;
}

interface DetectionResult {
    expression: ExpressionType;
    confidence: number;
}

/**
 * Expression Detector Class
 */
export class ExpressionDetector {
    private expressionHistory: ExpressionType[] = [];
    private lastExpressionTime = 0;
    private currentExpression: ExpressionType = 'neutral';
    private holdStartTime = 0;
    private pendingExpression: ExpressionType | null = null;

    /**
     * Get distance between two landmarks
     */
    private getDistance(landmarks: Landmark[], idx1: number, idx2: number): number {
        const p1 = landmarks[idx1];
        const p2 = landmarks[idx2];
        if (!p1 || !p2) return 0;
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    /**
     * Calculate eye opening ratio
     */
    private getEyeOpening(landmarks: Landmark[]): number {
        const leftEyeOpen = this.getDistance(landmarks, LANDMARKS.LEFT_EYE_TOP, LANDMARKS.LEFT_EYE_BOTTOM);
        const rightEyeOpen = this.getDistance(landmarks, LANDMARKS.RIGHT_EYE_TOP, LANDMARKS.RIGHT_EYE_BOTTOM);
        return (leftEyeOpen + rightEyeOpen) / 2;
    }

    /**
     * Get individual eye openings for wink detection
     */
    private getIndividualEyeOpenings(landmarks: Landmark[]): { left: number; right: number } {
        return {
            left: this.getDistance(landmarks, LANDMARKS.LEFT_EYE_TOP, LANDMARKS.LEFT_EYE_BOTTOM),
            right: this.getDistance(landmarks, LANDMARKS.RIGHT_EYE_TOP, LANDMARKS.RIGHT_EYE_BOTTOM),
        };
    }

    /**
     * Calculate mouth opening
     */
    private getMouthOpening(landmarks: Landmark[]): number {
        return this.getDistance(landmarks, LANDMARKS.UPPER_LIP_TOP, LANDMARKS.LOWER_LIP_BOTTOM);
    }

    /**
     * Calculate mouth width
     */
    private getMouthWidth(landmarks: Landmark[]): number {
        return this.getDistance(landmarks, LANDMARKS.MOUTH_LEFT, LANDMARKS.MOUTH_RIGHT);
    }

    /**
     * Calculate smile ratio
     */
    private getSmileRatio(landmarks: Landmark[]): number {
        const leftCorner = landmarks[LANDMARKS.MOUTH_LEFT];
        const rightCorner = landmarks[LANDMARKS.MOUTH_RIGHT];
        const upperLip = landmarks[LANDMARKS.UPPER_LIP_TOP];
        if (!leftCorner || !rightCorner || !upperLip) return 0;

        const cornerHeight = (leftCorner.y + rightCorner.y) / 2;
        return upperLip.y - cornerHeight;
    }

    /**
     * Calculate eyebrow height relative to eyes
     */
    private getEyebrowHeight(landmarks: Landmark[]): number {
        const leftBrow = landmarks[LANDMARKS.LEFT_BROW_TOP];
        const rightBrow = landmarks[LANDMARKS.RIGHT_BROW_TOP];
        const leftEye = landmarks[LANDMARKS.LEFT_EYE_TOP];
        const rightEye = landmarks[LANDMARKS.RIGHT_EYE_TOP];
        if (!leftBrow || !rightBrow || !leftEye || !rightEye) return 0;

        const leftHeight = leftEye.y - leftBrow.y;
        const rightHeight = rightEye.y - rightBrow.y;
        return (leftHeight + rightHeight) / 2;
    }

    /**
     * Calculate mouth pucker ratio
     */
    private getMouthPuckerRatio(landmarks: Landmark[]): number {
        const height = this.getMouthOpening(landmarks);
        const width = this.getMouthWidth(landmarks);
        return width > 0 ? height / width : 0;
    }

    // ===== Expression Detection Functions =====

    private detectScream(landmarks: Landmark[]): DetectionResult | null {
        const eyeOpening = this.getEyeOpening(landmarks);
        const mouthOpen = this.getMouthOpening(landmarks);
        const browHeight = this.getEyebrowHeight(landmarks);
        const { thresholds } = CONFIG;

        if (eyeOpening > thresholds.eyeOpening * 0.9 &&
            mouthOpen > thresholds.mouthOpen * 2.5 &&
            browHeight > thresholds.browRaise) {
            const conf = (mouthOpen / (thresholds.mouthOpen * 2.5) + eyeOpening / thresholds.eyeOpening) / 2;
            return { expression: 'scream', confidence: Math.min(conf, 1) };
        }
        return null;
    }

    private detectShock(landmarks: Landmark[]): DetectionResult | null {
        const eyeOpening = this.getEyeOpening(landmarks);
        const mouthOpen = this.getMouthOpening(landmarks);
        const browHeight = this.getEyebrowHeight(landmarks);
        const { thresholds } = CONFIG;

        if (eyeOpening > thresholds.eyeOpening &&
            mouthOpen < thresholds.mouthOpen * 2 &&
            browHeight > thresholds.browRaise * 0.8) {
            return { expression: 'shock', confidence: Math.min(eyeOpening / thresholds.eyeOpening, 1) };
        }
        return null;
    }

    private detectTongue(landmarks: Landmark[]): DetectionResult | null {
        const mouthOpen = this.getMouthOpening(landmarks);
        const eyeOpening = this.getEyeOpening(landmarks);
        const { thresholds } = CONFIG;

        if (mouthOpen > thresholds.mouthOpen && eyeOpening < thresholds.eyeOpening * 1.5) {
            return { expression: 'tongue', confidence: Math.min(mouthOpen / thresholds.mouthOpen, 1) };
        }
        return null;
    }

    private detectKissy(landmarks: Landmark[]): DetectionResult | null {
        const puckerRatio = this.getMouthPuckerRatio(landmarks);
        const mouthWidth = this.getMouthWidth(landmarks);
        const { thresholds } = CONFIG;

        if (puckerRatio > thresholds.puckerRatio && mouthWidth < 0.08) {
            return { expression: 'kissy', confidence: Math.min(puckerRatio / 0.5, 1) };
        }
        return null;
    }

    private detectHappy(landmarks: Landmark[]): DetectionResult | null {
        const smileRatio = this.getSmileRatio(landmarks);
        const mouthOpen = this.getMouthOpening(landmarks);
        const { thresholds } = CONFIG;

        if (smileRatio > thresholds.smile && mouthOpen < thresholds.mouthOpen * 1.5) {
            return { expression: 'happy', confidence: Math.min(smileRatio / thresholds.smile, 1) };
        }
        return null;
    }

    private detectSad(landmarks: Landmark[]): DetectionResult | null {
        const smileRatio = this.getSmileRatio(landmarks);
        const browHeight = this.getEyebrowHeight(landmarks);
        const { thresholds } = CONFIG;

        if (smileRatio < -thresholds.smile * 0.5 && browHeight < thresholds.browRaise * 0.5) {
            return { expression: 'sad', confidence: Math.min(Math.abs(smileRatio) / thresholds.smile, 1) };
        }
        return null;
    }

    private detectWink(landmarks: Landmark[]): DetectionResult | null {
        const eyes = this.getIndividualEyeOpenings(landmarks);
        const ratio = Math.min(eyes.left, eyes.right) / Math.max(eyes.left, eyes.right);
        const { thresholds } = CONFIG;

        if (ratio < thresholds.winkRatio && Math.max(eyes.left, eyes.right) > 0.015) {
            return { expression: 'wink', confidence: 1 - ratio };
        }
        return null;
    }

    private detectGlare(landmarks: Landmark[]): DetectionResult | null {
        const eyeOpening = this.getEyeOpening(landmarks);
        const smileRatio = this.getSmileRatio(landmarks);
        const { thresholds } = CONFIG;

        if (eyeOpening < thresholds.squinting && smileRatio < thresholds.smile * 0.5) {
            return { expression: 'glare', confidence: 1 - (eyeOpening / thresholds.squinting) };
        }
        return null;
    }

    private detectSuspicious(landmarks: Landmark[]): DetectionResult | null {
        const eyes = this.getIndividualEyeOpenings(landmarks);
        const { thresholds } = CONFIG;
        const eyeRatio = Math.min(eyes.left, eyes.right) / Math.max(eyes.left, eyes.right);

        if (eyeRatio < 0.8 && eyeRatio > thresholds.winkRatio) {
            return { expression: 'suspicious', confidence: 0.8 - eyeRatio };
        }
        return null;
    }

    private detectSleepy(landmarks: Landmark[]): DetectionResult | null {
        const eyeOpening = this.getEyeOpening(landmarks);
        const mouthOpen = this.getMouthOpening(landmarks);
        const { thresholds } = CONFIG;

        if (eyeOpening < thresholds.sleepyThreshold &&
            eyeOpening > 0.008 &&
            mouthOpen < thresholds.mouthOpen) {
            return { expression: 'sleepy', confidence: 1 - (eyeOpening / thresholds.sleepyThreshold) };
        }
        return null;
    }

    private detectEyebrowRaise(landmarks: Landmark[]): DetectionResult | null {
        const browHeight = this.getEyebrowHeight(landmarks);
        const eyeOpening = this.getEyeOpening(landmarks);
        const { thresholds } = CONFIG;

        if (browHeight > thresholds.browRaise * 1.5 && eyeOpening < thresholds.eyeOpening) {
            return { expression: 'eyebrow', confidence: Math.min(browHeight / (thresholds.browRaise * 1.5), 1) };
        }
        return null;
    }

    private detectPout(landmarks: Landmark[]): DetectionResult | null {
        const lowerLip = landmarks[LANDMARKS.LOWER_LIP_CENTER];
        const chin = landmarks[LANDMARKS.CHIN];
        const mouthOpen = this.getMouthOpening(landmarks);
        const { thresholds } = CONFIG;
        if (!lowerLip || !chin) return null;

        const lipProtrusion = chin.y - lowerLip.y;
        if (lipProtrusion > 0.06 && mouthOpen < thresholds.mouthOpen * 0.8) {
            return { expression: 'pout', confidence: Math.min(lipProtrusion / 0.08, 1) };
        }
        return null;
    }

    private detectDisgust(landmarks: Landmark[]): DetectionResult | null {
        const upperLip = landmarks[LANDMARKS.UPPER_LIP_TOP];
        const nose = landmarks[LANDMARKS.NOSE_TIP];
        const eyeOpening = this.getEyeOpening(landmarks);
        const { thresholds } = CONFIG;
        if (!upperLip || !nose) return null;

        const lipNoseDistance = upperLip.y - nose.y;
        if (lipNoseDistance < 0.025 && eyeOpening < thresholds.eyeOpening * 0.8) {
            return { expression: 'disgust', confidence: 1 - (lipNoseDistance / 0.03) };
        }
        return null;
    }

    private detectConfused(landmarks: Landmark[]): DetectionResult | null {
        const browHeight = this.getEyebrowHeight(landmarks);
        const mouthOpen = this.getMouthOpening(landmarks);
        const { thresholds } = CONFIG;

        if (mouthOpen > thresholds.mouthOpen * 0.3 &&
            mouthOpen < thresholds.mouthOpen * 0.8 &&
            browHeight > thresholds.browRaise * 0.5) {
            return { expression: 'confused', confidence: 0.6 };
        }
        return null;
    }

    /**
     * Analyze landmarks and detect expression with debouncing and smoothing
     */
    analyze(landmarks: Landmark[]): DetectionResult {
        if (!landmarks || landmarks.length < 468) {
            return { expression: 'neutral', confidence: 0 };
        }

        const now = Date.now();
        const { transitions } = CONFIG;

        // Run all detection functions in priority order
        const detectors = [
            () => this.detectScream(landmarks),
            () => this.detectShock(landmarks),
            () => this.detectTongue(landmarks),
            () => this.detectKissy(landmarks),
            () => this.detectHappy(landmarks),
            () => this.detectWink(landmarks),
            () => this.detectSad(landmarks),
            () => this.detectGlare(landmarks),
            () => this.detectSuspicious(landmarks),
            () => this.detectSleepy(landmarks),
            () => this.detectEyebrowRaise(landmarks),
            () => this.detectPout(landmarks),
            () => this.detectDisgust(landmarks),
            () => this.detectConfused(landmarks),
        ];

        let rawExpression: ExpressionType = 'neutral';
        let rawConfidence = 0;

        for (const detect of detectors) {
            const result = detect();
            if (result) {
                rawExpression = result.expression;
                rawConfidence = result.confidence;
                break;
            }
        }

        // Add to history for smoothing
        this.expressionHistory.push(rawExpression);
        if (this.expressionHistory.length > transitions.historyLength) {
            this.expressionHistory.shift();
        }

        // Get most common expression in history
        const counts: Record<string, number> = {};
        this.expressionHistory.forEach(e => {
            counts[e] = (counts[e] || 0) + 1;
        });
        const smoothedExpression = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])[0][0] as ExpressionType;

        // Check if expression is changing
        if (smoothedExpression !== this.currentExpression) {
            // Hold time check
            if (this.pendingExpression !== smoothedExpression) {
                this.pendingExpression = smoothedExpression;
                this.holdStartTime = now;
            } else if (now - this.holdStartTime >= transitions.holdTime) {
                // Debounce check
                if (now - this.lastExpressionTime >= transitions.debounce) {
                    this.currentExpression = smoothedExpression;
                    this.lastExpressionTime = now;
                    this.pendingExpression = null;
                }
            }
        } else {
            this.pendingExpression = null;
        }

        return {
            expression: this.currentExpression,
            confidence: rawConfidence,
        };
    }

    /**
     * Reset detector state
     */
    reset(): void {
        this.expressionHistory = [];
        this.currentExpression = 'neutral';
        this.pendingExpression = null;
        this.holdStartTime = 0;
        this.lastExpressionTime = 0;
    }
}

// Singleton instance
export const expressionDetector = new ExpressionDetector();
