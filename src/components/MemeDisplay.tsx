/**
 * Meme Display Component
 * Shows the current meme with smooth crossfade transitions
 */

import { useState, useEffect } from 'react';
import { CONFIG } from '@/lib/config';

interface MemeDisplayProps {
    imageUrl: string | null;
    isActive: boolean;
}

export function MemeDisplay({ imageUrl }: Omit<MemeDisplayProps, 'isActive'>) {
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [previousImage, setPreviousImage] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (imageUrl !== currentImage && imageUrl) {
            // Start transition
            setPreviousImage(currentImage);
            setIsTransitioning(true);

            // Preload new image
            const img = new Image();
            img.onload = () => {
                setCurrentImage(imageUrl);

                // End transition after duration
                setTimeout(() => {
                    setIsTransitioning(false);
                    setPreviousImage(null);
                }, CONFIG.transitions.crossfadeDuration);
            };
            img.onerror = () => {
                // Keep current image on error
                setIsTransitioning(false);
            };
            img.src = imageUrl;
        }
    }, [imageUrl, currentImage]);

    return (
        <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
            {/* Previous image (fading out) */}
            {previousImage && isTransitioning && (
                <img
                    src={previousImage}
                    alt="Previous meme"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-400 opacity-0"
                />
            )}

            {/* Current image */}
            {currentImage && (
                <img
                    src={currentImage}
                    alt="Current meme"
                    className={`w-full h-full object-contain transition-all duration-400 ${isTransitioning ? 'animate-crossfade' : ''
                        }`}
                />
            )}

            {/* Placeholder when no image */}
            {!currentImage && (
                <div className="flex items-center justify-center w-full h-full">
                    <div className="text-center">
                        <span className="text-6xl">🐱</span>
                        <p className="mt-4 text-zinc-500 text-sm">Waiting for detection...</p>
                    </div>
                </div>
            )}

        </div>
    );
}
