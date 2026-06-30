import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface PlaceDetailsResult {
  name?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  workingHours?: Record<string, string>;
  photoUrl?: string;
}

// Thin wrapper around the Google Places API used for "import from Google
// Maps" when creating a restaurant (TOR section 6, variant 2).
@Injectable()
export class GooglePlacesService {
  constructor(private readonly config: ConfigService) {}

  async findPlaceDetails(name: string, address: string): Promise<PlaceDetailsResult> {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      // No key configured: fall back to whatever the user typed so the
      // "manual" flow still works without a Google integration.
      return { name, address };
    }

    const searchResp = await axios.get(
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
      {
        params: {
          input: `${name} ${address}`,
          inputtype: 'textquery',
          fields: 'place_id',
          key: apiKey,
        },
      },
    );

    const placeId = searchResp.data?.candidates?.[0]?.place_id;
    if (!placeId) return { name, address };

    const detailsResp = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields:
            'name,formatted_address,formatted_phone_number,geometry,opening_hours,photos',
          key: apiKey,
        },
      },
    );

    const result = detailsResp.data?.result ?? {};
    const photoRef = result.photos?.[0]?.photo_reference;

    return {
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number,
      latitude: result.geometry?.location?.lat,
      longitude: result.geometry?.location?.lng,
      workingHours: result.opening_hours?.weekday_text
        ? Object.fromEntries(
            result.opening_hours.weekday_text.map((line: string, i: number) => [
              String(i),
              line,
            ]),
          )
        : undefined,
      photoUrl: photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
        : undefined,
    };
  }
}
