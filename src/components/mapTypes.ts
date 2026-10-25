export interface MapMarker {
  lat: number;
  lng: number;
  colorVar: string;
  title: string;
  key: string;
}
export interface MapLine {
  points: [number, number][];
  colorVar: string;
}
