import React from "react";
import { useAtom } from "jotai";
import { useNavigate, useParams } from "react-router";
import { Mic, Camera, ScreenShare, Users, MessageSquare, CircleDot, Phone, Copy, X, Send, Clock, Pin } from 'lucide-react';
import {
    micAtom,
    cameraAtom,
    screenShareAtom,
    chatAtom,
    recordingAtom,
    participantsAtom
} from "@/data/room";
import { peerService } from "@/services/peer";
import { motion, AnimatePresence } from 'framer-motion';

// Define interface for remote peer
interface RemotePeer {
    id: string;
    stream: MediaStream | null;
    name?: string;
}

export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const [mic, setMic] = useAtom(micAtom);
    const [camera, setCamera] = useAtom(cameraAtom);
    const [screenShare, setScreenShare] = useAtom(screenShareAtom);
    const [chat, setChat] = useAtom(chatAtom);
    const [recording, setRecording] = useAtom(recordingAtom);
    const [participants, setParticipants] = useAtom(participantsAtom);
    const [stream, setStream] = React.useState<MediaStream | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    // New state for managing peer connections
    const [remotePeers, setRemotePeers] = React.useState<RemotePeer[]>([]);
    const [isConnected, setIsConnected] = React.useState<boolean>(false);
    const [meetingDuration, setMeetingDuration] = React.useState<string>('00:00:00');
    const [showHeader, setShowHeader] = React.useState(false);
    const [showControls, setShowControls] = React.useState(true);

    // Add these new states after your existing state declarations
    const [pinnedParticipant, setPinnedParticipant] = React.useState<string | null>(null);
    const [presentationMode, setPresentationMode] = React.useState(false);

    // Mock signaling server functions
    // In a real implementation, this would use WebSockets or another method
    const mockSignalingChannel = {
        // Simulate sending offer to other peers
        sendOffer: async (offer: RTCSessionDescriptionInit) => {
            console.log("Sending offer to peers:", offer);
            // In a real implementation, this would send to a server
            // For now, we'll just simulate receiving an answer after a delay
            setTimeout(() => {
                handleRemoteAnswer({
                    type: 'answer',
                    sdp: 'mock_sdp_answer_from_remote_peer'
                }, 'remote-user-123');
            }, 1000);
        },
        // Simulate sending answer back to an offering peer
        sendAnswer: async (answer: RTCSessionDescriptionInit, peerId: string) => {
            console.log(`Sending answer to peer ${peerId}:`, answer);
            // In a real implementation, this would send to a server
        },
        // Simulate sending ICE candidate to a peer
        sendIceCandidate: (candidate: RTCIceCandidate, peerId: string) => {
            console.log(`Sending ICE candidate to peer ${peerId}:`, candidate);
            // In a real implementation, this would send to a server
        }
    };

    // Functions to handle peer connection
    const initializePeerConnection = React.useCallback(() => {
        if (!stream) return;

        // Initialize peer connection with config
        peerService.init({
            onIceCandidate: (candidate) => {
                // Send this ICE candidate to all connected peers via signaling
                remotePeers.forEach(peer => {
                    mockSignalingChannel.sendIceCandidate(candidate, peer.id);
                });
            },
            onConnectionStateChange: (state) => {
                console.log("Peer connection state changed:", state);
                setIsConnected(state === 'connected');
            },
            onTrack: (event) => {
                console.log("Received remote track:", event);
                // When we receive a track from remote peer, add it to our remote streams
                if (event.streams && event.streams[0]) {
                    const remoteStream = event.streams[0];
                    // Create a new remote peer entry or update existing
                    setRemotePeers(prevPeers => {
                        // For simplicity, assume this is from a new peer
                        // In a real app, you'd match it to the correct peer ID
                        const newPeerId = `remote-peer-${Date.now()}`;
                        return [...prevPeers, {
                            id: newPeerId,
                            stream: remoteStream,
                            name: `User ${prevPeers.length + 1}`
                        }];
                    });
                }
            }
        });

        // Add local stream to peer connection
        peerService.addStream(stream);

        // Create and send an offer to initiate connection
        createAndSendOffer();
    }, [stream, remotePeers]);

    // Function to create and send an offer
    const createAndSendOffer = async () => {
        try {
            const offer = await peerService.getOffer();
            if (offer) {
                // Send this offer to all potential peers via signaling server
                mockSignalingChannel.sendOffer(offer);
            }
        } catch (error) {
            console.error("Error creating offer:", error);
        }
    };

    // Function to handle incoming offer from remote peer
    const handleRemoteOffer = async (offer: RTCSessionDescriptionInit, peerId: string) => {
        try {
            // Set the remote description (offer)
            await peerService.setOffer(offer);

            // Create an answer
            const answer = await peerService.getAnswer();
            if (answer) {
                // Send the answer back to the peer who sent the offer
                mockSignalingChannel.sendAnswer(answer, peerId);
            }
        } catch (error) {
            console.error("Error handling remote offer:", error);
        }
    };

    // Function to handle incoming answer from remote peer
    const handleRemoteAnswer = async (answer: RTCSessionDescriptionInit, peerId: string) => {
        try {
            await peerService.setAnswer(answer);
            console.log(`Set remote answer from peer ${peerId}`);
        } catch (error) {
            console.error("Error handling remote answer:", error);
        }
    };

    // // Function to handle incoming ICE candidate from remote peer
    // const handleRemoteIceCandidate = (candidate: RTCIceCandidate) => {
    //     try {
    //         peerService.addIceCandidate(candidate);
    //     } catch (error) {
    //         console.error("Error adding ICE candidate:", error);
    //     }
    // };

    // Initialize local media and peer connection
    React.useEffect(() => {
        if (!navigator) {
            console.error("navigator is not defined");
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: camera, audio: mic })
            .then((mediaStream) => {
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            })
            .catch((error) => {
                console.error("Error accessing media devices.", error);
            });

        return () => {
            // Cleanup function to stop all tracks when component unmounts
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            // Clean up peer connections
            peerService.cleanup();
        };
    }, [camera, mic]);

    // Effect to initialize peer connection when stream is available
    React.useEffect(() => {
        if (stream) {
            initializePeerConnection();
        }

        // Mock receiving an offer after joining room (simulating another peer)
        setTimeout(() => {
            if (stream) {
                handleRemoteOffer({
                    type: 'offer',
                    sdp: 'mock_sdp_offer_from_remote_peer'
                }, 'remote-user-456');
            }
        }, 2000);

    }, [stream, initializePeerConnection]);

    // Timer effect to update meeting duration
    React.useEffect(() => {
        const startTime = new Date();
        
        const timer = setInterval(() => {
            const now = new Date();
            const diff = now.getTime() - startTime.getTime();
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setMeetingDuration(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Rest of your existing functions
    function toggleMic() {
        setMic(!mic);
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !mic;
            });
        }
    }

    function toggleCamera() {
        const newCameraState = !camera;
        setCamera(newCameraState);
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                track.enabled = newCameraState;
            });
        }
    }

    function toggleScreenShare() {
        const newScreenShareState = !screenShare;
        setScreenShare(newScreenShareState);

        if (!newScreenShareState) {
            // Stop screen sharing and revert to camera
            if (stream) {
                const videoTracks = stream.getVideoTracks();
                videoTracks.forEach(track => track.stop());

                navigator.mediaDevices.getUserMedia({ video: camera, audio: mic })
                    .then((mediaStream) => {
                        setStream(mediaStream);
                        if (videoRef.current) {
                            videoRef.current.srcObject = mediaStream;
                        }
                    });
            }
        } else {
            // Start screen sharing
            navigator.mediaDevices.getDisplayMedia({ video: true })
                .then((mediaStream) => {
                    // Keep audio from current stream if it exists
                    if (stream && stream.getAudioTracks().length > 0) {
                        const audioTrack = stream.getAudioTracks()[0];
                        mediaStream.addTrack(audioTrack);
                    }
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                })
                .catch((error) => {
                    console.error("Error accessing screen share.", error);
                });
        }
    }

    function toggleChat() {
        setChat(!chat);
    }

    function toggleRecording() {
        setRecording(!recording);
        // Add recording implementation here
    }

    function toggleParticipants() {
        setParticipants(!participants);
    }

    function toggleLeave() {
        // Close all tracks before leaving
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        // Clean up peer connections
        peerService.cleanup();
        // Navigate back to home page when leaving
        navigate("/");
    }

    // Add this function with your other toggle functions
    function togglePin(participantId: string | null) {
        if (pinnedParticipant === participantId) {
            setPinnedParticipant(null);
            setPresentationMode(false);
        } else {
            setPinnedParticipant(participantId);
            setPresentationMode(true);
        }
    }

    // Replace the existing handleMouseMove function with this updated version
    const handleMouseMove = (e: React.MouseEvent) => {
        // Show header when mouse is near top
        if (e.clientY < 100) {
            setShowHeader(true);
        } else {
            setShowHeader(false);
        }
        
        // Show controls when mouse is near bottom
        if (e.clientY > window.innerHeight - 100) {
            setShowControls(true);
        } else {
            setShowControls(false);
        }
    };

    // Replace the existing header JSX with this new floating header
    // Update the return statement to include onMouseMove
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-200/70 via-blue-300/50 to-indigo-200/70 dark:from-slate-900/70 dark:via-slate-800/50 dark:to-slate-700/70 animate-gradient-slow" 
            onMouseMove={handleMouseMove}>
            {/* Floating Header */}
            <div 
                className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
                    showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
            >
                <div className="flex items-center gap-2 p-2 rounded-2xl backdrop-blur-xl bg-white/10 dark:bg-slate-900/10 border border-white/10 dark:border-slate-700/10 shadow-lg hover:shadow-xl transition-all">
                    {/* Room info group */}
                    <div className="flex items-center gap-3 px-3">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                            <h1 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                                {roomId}
                            </h1>
                        </div>
                        
                        {/* Separator */}
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50"></div>
                        
                        {/* Duration */}
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {meetingDuration}
                        </div>
                        
                        {/* Separator */}
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50"></div>
                        
                        {/* Participants count */}
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {remotePeers.length + 1} participants
                        </div>
                    </div>
                </div>
            </div>

            <div className={`h-screen ${
    presentationMode 
    ? 'grid grid-cols-1 grid-rows-1' 
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
} gap-4 p-4 mt-16`}>
    {/* Pinned or presentation video */}
    {presentationMode && pinnedParticipant && (
        pinnedParticipant === 'local' ? (
            <motion.div 
                layoutId="local-video"
                className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 dark:from-slate-700/30 dark:to-slate-900/10 border border-white/20 dark:border-slate-700/20 shadow-lg"
            >
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    autoPlay
                    playsInline
                    muted
                />
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                        Presenting
                    </span>
                    <button 
                        onClick={() => togglePin(null)}
                        className="p-2 rounded-full backdrop-blur-md bg-black/20 text-white/90 hover:bg-black/40"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>
        ) : (
            remotePeers.map(peer => peer.id === pinnedParticipant && (
                <motion.div 
                    key={peer.id}
                    layoutId={`peer-${peer.id}`}
                    className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-white/20 dark:bg-slate-900/20 border border-white/20 dark:border-slate-700/20 shadow-lg"
                >
                    <video
                        className="w-full h-full object-contain"
                        autoPlay
                        playsInline
                        ref={(element) => {
                            if (element && peer.stream) {
                                element.srcObject = peer.stream;
                            }
                        }}
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                            Presenting
                        </span>
                        <button 
                            onClick={() => togglePin(null)}
                            className="p-2 rounded-full backdrop-blur-md bg-black/20 text-white/90 hover:bg-black/40"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            ))
        )
    )}

    {/* Regular video grid */}
    {!presentationMode && (
        <>
            {/* Local video */}
            <motion.div 
                layoutId="local-video"
                className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 dark:from-slate-700/30 dark:to-slate-900/10 border border-white/20 dark:border-slate-700/20 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                        You (Local) {isConnected ? '🟢' : '🔴'}
                    </div>
                    <button 
                        onClick={() => togglePin('local')}
                        className="p-2 rounded-full backdrop-blur-md bg-black/20 text-white/90 hover:bg-black/40"
                    >
                        <Pin className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>

            {/* Remote videos */}
            {remotePeers.map((peer) => (
                <motion.div 
                    key={peer.id}
                    layoutId={`peer-${peer.id}`}
                    className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-white/20 dark:bg-slate-900/20 border border-white/20 dark:border-slate-700/20 shadow-lg hover:shadow-xl transition-all"
                >
                    <video
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        ref={(element) => {
                            if (element && peer.stream) {
                                element.srcObject = peer.stream;
                            }
                        }}
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                            {peer.name || 'Remote User'}
                        </div>
                        <button 
                            onClick={() => togglePin(peer.id)}
                            className="p-2 rounded-full backdrop-blur-md bg-black/20 text-white/90 hover:bg-black/40"
                        >
                            <Pin className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            ))}
        </>
    )}
