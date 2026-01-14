/**
 * Camera View Component
 * Displays the video feed with mirror effect
 */

import { forwardRef, useEffect } from 'react';

interface CameraViewProps {
    isActive: boolean;
    stream?: MediaStream | null;
}

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
    ({ isActive, stream }, ref) => {
        // Apply stream to video element when both are available
        useEffect(() => {
            const video = (ref as React.RefObject<HTMLVideoElement>)?.current;
            if (video && stream) {
                video.srcObject = stream;
                video.play().catch(err => {
                    console.warn('[CameraView] Failed to play:', err);
                });
            }
        }, [ref, stream]);

        return (
            <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
                <video
                    ref={ref}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover video-mirror transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                />

            </div>
        );
    }
);

CameraView.displayName = 'CameraView';
