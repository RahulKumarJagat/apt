import { DirectMessage } from '../pages/room/types';

// Update the PeerConnectionConfig interface
interface PeerConnectionConfig {
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onTrack?: (event: RTCTrackEvent) => void;
  onMessage?: (message: DirectMessage) => void;  // Add this line
}

// Define interfaces for better type safety
interface PeerConnectionConfig {
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onTrack?: (event: RTCTrackEvent) => void;
}

export class PeerService {
  private peer: RTCPeerConnection | null = null;
  private config: PeerConnectionConfig = {};
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor() {
    this.createPeerConnection();
  }

  // Initialize with config and optional event handlers
  public init(config: PeerConnectionConfig = {}): void {
    this.config = config;
    
    if (this.peer) {
      // Set up event listeners
      this.peer.onicecandidate = (event) => {
        if (event.candidate && this.config.onIceCandidate) {
          this.config.onIceCandidate(event.candidate);
        }
      };
      
      this.peer.onconnectionstatechange = () => {
        if (this.peer && this.config.onConnectionStateChange) {
          this.config.onConnectionStateChange(this.peer.connectionState);
        }
      };
      
      this.peer.ontrack = (event) => {
        if (this.config.onTrack) {
          this.config.onTrack(event);
        }
        
        // Store remote stream
        this.remoteStream = event.streams[0];
      };
      
      // Initialize data channel
      this.dataChannel = this.peer.createDataChannel("chat");
      this.dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as DirectMessage;
          if (this.config.onMessage) {
            this.config.onMessage(message);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };
    }
  }

  private createPeerConnection(): void {
    try {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
          {
            urls: "stun:stun1.l.google.com:19302",
          },
          {
            urls: "stun:stun2.l.google.com:19302",
          },
          {
            urls: "stun:stun3.l.google.com:19302",
          },
        ],
      });
    } catch (error) {
      console.error("Error creating RTCPeerConnection:", error);
    }
  }

  async getAnswer(offer?: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | undefined> {
    if (!this.peer) return undefined;
    
    try {
      if (offer) {
        await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
      }
      
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(answer));
      return answer;
    } catch (error) {
      console.error("Error creating answer:", error);
      return undefined;
    }
  }

  async setAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peer) return;
    
    try {
      await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error setting remote description:", error);
    }
  }

  async getOffer(): Promise<RTCSessionDescriptionInit | undefined> {
    if (!this.peer) return undefined;
    
    try {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      return undefined;
    }
  }

  // Add a method to set remote offer
  async setOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peer) return;
    
    try {
      await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
    } catch (error) {
      console.error("Error setting offer:", error);
    }
  }
  
  // Add a method to add ICE candidate from remote peer
  addIceCandidate(candidate: RTCIceCandidate): void {
    if (!this.peer) return;
    
    try {
      this.peer.addIceCandidate(candidate);
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }
  
  // Method to add local media stream
  addStream(stream: MediaStream): void {
    if (!this.peer) return;
    
    this.localStream = stream;
    stream.getTracks().forEach(track => {
      if (this.peer) {
        this.peer.addTrack(track, stream);
      }
    });
  }
  
  // Method to get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
  
  // Clean up resources when done
  cleanup(): void {
    if (this.peer) {
      this.peer.onicecandidate = null;
      this.peer.onconnectionstatechange = null;
      this.peer.ontrack = null;
      this.peer.close();
      this.peer = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.remoteStream = null;
  }
  
  // Method to restart ICE if connection fails
  restartIce(): void {
    if (this.peer) {
      this.peer.restartIce();
    }
  }
  
  public sendMessage(message: DirectMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  public onMessage(callback: (message: DirectMessage) => void) {
    if (this.dataChannel) {
      this.dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        callback(message);
      };
    }
  }
}

export const peerService = new PeerService();
