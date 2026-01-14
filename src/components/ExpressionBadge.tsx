/**
 * Expression Badge Component
 * Shows current detected expression/gesture
 */

import { EXPRESSION_INFO, GESTURE_INFO, type DetectionType } from '@/lib/config';

interface ExpressionBadgeProps {
    type: DetectionType;
    confidence: number;
}

export function ExpressionBadge({ type, confidence }: ExpressionBadgeProps) {
    // Get display info
    const info = EXPRESSION_INFO[type as keyof typeof EXPRESSION_INFO]
        || GESTURE_INFO[type as keyof typeof GESTURE_INFO]
        || { emoji: '❓', name: 'Unknown' };

    return (
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg animate-slide-up">
            <span className="text-2xl">{info.emoji}</span>
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{info.name}</span>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(confidence * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-zinc-400">{Math.round(confidence * 100)}%</span>
                </div>
            </div>
        </div>
    );
}
