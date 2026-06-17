
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Parse args
const args = process.argv.slice(2);
const urlArg = args.find(a => a.startsWith('--url='));
const headerArgs = args.filter(a => a.startsWith('--header='));

if (!urlArg) {
    console.error('❌ Usage: npm run inspect-api -- --url="<api-url>" [--header="Key: Value"]');
    process.exit(1);
}

const url = urlArg.split('=')[1];
const headers: Record<string, string> = {};

headerArgs.forEach(h => {
    const parts = h.split('=')[1].split(':');
    if (parts.length >= 2) {
        headers[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
});

async function run() {
    console.log(`\n🔍 Inspecting API: ${url}`);
    if (Object.keys(headers).length > 0) {
        console.log('🔑 Headers:', headers);
    }

    try {
        const res = await fetch(url, { headers });
        console.log(`📡 Status: ${res.status} ${res.statusText}`);

        if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const hostname = new URL(url).hostname.replace(/\./g, '_');
        const filename = `api_dump_${hostname}_${timestamp}.json`;

        // Ensure .api_dumps dir exists
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const dumpDir = path.join(__dirname, '..', '.api_dumps');

        if (!fs.existsSync(dumpDir)) {
            fs.mkdirSync(dumpDir, { recursive: true });
        }

        const filePath = path.join(dumpDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        console.log(`\n✅ Data saved to: ${filePath}`);
        console.log(`📊 Response Type: ${Array.isArray(data) ? 'Array' : typeof data}`);

        if (typeof data === 'object' && data !== null) {
            console.log('🔑 Top-level keys:', Object.keys(data).join(', '));
            if (Array.isArray(data) && data.length > 0) {
                console.log('🔑 Item keys (first item):', Object.keys(data[0]).join(', '));
            } else if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                console.log('🔑 Item keys (results[0]):', Object.keys(data.results[0]).join(', '));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

run();
