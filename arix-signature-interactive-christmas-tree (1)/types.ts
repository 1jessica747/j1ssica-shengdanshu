export enum OrnamentType {
  SPHERE = 'SPHERE',
  DIAMOND = 'DIAMOND',
  CUBE = 'CUBE'
}

export interface TreeConfig {
  height: number;
  radius: number;
  particleCount: number;
  spinSpeed: number;
}

export interface WishState {
  isLoading: boolean;
  text: string | null;
  error: string | null;
}
