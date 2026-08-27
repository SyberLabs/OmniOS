import {
    LOOP_BUTTON_ID,
    LOOP_BUTTON_NAME,
    LOOP_IDLE,
    LOOP_READY,
    LOOP_STATE_ID,
    surfaceLoopNavigateOnclick
} from '@/core/agent/surfaceLoop';
import SurfaceClient from './SurfaceClient';

export const dynamic = 'force-dynamic';

export default async function SurfacePage({
    searchParams
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const raw = params.loop;
    const flag = Array.isArray(raw) ? raw[0] : raw;
    const loop = flag === 'ready' ? LOOP_READY : LOOP_IDLE;
    return (
        <>
            <div
                className="border-b border-[var(--citadel-border)] px-6 py-2 text-xs text-[var(--text-secondary)] flex items-center gap-3"
                dangerouslySetInnerHTML={{
                    __html:
                        `<p id="${LOOP_STATE_ID}">${loop}</p>` +
                        `<button id="${LOOP_BUTTON_ID}" type="button" onclick="${surfaceLoopNavigateOnclick()}">${LOOP_BUTTON_NAME}</button>`
                }}
            />
            <SurfaceClient />
        </>
    );
}
