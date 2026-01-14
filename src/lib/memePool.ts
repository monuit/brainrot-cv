/**
 * Meme Pool System
 * Manages randomized meme selection with variety
 */

import type { ExpressionType, GestureType, DetectionType } from './config';

// Meme pool structure - maps detection types to arrays of image paths
const memePool: Record<string, string[]> = {
    // Expressions
    shock: [],
    scream: [],
    tongue: [],
    happy: [],
    sad: [],
    wink: [],
    glare: [],
    suspicious: [],
    sleepy: [],
    eyebrow: [],
    confused: [],
    pout: [],
    disgust: [],
    kissy: [],
    neutral: [],

    // Gestures
    middleFinger: [],
    thumbsUp: [],
    thumbsDown: [],
    peace: [],
    ok: [],
    rockOn: [],
    wave: [],
    fist: [],
    pointing: [],
    none: [],
};

// Track recently used memes to avoid immediate repeats
const recentMemes: Map<string, string[]> = new Map();
const RECENT_HISTORY_SIZE = 3;

/**
 * Initialize meme pool with image paths
 * Called once on app load
 */
export function initializeMemePool(): void {
    // Dynamically import all meme images from assets
    const expressionMemes = import.meta.glob('/assets/expressions/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });
    const gestureMemes = import.meta.glob('/assets/gestures/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });

    // Parse expression memes
    for (const [path, url] of Object.entries(expressionMemes)) {
        const match = path.match(/\/assets\/expressions\/([^/]+)\//);
        if (match && match[1] && memePool[match[1]]) {
            memePool[match[1]].push(url as string);
        }
    }

    // Parse gesture memes
    for (const [path, url] of Object.entries(gestureMemes)) {
        const match = path.match(/\/assets\/gestures\/([^/]+)\//);
        if (match && match[1] && memePool[match[1]]) {
            memePool[match[1]].push(url as string);
        }
    }

    // Also load legacy assets (flat structure)
    const legacyMemes = import.meta.glob('/assets/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });
    for (const [path, url] of Object.entries(legacyMemes)) {
        const filename = path.split('/').pop()?.toLowerCase() || '';

        // Map legacy filenames to categories
        if (filename.includes('shock')) memePool.shock.push(url as string);
        else if (filename.includes('scream')) memePool.scream.push(url as string);
        else if (filename.includes('tongue')) memePool.tongue.push(url as string);
        else if (filename.includes('happy')) memePool.happy.push(url as string);
        else if (filename.includes('sad')) memePool.sad.push(url as string);
        else if (filename.includes('wink')) memePool.wink.push(url as string);
        else if (filename.includes('glare')) memePool.glare.push(url as string);
        else if (filename.includes('suspicious')) memePool.suspicious.push(url as string);
        else if (filename.includes('sleepy')) memePool.sleepy.push(url as string);
        else if (filename.includes('eyebrow')) memePool.eyebrow.push(url as string);
        else if (filename.includes('confused')) memePool.confused.push(url as string);
        else if (filename.includes('pout')) memePool.pout.push(url as string);
        else if (filename.includes('disgust')) memePool.disgust.push(url as string);
        else if (filename.includes('kissy')) memePool.kissy.push(url as string);
        else if (filename.includes('blink')) memePool.sleepy.push(url as string);
        else if (filename.includes('larry') || filename.includes('neutral')) memePool.neutral.push(url as string);
    }

    console.log('Meme pool initialized:',
        Object.entries(memePool)
            .filter(([_, arr]) => arr.length > 0)
            .map(([key, arr]) => `${key}: ${arr.length}`)
            .join(', ')
    );
}

/**
 * Get a random meme for the given detection type
 * Avoids immediate repeats
 */
export function getRandomMeme(type: DetectionType): string | null {
    const pool = memePool[type];

    if (!pool || pool.length === 0) {
        // Fallback to neutral if no memes for this type
        const neutralPool = memePool.neutral;
        if (neutralPool && neutralPool.length > 0) {
            return neutralPool[Math.floor(Math.random() * neutralPool.length)];
        }
        return null;
    }

    // Get recent history for this type
    const recent = recentMemes.get(type) || [];

    // Filter out recently used memes if we have enough variety
    let available = pool.filter(m => !recent.includes(m));
    if (available.length === 0) {
        available = pool; // Reset if all have been used
    }

    // Pick random from available
    const selected = available[Math.floor(Math.random() * available.length)];

    // Update recent history
    recent.push(selected);
    if (recent.length > RECENT_HISTORY_SIZE) {
        recent.shift();
    }
    recentMemes.set(type, recent);

    return selected;
}

/**
 * Get count of memes for a given type
 */
export function getMemeCount(type: DetectionType): number {
    return memePool[type]?.length || 0;
}

/**
 * Get total meme count
 */
export function getTotalMemeCount(): number {
    return Object.values(memePool).reduce((sum, arr) => sum + arr.length, 0);
}

/**
 * Check if pool is initialized with memes
 */
export function isPoolReady(): boolean {
    return getTotalMemeCount() > 0;
}
