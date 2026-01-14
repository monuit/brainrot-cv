/**
 * Camera Hook
 * Manages webcam access and stream
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCameraResult {
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    isLoading: boolean;
    error: string | null;
    requestCamera: () => Promise<void>;
    stopCamera: () => void;
}

export function useCamera(): UseCameraResult {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const requestCamera = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
                audio: false,
            });

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }
        } catch (err) {
            const error = err as Error;
            let message = 'Failed to access camera';

            if (error.name === 'NotAllowedError') {
                message = 'Camera permission denied. Please allow camera access.';
            } else if (error.name === 'NotFoundError') {
                message = 'No camera found. Please connect a camera.';
            } else if (error.name === 'NotReadableError') {
                message = 'Camera is in use by another application.';
            }

            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return {
        stream,
        videoRef,
        isLoading,
        error,
        requestCamera,
        stopCamera,
    };
}
