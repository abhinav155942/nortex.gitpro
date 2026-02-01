import { atom } from 'nanostores';

export type PreviewAction = 'back' | 'forward' | 'reload';

export const previewControlSignal = atom<{ action: PreviewAction; id: string } | null>(null);
