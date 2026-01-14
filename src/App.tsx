import { useState, useEffect } from 'react';
import { CameraView } from './components/CameraView';
import { MemeDisplay } from './components/MemeDisplay';
import { ExpressionBadge } from './components/ExpressionBadge';
import { useCamera } from './hooks/useCamera';
import { useDetection } from './hooks/useDetection';


type AppState = 'permission' | 'loading' | 'active' | 'error';

export default function App() {
    const [appState, setAppState] = useState<AppState>('permission');
    const [detectionStarted, setDetectionStarted] = useState(false);
    const { stream, videoRef, isLoading, error: cameraError, requestCamera } = useCamera();
    const { activeType, memeUrl, confidence, isReady, error: detectionError, loadingStatus, startDetection } = useDetection();

    const error = cameraError || detectionError;

    // Handle camera request
    const handleStart = async () => {
        console.log('[App] Enable Camera clicked');
        setAppState('loading');
        await requestCamera();
        console.log('[App] Camera request completed');
    };

    // Start detection when camera is ready
    useEffect(() => {
        if (stream && videoRef.current && !isReady && !detectionStarted && appState === 'loading') {
            console.log('[App] Calling startDetection...');
            setDetectionStarted(true);
            startDetection(videoRef.current);
        }
    }, [stream, videoRef, isReady, detectionStarted, startDetection, appState]);

    // Update state based on camera/detection status
    useEffect(() => {
        if (error) {
            setAppState('error');
            setDetectionStarted(false);
        } else if (isReady) {
            setAppState('active');
        } else if (isLoading || stream) {
            setAppState('loading');
        }
    }, [error, isReady, isLoading, stream]);

    return (
        <div className="min-h-screen w-full flex flex-col">
            {/* Persistent Camera View Layer - Always rendered when stream is available */}
            {stream && (
                <div className={`fixed inset-0 transition-opacity duration-1000 ${appState === 'active' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="w-full h-full flex items-center justify-center p-4 lg:p-8">
                        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                            {/* Camera Position Placeholder matches the grid layout */}
                            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-[70vh]">
                                <CameraView ref={videoRef} isActive={true} stream={stream} />
                            </div>

                            {/* Spacer for meme column */}
                            <div className="hidden lg:block"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="relative z-20 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="text-3xl bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 font-black tracking-tighter hover:scale-105 transition-transform cursor-default">
                        🧠 Brainrot
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
                {appState === 'permission' && (
                    <div className="glass-panel p-8 max-w-md text-center animate-fade-in">
                        <div className="text-6xl mb-6">📹</div>
                        <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                            Camera Access Required
                        </h2>
                        <p className="text-zinc-400 mb-8 leading-relaxed">
                            Brainrot uses your camera to detect facial expressions and hand gestures,
                            matching them with viral memes in real-time.
                        </p>
                        <button
                            onClick={handleStart}
                            disabled={isLoading}
                            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="flex items-center gap-2">
                                🐱 Enable Camera
                            </span>
                        </button>
                        <p className="mt-6 text-xs text-zinc-600">
                            Your video is processed locally and never uploaded.
                        </p>
                    </div>
                )}

                {appState === 'loading' && (
                    <div className="glass-panel p-8 max-w-md text-center animate-fade-in">
                        <div className="text-6xl mb-6">
                            <span className="inline-block animate-spin">⏳</span>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Loading...</h2>
                        <p className="text-zinc-400 text-sm mb-4">
                            {loadingStatus || (stream ? 'Initializing detection...' : 'Requesting camera access...')}
                        </p>
                        <p className="text-zinc-600 text-xs">
                            First load downloads ~25MB of AI models
                        </p>
                        {/* Video is now persistent at component root */}
                    </div>
                )}

                {appState === 'error' && (
                    <div className="glass-panel p-8 max-w-md text-center animate-fade-in">
                        <div className="text-6xl mb-6">😿</div>
                        <h2 className="text-2xl font-bold mb-3 text-red-400">Camera Error</h2>
                        <p className="text-zinc-400 mb-6">{error}</p>
                        <button
                            onClick={handleStart}
                            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {appState === 'active' && (
                    <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in pointer-events-none">
                        {/* Camera container placeholder - visual only */}
                        {/* Camera container placeholder - Transparent to show fixed video below */}
                        <div className="relative aspect-[4/3] lg:aspect-auto lg:h-[70vh] rounded-2xl overflow-hidden border-2 border-transparent">
                            {/* The actual video is in the fixed layer below, but we can add a label here */}
                            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white pointer-events-none">
                                🔴 Live Camera
                            </div>
                        </div>

                        {/* Meme Display - pointer-events-auto to allow clicks if needed */}
                        <div className="relative aspect-[4/3] lg:aspect-auto lg:h-[70vh] pointer-events-auto">
                            <MemeDisplay imageUrl={memeUrl} />

                            {/* Expression Badge */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                <ExpressionBadge type={activeType} confidence={confidence} />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="relative z-20 py-6 text-center text-zinc-500 text-sm">
                <p>
                    Made with 💜 •{' '}
                    <span className="text-zinc-400 hover:text-white transition-colors cursor-help" title="14 expressions supported">
                        Expressions
                    </span>{' '}
                    •{' '}
                    <span className="text-zinc-400 hover:text-white transition-colors cursor-help" title="9 hand gestures supported">
                        Gestures
                    </span>{' '}
                    <span className="text-zinc-400">
                        v2.0.0
                    </span>
                </p>
            </footer>
        </div>
    );
}
