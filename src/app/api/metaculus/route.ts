import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const searchQuery = searchParams.get('search') || '';

    // Construct Metaculus API URL
    // We use the questions endpoint
    let apiUrl = `https://www.metaculus.com/api2/questions/?limit=${limit}&order_by=-activity`;

    if (searchQuery) {
        apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
    }

    try {
        console.log(`[API] Fetching Metaculus data: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                // Add any necessary headers here
            },
            next: { revalidate: 60 } // Cache for 1 minute server-side
        });

        if (!response.ok) {
            // Expected upstream condition (Metaculus 403s unauthenticated traffic).
            // Pass the status through; the client surfaces it as block state.
            return NextResponse.json(
                { error: `Metaculus API responded with ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Return successful response
        return NextResponse.json(data);

    } catch (error) {
        console.error('[API] Metaculus proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from Metaculus' },
            { status: 500 }
        );
    }
}
