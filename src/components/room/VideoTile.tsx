import React from 'react';
import { RemotePeer } from '@/pages/room/types';

interface VideoTileProps {
    peer?: RemotePeer;
    isLocal?: boolean;
    stream?: MediaStream | null;
    isConnected?: boolean;
    videoRef?: React.RefObject<HTMLVideoElement>; // Make it optional
}

export const VideoTile = React.memo(({ 
    peer, 
    isLocal = false,
    stream,
    isConnected,
    videoRef
}: VideoTileProps) => {
    // Create a local ref if no ref is provided
    const localVideoRef = React.useRef<HTMLVideoElement>(null);
    const finalVideoRef = videoRef || localVideoRef;

    return (
        <div className="relative rounded-2xl overflow-hidden backdrop-blur-sm bg-white/30 dark:bg-slate-900/30 border border-white/30 dark:border-slate-700/30 shadow-xl">
            <video
                ref={finalVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={isLocal}
                {...(!isLocal && peer?.stream && { srcObject: peer.stream })}
            />
            <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                {isLocal ? (
                    <>You (Local) {isConnected ? '🟢' : '🔴'}</>
                ) : (
                    peer?.name || 'Remote User'
                )}
            </div>
        </div>
    );
});

VideoTile.displayName = 'VideoTile';