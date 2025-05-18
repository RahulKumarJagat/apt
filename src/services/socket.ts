import { io } from "socket.io-client";

// Add Participant interface definition
interface Participant {
    id: string;
    name?: string;
    isConnected: boolean;
    stream?: MediaStream;
}

export const socket = io(import.meta.env.VITE_API_URL, {
    autoConnect: false,
    transports: ["websocket"],
});

// Export the events interface so it can be used elsewhere
export interface ServerEvents {
    "user-connected": (userData: { id: string; name?: string }) => void;
    "user-disconnected": (userId: string) => void;
    "participants-list": (participants: Participant[]) => void;
    "user-stream-added": (data: { userId: string; stream: MediaStream }) => void;
}

// Type the socket with the events interface
export type SocketWithServerEvents = typeof socket & {
    on: <K extends keyof ServerEvents>(event: K, listener: ServerEvents[K]) => void;
    emit: <K extends keyof ServerEvents>(event: K, ...args: Parameters<ServerEvents[K]>) => void;
};
