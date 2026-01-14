/**
 * Unit tests for Gesture Detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GestureDetector } from '@/lib/gestures';

// Helper to create hand landmarks array
function createBaseHandLandmarks(): Array<{ x: number; y: number; z?: number }> {
    const landmarks: Array<{ x: number; y: number; z?: number }> = [];
    for (let i = 0; i < 21; i++) {
        landmarks.push({ x: 0.5, y: 0.5, z: 0 });
    }
    return landmarks;
}

describe('GestureDetector', () => {
    let detector: GestureDetector;

    beforeEach(() => {
        detector = new GestureDetector();
    });

    describe('analyze', () => {
        it('returns none for empty landmarks', () => {
            const result = detector.analyze([]);
            expect(result.gesture).toBe('none');
            expect(result.confidence).toBe(0);
        });

        it('returns a gesture for valid landmarks', () => {
            const landmarks = createBaseHandLandmarks();
            const result = detector.analyze(landmarks);
            expect(result.gesture).toBeDefined();
            expect(['none', 'fist', 'wave', 'peace', 'thumbsUp', 'thumbsDown', 'ok', 'rockOn', 'middleFinger', 'pointing']).toContain(result.gesture);
        });

        it('returns confidence between 0 and 1', () => {
            const landmarks = createBaseHandLandmarks();
            const result = detector.analyze(landmarks);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('reset', () => {
        it('resets internal state without error', () => {
            const landmarks = createBaseHandLandmarks();
            detector.analyze(landmarks);
            detector.analyze(landmarks);

            expect(() => detector.reset()).not.toThrow();
        });
    });
});
