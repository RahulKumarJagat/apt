import React from "react";
import { useAtom } from "jotai";
import { useNavigate, useParams } from "react-router";
import { Mic, Camera, ScreenShare, Users, MessageSquare, CircleDot, Phone, Copy, X, Send } from 'lucide-react';
import {
    micAtom,
    cameraAtom,
    screenShareAtom,
    chatAtom,
    recordingAtom,
    participantsAtom
} from "@/data/room";
import { peerService } from "@/services/peer";

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
    // const [userId] = React.useState<string>(`user-${Math.floor(Math.random() * 10000)}`);

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

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-100 to-blue-50 dark:from-slate-900 dark:to-slate-800">
            <div className="h-screen grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {/* Local video */}
                <div className="relative rounded-2xl overflow-hidden backdrop-blur-sm bg-white/30 dark:bg-slate-900/30 border border-white/30 dark:border-slate-700/30 shadow-xl">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                    />
                    <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                        You (Local) {isConnected ? '🟢' : '🔴'}
                    </div>
                </div>

                {/* Remote videos */}
                {remotePeers.map((peer) => (
                    <div key={peer.id} className="relative rounded-2xl overflow-hidden backdrop-blur-sm bg-white/30 dark:bg-slate-900/30 border border-white/30 dark:border-slate-700/30 shadow-xl">
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
                        <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full backdrop-blur-md bg-black/20 text-white/90 text-sm font-medium">
                            {peer.name || 'Remote User'}
                        </div>
                    </div>
                ))}
            </div>

            <div 
                className="fixed right-0 top-0 bottom-0 w-full lg:w-80 h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-5rem)] 
                backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-l border-white/30 dark:border-slate-700/30
                shadow-xl transition-transform"
                style={{ transform: participants ? 'translateX(0)' : 'translateX(100%)' }}
            >
                <div className="p-4 border-b border-white/30 dark:border-slate-700/30">
                    <h2 className="text-lg font-bold">Participants ({remotePeers.length + 1})</h2>
                    <button onClick={toggleParticipants} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">×</button>
                </div>
                <div className="p-4">
                    <ul className="space-y-2">
                        <li className="py-2 px-3 rounded-lg backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30">
                            You (Local) {isConnected ? '🟢' : '🔴'}
                        </li>
                        {remotePeers.map(peer => (
                            <li key={peer.id} className="py-2 px-3 rounded-lg backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30">
                                {peer.name || 'Remote User'}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* New dock-style controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-2 p-2 rounded-2xl backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-slate-700/20 shadow-lg">
                    {/* Room ID display with copy button */}
                    <div className="px-3 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 flex items-center gap-2 mr-2">
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
                            className={`p-3 rounded-xl transition-all ${
                                mic 
                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
                            }`}
                        >
                            <Mic className="h-5 w-5" />
                        </button>
                        
                        <button 
                            onClick={toggleCamera}
                            className={`p-3 rounded-xl transition-all ${
                                camera 
                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
                            }`}
                        >
                            <Camera className="h-5 w-5" />
                        </button>

                        <button 
                            onClick={toggleScreenShare}
                            className={`p-3 rounded-xl transition-all ${
                                screenShare 
                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
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
            </div>

            {/* Chat panel */}
            <div 
                className="fixed right-0 bottom-24 w-full lg:w-96 h-[500px] 
                backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-slate-700/20
                shadow-xl transition-all rounded-2xl mx-4 lg:mx-0 lg:right-6 overflow-hidden"
                style={{ 
                    transform: chat ? 'translateY(0)' : 'translateY(calc(100% + 6rem))',
                    opacity: chat ? 1 : 0
                }}
            >
                {/* Chat Header */}
                <div className="p-4 border-b border-white/30 dark:border-slate-700/30 bg-gradient-to-r from-sky-500 to-blue-600">
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
                        <div className="flex-1 bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-sm">
                            Hello! How are you?
                        </div>
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="p-4 border-t border-white/30 dark:border-slate-700/30 bg-white/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="flex-1 bg-white dark:bg-slate-900 border border-white/30 dark:border-slate-700/30 
                            rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
