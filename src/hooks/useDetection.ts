/**
 * Detection Hook - Optimized with Timeouts
 * Uses MediaPipe Tasks Vision for Face and Hand detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { expressionDetector } from '@/lib/detection';
import { gestureDetector } from '@/lib/gestures';
import { getRandomMeme, initializeMemePool } from '@/lib/memePool';
import { type ExpressionType, type GestureType, type DetectionType } from '@/lib/config';

interface DetectionState {
    expression: ExpressionType;
    gesture: GestureType;
    activeType: DetectionType;
    memeUrl: string | null;
    confidence: number;
    fps: number;
    isReady: boolean;
    handsReady: boolean;
    error: string | null;
    loadingStatus: string;
}

interface UseDetectionResult extends DetectionState {
    startDetection: (video: HTMLVideoElement) => Promise<void>;
    stopDetection: () => void;
}

// CDN path for WASM files
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

// Model paths
const FACE_LANDMARKER_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAND_LANDMARKER_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

type NormalizedLandmark = { x: number; y: number; z?: number };

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number, context: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${context} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

export function useDetection(): UseDetectionResult {
    const [state, setState] = useState<DetectionState>({
        expression: 'neutral',
        gesture: 'none',
        activeType: 'neutral',
        memeUrl: null,
        confidence: 0,
        fps: 0,
        isReady: false,
        handsReady: false,
        error: null,
        loadingStatus: '',
    });

    const faceLandmarkerRef = useRef<unknown>(null);
    const handLandmarkerRef = useRef<unknown>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const frameCountRef = useRef(0);
    const lastFpsUpdateRef = useRef(Date.now());
    const lastMemeTypeRef = useRef<DetectionType>('neutral');
    const lastFrameTimeRef = useRef(0);
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        initializeMemePool();
    }, []);

    const processFrame = useCallback((timestamp: number) => {
        const faceLandmarker = faceLandmarkerRef.current as { detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks?: Array<Array<NormalizedLandmark>> } } | null;

        if (!videoRef.current || !faceLandmarker) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        const video = videoRef.current;
        if (video.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        // Throttle to ~30fps
        if (timestamp - lastFrameTimeRef.current < 33) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }
        lastFrameTimeRef.current = timestamp;

        frameCountRef.current++;
        const now = Date.now();
        let currentFps = stateRef.current.fps;

        if (now - lastFpsUpdateRef.current >= 1000) {
            currentFps = frameCountRef.current;
            frameCountRef.current = 0;
            lastFpsUpdateRef.current = now;
        }

        let expression: ExpressionType = 'neutral';
        let expressionConfidence = 0;

        try {
            const faceResults = faceLandmarker.detectForVideo(video, now);
            if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
                const landmarks = faceResults.faceLandmarks[0];
                const result = expressionDetector.analyze(landmarks);
                expression = result.expression;
                expressionConfidence = result.confidence;

                // Debug log occasionally (every ~30 frames)
                if (frameCountRef.current === 1) {
                    console.log('[Brainrot] Face detected:', expression, 'confidence:', expressionConfidence.toFixed(2));
                }
            }
        } catch {
            // Ignore
        }

        let gesture: GestureType = 'none';
        let gestureConfidence = 0;

        const handLandmarker = handLandmarkerRef.current as { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks?: Array<Array<NormalizedLandmark>> } } | null;
        if (handLandmarker) {
            try {
                const handResults = handLandmarker.detectForVideo(video, now);
                if (handResults.landmarks && handResults.landmarks.length > 0) {
                    const result = gestureDetector.analyze(handResults.landmarks[0]);
                    gesture = result.gesture;
                    gestureConfidence = result.confidence;
                }
            } catch {
                // Ignore
            }
        }

        let activeType: DetectionType = expression;
        let confidence = expressionConfidence;

        // Gesture takes priority (lowered threshold from 0.6 to 0.5)
        if (gesture !== 'none' && gestureConfidence > 0.5) {
            activeType = gesture;
            confidence = gestureConfidence;
            if (frameCountRef.current === 1) {
                console.log('[Brainrot] Hand gesture:', gesture, 'confidence:', gestureConfidence.toFixed(2));
            }
        }

        let memeUrl = stateRef.current.memeUrl;

        // Get a meme if: no meme yet, or type changed
        if (!memeUrl || activeType !== lastMemeTypeRef.current) {
            memeUrl = getRandomMeme(activeType);
            lastMemeTypeRef.current = activeType;
            console.log('[Brainrot] Meme selected:', activeType, memeUrl);
        }

        setState(prev => ({
            ...prev,
            expression,
            gesture,
            activeType,
            memeUrl,
            confidence,
            fps: currentFps,
        }));

        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, []);

    const startDetection = useCallback(async (video: HTMLVideoElement) => {
        console.log('[Brainrot] Starting detection...');

        try {
            videoRef.current = video;

            // Step 1: Import MediaPipe
            setState(prev => ({ ...prev, loadingStatus: 'Loading AI modules...' }));
            console.log('[Brainrot] Step 1: Importing @mediapipe/tasks-vision...');

            const mediapipe = await withTimeout(
                import('@mediapipe/tasks-vision'),
                30000,
                'MediaPipe import'
            );
            console.log('[Brainrot] ✅ MediaPipe imported successfully');

            const { FaceLandmarker, HandLandmarker, FilesetResolver } = mediapipe;

            // Step 2: Load WASM
            setState(prev => ({ ...prev, loadingStatus: 'Loading WASM runtime...' }));
            console.log('[Brainrot] Step 2: Loading WASM from', WASM_PATH);

            const vision = await withTimeout(
                FilesetResolver.forVisionTasks(WASM_PATH),
                60000,
                'WASM loading'
            );
            console.log('[Brainrot] ✅ WASM loaded successfully');

            // Step 3: Create Face Landmarker
            setState(prev => ({ ...prev, loadingStatus: 'Loading face detection...' }));
            console.log('[Brainrot] Step 3: Creating FaceLandmarker...');

            const faceLandmarker = await withTimeout(
                FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: FACE_LANDMARKER_MODEL,
                        delegate: 'CPU',
                    },
                    runningMode: 'VIDEO',
                    numFaces: 1,
                    minFaceDetectionConfidence: 0.5,
                    minFacePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                    outputFaceBlendshapes: false,
                    outputFacialTransformationMatrixes: false,
                }),
                120000, // 2 minutes for model download
                'FaceLandmarker creation'
            );
            console.log('[Brainrot] ✅ FaceLandmarker created successfully');

            faceLandmarkerRef.current = faceLandmarker;

            // Ready!
            setState(prev => ({
                ...prev,
                isReady: true,
                error: null,
                loadingStatus: '',
            }));
            console.log('[Brainrot] 🎉 Detection ready! Starting frame loop.');

            animationFrameRef.current = requestAnimationFrame(processFrame);

            // Step 4: Load hands in background
            console.log('[Brainrot] Step 4: Loading HandLandmarker in background...');
            try {
                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: HAND_LANDMARKER_MODEL,
                        delegate: 'CPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 2,
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });
                handLandmarkerRef.current = handLandmarker;
                setState(prev => ({ ...prev, handsReady: true }));
                console.log('[Brainrot] ✅ HandLandmarker ready!');
            } catch (err) {
                console.warn('[Brainrot] ⚠️ Hand detection failed:', err);
            }

        } catch (err) {
            console.error('[Brainrot] ❌ Detection failed:', err);
            setState(prev => ({
                ...prev,
                error: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}. Try Chrome.`,
                isReady: false,
                loadingStatus: '',
            }));
        }
    }, [processFrame]);

    const stopDetection = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        const face = faceLandmarkerRef.current as { close?: () => void } | null;
        const hand = handLandmarkerRef.current as { close?: () => void } | null;
        face?.close?.();
        hand?.close?.();
        faceLandmarkerRef.current = null;
        handLandmarkerRef.current = null;
        videoRef.current = null;

        expressionDetector.reset();
        gestureDetector.reset();

        setState(prev => ({ ...prev, isReady: false, handsReady: false }));
    }, []);

    useEffect(() => {
        return () => {
            stopDetection();
        };
    }, [stopDetection]);

    return {
        ...state,
        startDetection,
        stopDetection,
    };
}
