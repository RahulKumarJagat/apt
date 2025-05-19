export interface ChatMessage {
    id: string;
    sender: {
        id: string;
        name: string;
    };
    content: string;
    timestamp: Date;
}

export interface RoomUser {
    userId: string;
    userName: string;
}