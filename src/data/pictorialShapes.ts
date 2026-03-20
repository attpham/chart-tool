import { PictorialShape } from '../types/chart';

export interface PictorialShapeDef {
  path: string;
  viewBox: string;
  label: string;
}

export const PICTORIAL_SHAPES: Record<PictorialShape, PictorialShapeDef> = {
  person: {
    path: 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
    viewBox: '0 0 24 24',
    label: 'Person',
  },
  smiley: {
    path: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2.5 7.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm5 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm.25 5.5H9.25a.75.75 0 000 1.5c.69 1.07 1.67 1.5 2.75 1.5s2.06-.43 2.75-1.5a.75.75 0 000-1.5z',
    viewBox: '0 0 24 24',
    label: 'Smiley',
  },
  star: {
    path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    viewBox: '0 0 24 24',
    label: 'Star',
  },
  heart: {
    path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    viewBox: '0 0 24 24',
    label: 'Heart',
  },
  thumbsUp: {
    path: 'M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.88v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 2 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2l-.01-.02.01-.1z',
    viewBox: '0 0 24 24',
    label: 'Thumbs Up',
  },
};
