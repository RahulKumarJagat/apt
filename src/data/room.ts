import { atom } from 'jotai';

// State atoms for room controls
export const micAtom = atom<boolean>(true);
export const cameraAtom = atom<boolean>(true);
export const screenShareAtom = atom<boolean>(false);
export const chatAtom = atom<boolean>(false);
export const recordingAtom = atom<boolean>(false);
export const participantsAtom = atom<boolean>(false);

// Room data atoms
export const roomConnectionStatusAtom = atom<'connecting' | 'connected' | 'disconnected'>('disconnected');
export const roomErrorAtom = atom<string | null>(null);
export const roomParticipantsAtom = atom<string[]>([]);

// Chat message type
export type ChatMessage = {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
};

// Chat messages atom
export const chatMessagesAtom = atom<ChatMessage[]>([]);
