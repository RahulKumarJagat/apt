import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_WS_URL, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
        token: localStorage.getItem('token')
    }
});

export interface ServerToClientEvents {
    'user:joined': (data: { userId: string; userName: string }) => void;
    'user:left': (data: { userId: string }) => void;
    'room:message': (data: { userId: string; userName: string; message: string; timestamp: string }) => void;
    'room:users': (users: { userId: string; userName: string }[]) => void;
}

export interface ClientToServerEvents {
    'room:join': (data: { roomId: string; userName: string }) => void;
    'room:leave': (roomId: string) => void;
    'room:message': (data: { roomId: string; message: string }) => void;
}

export type Socket = ReturnType<typeof io>;
