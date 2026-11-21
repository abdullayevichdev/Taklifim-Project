/** Uzbekistan cities used to focus venue search (Namangan first: the site's home region). */
export interface UzCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const DEFAULT_CITY_ID = 'namangan';

export const UZ_CITIES: UzCity[] = [
  { id: 'namangan', name: 'Namangan', lat: 40.9983, lng: 71.6726 },
  { id: 'chust', name: 'Chust', lat: 41.0033, lng: 71.2372 },
  { id: 'kosonsoy', name: 'Kosonsoy', lat: 41.2496, lng: 71.5486 },
  { id: 'chortoq', name: 'Chortoq', lat: 41.0692, lng: 71.8237 },
  { id: 'pop', name: 'Pop', lat: 40.8736, lng: 71.1089 },
  { id: 'uchqorgon', name: 'Uchqo‘rg‘on', lat: 41.1136, lng: 72.0792 },
  { id: 'andijon', name: 'Andijon', lat: 40.7821, lng: 72.3442 },
  { id: 'fargona', name: 'Farg‘ona', lat: 40.3864, lng: 71.7864 },
  { id: 'qoqon', name: 'Qo‘qon', lat: 40.5286, lng: 70.9425 },
  { id: 'toshkent', name: 'Toshkent', lat: 41.2995, lng: 69.2401 },
  { id: 'samarqand', name: 'Samarqand', lat: 39.6542, lng: 66.9597 },
  { id: 'buxoro', name: 'Buxoro', lat: 39.7681, lng: 64.4556 },
  { id: 'jizzax', name: 'Jizzax', lat: 40.1158, lng: 67.8422 },
  { id: 'guliston', name: 'Guliston', lat: 40.4897, lng: 68.7842 },
  { id: 'navoiy', name: 'Navoiy', lat: 40.0844, lng: 65.3792 },
  { id: 'qarshi', name: 'Qarshi', lat: 38.8606, lng: 65.7891 },
  { id: 'termiz', name: 'Termiz', lat: 37.2242, lng: 67.2783 },
  { id: 'urganch', name: 'Urganch', lat: 41.5506, lng: 60.6317 },
  { id: 'nukus', name: 'Nukus', lat: 42.46, lng: 59.61 },
];

/** Great-circle distance in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
