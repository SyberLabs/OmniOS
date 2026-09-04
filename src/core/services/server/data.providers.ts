// ============================================
// PROJECT OMNI: KEYED DATA PROVIDERS (server-only)
//
// The providers that need an API key. Their keys are read from
// process.env here and never reach the browser — the same posture the LLM
// path has always had, finally applied to the data path.
//
// Each provider owns three things:
//   env          which variable holds its key
//   buildRequest how to call upstream with that key
//   missingKey   the provider's OWN error shape when no key is configured,
//                so the existing normalizeFn keeps working untouched
//
// The response body is returned to the client verbatim. Normalizers parse
// exactly what they parsed before; only the hop changed.
// ============================================

import 'server-only';

export type KeyedProviderId = 'fred' | 'bls' | 'alpha_vantage' | 'newsapi' | 'metaculus';

export const KEYED_PROVIDERS: KeyedProviderId[] = ['fred', 'bls', 'alpha_vantage', 'newsapi', 'metaculus'];

export function isKeyedProvider(id: string): id is KeyedProviderId {
    return (KEYED_PROVIDERS as string[]).includes(id);
}

type Params = Record<string, string | undefined>;

interface UpstreamRequest {
    url: string;
    init?: RequestInit;
}

interface ProviderDef {
    env: string;
    /** The provider's native "no key" body, so normalizeFn is unchanged. */
    missingKey: () => unknown;
    buildRequest: (params: Params, key: string) => UpstreamRequest;
}

function str(params: Params, ...keys: string[]): string | undefined {
    for (const k of keys) {
        const v = params[k];
        if (v !== undefined && v !== '') return v;
    }
    return undefined;
}

const PROVIDERS: Record<KeyedProviderId, ProviderDef> = {
    fred: {
        env: 'FRED_API_KEY',
        missingKey: () => ({
            error_message: 'FRED requires an API key. Set FRED_API_KEY in .env.'
        }),
        buildRequest: (params, key) => {
            const url = new URL('https://api.stlouisfed.org/fred/series/observations');
            url.searchParams.set('series_id', str(params, 'seriesId', 'series_id') ?? 'GDP');
            url.searchParams.set('file_type', 'json');
            url.searchParams.set('limit', str(params, 'limit') ?? '24');
            url.searchParams.set('sort_order', str(params, 'sortOrder', 'sort_order') ?? 'desc');
            url.searchParams.set('api_key', key);

            const start = str(params, 'observationStart', 'observation_start');
            const end = str(params, 'observationEnd', 'observation_end');
            if (start) url.searchParams.set('observation_start', start);
            if (end) url.searchParams.set('observation_end', end);

            return { url: url.toString() };
        }
    },

    bls: {
        env: 'BLS_API_KEY',
        missingKey: () => ({
            status: 'REQUEST_FAILED',
            message: ['BLS requires an API key. Set BLS_API_KEY in .env.']
        }),
        buildRequest: (params, key) => {
            const year = new Date().getFullYear();
            return {
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                init: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        seriesid: [str(params, 'seriesId', 'series_id') ?? 'LNS14000000'],
                        startyear: str(params, 'startYear', 'start_year') ?? String(year - 5),
                        endyear: str(params, 'endYear', 'end_year') ?? String(year),
                        registrationkey: key
                    })
                }
            };
        }
    },

    alpha_vantage: {
        env: 'ALPHA_VANTAGE_API_KEY',
        missingKey: () => ({
            'Error Message':
                'Alpha Vantage requires an API key. Set ALPHA_VANTAGE_API_KEY in .env.'
        }),
        buildRequest: (params, key) => {
            const url = new URL('https://www.alphavantage.co/query');
            url.searchParams.set('function', str(params, 'function') ?? 'GLOBAL_QUOTE');
            url.searchParams.set('symbol', str(params, 'symbol') ?? 'IBM');
            url.searchParams.set('apikey', key);
            return { url: url.toString() };
        }
    },

    newsapi: {
        env: 'NEWSAPI_KEY',
        missingKey: () => ({
            status: 'error',
            code: 'NO_API_KEY',
            message: 'NewsAPI requires an API key. Set NEWSAPI_KEY in .env.'
        }),
        buildRequest: (params, key) => {
            const query = str(params, 'query') ?? 'technology';
            const pageSize = str(params, 'pageSize') ?? '20';
            const everything = str(params, 'endpoint') === 'everything';

            const url = new URL(
                everything
                    ? 'https://newsapi.org/v2/everything'
                    : 'https://newsapi.org/v2/top-headlines'
            );
            url.searchParams.set('pageSize', pageSize);
            if (everything) {
                url.searchParams.set('q', query);
            } else {
                url.searchParams.set('country', str(params, 'country') ?? 'us');
                if (query && query !== 'technology') url.searchParams.set('q', query);
            }

            // NewsAPI accepts the key as a header, which keeps it out of the
            // URL and therefore out of any upstream access log we don't own.
            return { url: url.toString(), init: { headers: { 'X-Api-Key': key } } };
        }
    },

    metaculus: {
        env: 'METACULUS_API_KEY',
        // normalizeFn reads `raw.error` — keep that shape so the client
        // path does not need a second missing-key branch.
        missingKey: () => ({
            error: 'Metaculus requires an API key. Set METACULUS_API_KEY in .env.'
        }),
        buildRequest: (params, key) => {
            const url = new URL('https://www.metaculus.com/api/posts/');
            url.searchParams.set('limit', str(params, 'limit') ?? '20');
            const search = str(params, 'search');
            if (search) url.searchParams.set('search', search);
            // Documented scheme: `Authorization: Token <token>`. Never the query string.
            return {
                url: url.toString(),
                init: { headers: { Authorization: `Token ${key}` } }
            };
        }
    }
};

export interface ProxyResult {
    status: number;
    body: unknown;
}

/**
 * Fetch one keyed provider server-side. Never throws — upstream failures come
 * back as the provider's own error shape so the client normalizer is unchanged.
 */
export async function fetchKeyedProvider(
    id: KeyedProviderId,
    params: Params
): Promise<ProxyResult> {
    const def = PROVIDERS[id];
    const key = process.env[def.env];

    if (!key) {
        // 200, not 401: this is a configuration state the block renders as a
        // setup prompt, not a transport failure.
        return { status: 200, body: def.missingKey() };
    }

    try {
        const { url, init } = def.buildRequest(params, key);
        const res = await fetch(url, { ...init, cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (body === null) {
            return { status: 502, body: { error: `${id} returned a non-JSON response` } };
        }
        return { status: 200, body };
    } catch {
        // Do not echo error.message: undici/node may include the request URL,
        // and FRED/Alpha Vantage put the key in that URL.
        return { status: 502, body: { error: `${id} request failed` } };
    }
}
