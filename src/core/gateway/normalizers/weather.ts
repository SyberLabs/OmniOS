// ============================================
// PROJECT OMNI: OPENWEATHERMAP NORMALIZER
// Converts OpenWeatherMap API responses to OmniData
// ============================================

import {
    ApiTypeDefinition,
    OmniData,
    OmniMetrics,
    createOmniData,
    createOmniError
} from '../omnidata.schema';

/**
 * Raw OpenWeatherMap current weather response
 */
interface WeatherRawResponse {
    coord?: { lon: number; lat: number };
    weather?: Array<{ id: number; main: string; description: string; icon: string }>;
    main?: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
    };
    visibility?: number;
    wind?: { speed: number; deg: number };
    clouds?: { all: number };
    dt?: number;
    sys?: { country: string; sunrise: number; sunset: number };
    timezone?: number;
    name?: string;
    cod?: number | string;
    message?: string;
}

/**
 * OpenWeatherMap API normalizer
 */
export const weatherNormalizer: ApiTypeDefinition<WeatherRawResponse> = {
    category: 'weather',
    displayName: 'OpenWeatherMap',
    cacheTtlMs: 10 * 60 * 1000,  // 10 minutes cache
    rateLimitMs: 1000,           // 1 second between calls

    fetchFn: async (apiKey, params) => {
        if (!apiKey) {
            return {
                cod: 401,
                message: 'OpenWeatherMap requires an API key. Add one in the API Dashboard.'
            };
        }

        const city = (params?.city as string) || 'London';
        const units = (params?.units as string) || 'metric';

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                cod: 500,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    normalizeFn: (raw) => {
        if (raw.cod !== 200 && raw.cod !== '200') {
            return createOmniError('weather', 'weather', {
                code: String(raw.cod || 'UNKNOWN'),
                message: raw.message || 'Weather API error',
                retryable: raw.cod !== 401
            });
        }

        const metrics: OmniMetrics = {
            values: {
                temperature: raw.main?.temp || 0,
                feelsLike: raw.main?.feels_like || 0,
                tempMin: raw.main?.temp_min || 0,
                tempMax: raw.main?.temp_max || 0,
                humidity: raw.main?.humidity || 0,
                pressure: raw.main?.pressure || 0,
                visibility: (raw.visibility || 0) / 1000,  // Convert to km
                windSpeed: raw.wind?.speed || 0,
                windDeg: raw.wind?.deg || 0,
                clouds: raw.clouds?.all || 0
            },
            timestamp: (raw.dt || Math.floor(Date.now() / 1000)) * 1000
        };

        // Also create an item for easy display
        const weatherItem = {
            id: `weather-${raw.name}-${raw.dt}`,
            title: `${raw.name}, ${raw.sys?.country}`,
            description: raw.weather?.[0]?.description || 'Unknown conditions',
            image: raw.weather?.[0]?.icon
                ? `https://openweathermap.org/img/wn/${raw.weather[0].icon}@2x.png`
                : undefined,
            timestamp: (raw.dt || Math.floor(Date.now() / 1000)) * 1000,
            tags: ['weather', raw.weather?.[0]?.main || 'Unknown'],
            metadata: {
                condition: raw.weather?.[0]?.main,
                icon: raw.weather?.[0]?.icon,
                sunrise: raw.sys?.sunrise,
                sunset: raw.sys?.sunset,
                timezone: raw.timezone,
                coordinates: raw.coord
            }
        };

        return createOmniData('weather', 'weather', {
            items: [weatherItem],
            metrics
        }, 10 * 60 * 1000);
    }
};

export default weatherNormalizer;