</div>

            {/* New dock-style controls */}
            <AnimatePresence>
                {showControls && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="flex items-center gap-2 p-2 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/20 to-white/10 dark:from-slate-800/20 dark:to-slate-900/10 border border-white/20 dark:border-slate-700/20 shadow-lg hover:shadow-2xl transition-all">
                            {/* Room ID display with copy button */}
                            <div className="px-3 py-1.5 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/20 dark:border-slate-700/20 backdrop-blur-lg flex items-center gap-2 mr-2">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    {roomId}
                                </span>
                                <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50"></div>

                            {/* Main controls group */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={toggleMic}
                                    className={`p-3 rounded-xl transition-all backdrop-blur-lg transform hover:scale-105 active:scale-95 ${
                                        mic 
                                        ? 'bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white hover:from-blue-600/90 hover:to-blue-700/90 pulse-glow' 
                                        : 'bg-gradient-to-r from-white/30 to-white/20 dark:from-slate-800/30 dark:to-slate-800/20 hover:from-white/40 hover:to-white/30'
                                    }`}
                                >
                                    <Mic className="h-5 w-5" />
                                </button>
                                
                                <button 
                                    onClick={toggleCamera}
                                    className={`p-3 rounded-xl transition-all backdrop-blur-lg ${
                                        camera 
                                        ? 'bg-blue-500/80 text-white hover:bg-blue-600/90' 
                                        : 'bg-white/20 dark:bg-slate-800/20 hover:bg-white/30 dark:hover:bg-slate-700/30'
                                    }`}
                                >
                                    <Camera className="h-5 w-5" />
                                </button>

                                <button 
                                    onClick={toggleScreenShare}
                                    className={`p-3 rounded-xl transition-all backdrop-blur-lg ${
                                        screenShare 
                                        ? 'bg-blue-500/80 text-white hover:bg-blue-600/90' 
                                        : 'bg-white/20 dark:bg-slate-800/20 hover:bg-white/30 dark:hover:bg-slate-700/30'
                                    }`}
                                >
                                    <ScreenShare className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50"></div>

                            {/* Secondary controls group */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={toggleParticipants}
                                    className={`p-3 rounded-xl transition-all ${
                                        participants 
                                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                        : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <Users className="h-5 w-5" />
                                </button>

                                <button 
                                    onClick={toggleChat}
                                    className={`p-3 rounded-xl transition-all ${
                                        chat 
                                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                        : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <MessageSquare className="h-5 w-5" />
                                </button>

                                <button 
                                    onClick={toggleRecording}
                                    className={`p-3 rounded-xl transition-all ${
                                        recording 
                                        ? 'bg-red-500 text-white hover:bg-red-600' 
                                        : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <CircleDot className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Separator */}
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50"></div>

                            {/* Leave button */}
                            <button 
                                onClick={toggleLeave}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-2"
                            >
                                <Phone className="h-5 w-5" />
                                <span className="font-medium">Leave</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat panel */}
            <AnimatePresence>
                {chat && (
                    <motion.div 
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        className="fixed right-0 bottom-24 w-full lg:w-96 h-[500px] 
                        backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/5 dark:from-slate-800/20 dark:to-slate-900/5
                        border border-white/20 dark:border-slate-700/20 shadow-xl rounded-2xl mx-4 lg:mx-0 lg:right-6 
                        overflow-hidden hover:shadow-2xl"
                    >
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/20 dark:border-slate-700/20 bg-gradient-to-r from-sky-500/80 to-blue-600/80 backdrop-blur-lg">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Chat
                                </h2>
                                <button 
                                    onClick={toggleChat} 
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages Area */}
                        <div className="flex-1 overflow-y-auto h-[calc(100%-8rem)] p-4 space-y-4">
                            {/* Example messages - replace with your actual messages */}
                            <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                                    You
                                </div>
                                <div className="flex-1 bg-white/10 dark:bg-slate-800/10 rounded-xl p-3 text-sm backdrop-blur-lg">
                                    Hello! How are you?
                                </div>
                            </div>
                        </div>

                        {/* Chat Input Area */}
                        <div className="p-4 border-t border-white/20 dark:border-slate-700/20 bg-white/10 dark:bg-slate-800/10 backdrop-blur-lg">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/20 dark:bg-slate-900/20 border border-white/20 dark:border-slate-700/20 
                                    rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-lg"
                                />
                                <button 
                                    className="p-2 rounded-xl bg-blue-500/80 text-white hover:bg-blue-600/90 transition-all backdrop-blur-lg"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Participants panel */}
            <AnimatePresence>
                {participants && (
                    <motion.div 
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        className="fixed right-0 bottom-24 w-full lg:w-96 h-[500px] 
                        backdrop-blur-xl bg-white/10 dark:bg-slate-900/10 border border-white/10 dark:border-slate-700/10
                        shadow-xl transition-all rounded-2xl mx-4 lg:mx-0 lg:right-[calc(6rem+384px)] overflow-hidden hover:shadow-2xl"
                    >
                        {/* Participants Header */}
                        <div className="p-4 border-b border-white/20 dark:border-slate-700/20 bg-gradient-to-r from-sky-500/80 to-blue-600/80 backdrop-blur-lg">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Participants ({remotePeers.length + 1})
                                </h2>
                                <button 
                                    onClick={toggleParticipants} 
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Participants List */}
                        <div className="flex-1 overflow-y-auto h-[calc(100%-5rem)] p-4">
                            <ul className="space-y-2">
                                <li className="py-2 px-3 rounded-xl backdrop-blur-sm bg-white/10 dark:bg-slate-800/10 border border-white/20 dark:border-slate-700/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                                            You
                                        </div>
                                        <span className="text-sm font-medium">You (Local)</span>
                                    </div>
                                    <span className="text-emerald-500">{isConnected ? '🟢' : '🔴'}</span>
                                </li>
                                {remotePeers.map(peer => (
                                    <li key={peer.id} className="py-2 px-3 rounded-xl backdrop-blur-sm bg-white/10 dark:bg-slate-800/10 border border-white/20 dark:border-slate-700/20 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-500 flex items-center justify-center text-white font-semibold text-sm">
                                            {peer.name?.[0] || 'U'}
                                        </div>
                                        <span className="text-sm font-medium">{peer.name || 'Remote User'}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
