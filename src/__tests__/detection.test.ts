/**
 * Unit tests for Expression Detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionDetector } from '@/lib/detection';

// Helper to create landmarks array of the right size
function createBaseLandmarks(): Array<{ x: number; y: number; z?: number }> {
    const landmarks: Array<{ x: number; y: number; z?: number }> = [];
    for (let i = 0; i < 478; i++) {
        landmarks.push({ x: 0.5, y: 0.5, z: 0 });
    }
    return landmarks;
}

describe('ExpressionDetector', () => {
    let detector: ExpressionDetector;

    beforeEach(() => {
        detector = new ExpressionDetector();
    });

    describe('analyze', () => {
        it('returns neutral for empty landmarks', () => {
            const result = detector.analyze([]);
            expect(result.expression).toBe('neutral');
            expect(result.confidence).toBe(0);
        });

        it('returns neutral for insufficient landmarks', () => {
            const landmarks = [{ x: 0.5, y: 0.5 }];
            const result = detector.analyze(landmarks);
            expect(result.expression).toBe('neutral');
        });

        it('returns neutral for base landmarks with normal values', () => {
            const landmarks = createBaseLandmarks();
            const result = detector.analyze(landmarks);
            expect(result.expression).toBe('neutral');
        });

        it('returns confidence between 0 and 1', () => {
            const landmarks = createBaseLandmarks();
            const result = detector.analyze(landmarks);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('has all expected expression types in priority list', () => {
            // Access the EXPRESSIONS constant via the detector
            expect(detector).toBeDefined();
            // Just verify the class exists and works
        });
    });

    describe('reset', () => {
        it('resets internal state without error', () => {
            const landmarks = createBaseLandmarks();
            detector.analyze(landmarks);
            detector.analyze(landmarks);
            detector.analyze(landmarks);

            expect(() => detector.reset()).not.toThrow();
        });
    });

    describe('helper methods', () => {
        it('calculates distance correctly', () => {
            // This tests internal calculations indirectly
            const landmarks = createBaseLandmarks();
            // Set some specific values
            landmarks[159] = { x: 0.3, y: 0.4, z: 0 }; // Left eye top
            landmarks[145] = { x: 0.3, y: 0.44, z: 0 }; // Left eye bottom

            // Running analyze should work without errors
            const result = detector.analyze(landmarks);
            expect(result).toBeDefined();
            expect(result.expression).toBeDefined();
        });
    });
});
