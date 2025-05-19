import { useState, useEffect } from 'react';
import { socket } from '@/services/socket';
import { ChatMessage } from '@/types/room';

interface UseRoomChatProps {
    roomId: string;
    userName: string;
}

export function useRoomChat({ roomId, userName }: UseRoomChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        socket.emit('room:join', { roomId, userName });

        socket.on('room:message', (data) => {
            const newMessage: ChatMessage = {
                id: `${data.userId}-${Date.now()}`,
                sender: {
                    id: data.userId,
                    name: data.userName
                },
                content: data.message,
                timestamp: new Date(data.timestamp)
            };
            setMessages(prev => [...prev, newMessage]);
        });

        return () => {
            socket.off('room:message');
            socket.emit('room:leave', roomId);
        };
    }, [roomId, userName]);

    const sendMessage = (content: string) => {
        socket.emit('room:message', {
            roomId,
            message: content
        });
    };

    return { messages, sendMessage };
}