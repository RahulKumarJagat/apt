export interface RemotePeer {
    id: string;
    stream: MediaStream | null;
    name?: string;
    status?: 'online' | 'offline'; // Make status optional or provide default
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    timestamp: Date;
}

export interface DirectMessage extends ChatMessage {
    to?: string;
    isPrivate?: boolean;
}