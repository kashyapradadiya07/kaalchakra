declare module 'astronomia' {
  export const julian: any;
}
declare module 'astronomia/planetposition' {
  export class Planet {
    constructor(data: any);
    position(jde: number): { lat: number; lon: number; range: number };
  }
}
declare module 'astronomia/moonposition' {
  export function position(jde: number): { lat: number; lon: number; range: number };
  export function node(jde: number): number;
}
declare module 'astronomia/data/vsop87Bearth';
declare module 'astronomia/data/vsop87Bmercury';
declare module 'astronomia/data/vsop87Bvenus';
declare module 'astronomia/data/vsop87Bmars';
declare module 'astronomia/data/vsop87Bjupiter';
declare module 'astronomia/data/vsop87Bsaturn';
