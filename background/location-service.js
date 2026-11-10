/**
 * Leafly - Location Service
 * Manages active user coordinates with privacy consent controls.
 */

import { storage } from '../shared/storage.js';
import { DEFAULT_LOCATION } from '../shared/defaults.js';

export class LocationService {
  async getCurrentLocation() {
    return await storage.getLocation();
  }

  async setManualLocation(locationData) {
    if (!locationData || typeof locationData.latitude !== 'number' || typeof locationData.longitude !== 'number') {
      throw new Error('Invalid location coordinates');
    }

    const newLoc = {
      name: locationData.name || 'Custom Location',
      country: locationData.country || '',
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      isAuto: false,
    };

    return await storage.saveLocation(newLoc);
  }

  async setAutoLocation(coords, name = 'Current Location') {
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Invalid auto coordinates');
    }

    const newLoc = {
      name: name,
      country: '',
      latitude: coords.latitude,
      longitude: coords.longitude,
      isAuto: true,
    };

    return await storage.saveLocation(newLoc);
  }

  async resetLocation() {
    return await storage.saveLocation(DEFAULT_LOCATION);
  }
}

export const locationService = new LocationService();

