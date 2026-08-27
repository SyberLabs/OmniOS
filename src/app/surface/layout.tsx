import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'OmniOS · keyless agent surface',
    description:
        'Product entry: local tabs, action refs, and PNG screenshots. No API key. Contract at /api/agent.'
};

export default function SurfaceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
