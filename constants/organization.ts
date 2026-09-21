export const AVAILABLE_JOB_TITLES = [
  'Agent commercial',
  'Responsable imprimerie',
  'Responsable librairie et papeterie',
  'Responsable réseau et câblage',
  'Responsable développement',
] as const;

export type JobTitle = (typeof AVAILABLE_JOB_TITLES)[number] | string;

export const AVAILABLE_DEPARTMENTS = [
  'Commercial',
  'Imprimerie',
  'Librairie et Papeterie',
  'Réseau et Câblage',
  'Développement & Informatique',
  'Direction Générale',
] as const;

export type Department = (typeof AVAILABLE_DEPARTMENTS)[number] | string;
