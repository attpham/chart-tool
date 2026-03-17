export type PaletteId = 'refactor' | 'devex' | 'copilot' | 'security';

export const SEMANTIC_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  gray3: '#C4CCC6',
  gray9: '#121613',
} as const;

export interface ColorPalette {
  id: PaletteId;
  name: string;
  colors: string[];
}

export const PALETTES: ColorPalette[] = [
  {
    id: 'refactor',
    name: 'Refactor',
    colors: ['#0FBF3E', '#8CF2A6', '#BFFFD1', '#5FED83', '#08872B', '#0A241B'],
  },
  {
    id: 'devex',
    name: 'DevEx',
    colors: [
      '#BFFFD1', '#8CF2A6', '#5FED83', '#0FBF3E', '#08872B', '#0A241B',
      '#FFC8FE', '#FF80D2', '#FF4AC0', '#CA2186', '#952866', '#30081F',
    ],
  },
  {
    id: 'copilot',
    name: 'Copilot',
    colors: [
      '#C898FD', '#B870FF', '#8534F3', '#43179E', '#26115F', '#160048',
      '#F4A876', '#F08A3A', '#FE4C25', '#C53211', '#801E0F', '#500A00',
    ],
  },
  {
    id: 'security',
    name: 'Security',
    colors: [
      '#9EECFF', '#3094FF', '#1A61FE', '#0527FC', '#212183', '#001C4D',
      '#DCFF96', '#D3FA37', '#D8BD0E', '#DB9D00', '#D67200', '#703100',
    ],
  },
];

export const PALETTE_MAP: Record<PaletteId, ColorPalette> = Object.fromEntries(
  PALETTES.map(p => [p.id, p])
) as Record<PaletteId, ColorPalette>;
