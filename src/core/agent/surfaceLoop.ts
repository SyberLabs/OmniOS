// ============================================
// Tiny keyless control on the product page (/surface).
// Same ids/text in the React page and the HTTP loop test.
// ============================================

export const LOOP_BUTTON_ID = 'omni-loop-mark';
export const LOOP_STATE_ID = 'omni-loop-state';
export const LOOP_BUTTON_NAME = 'Mark ready';
export const LOOP_IDLE = 'loop: idle';
export const LOOP_READY = 'loop: ready';

export function surfaceLoopOnclickAttr(): string {
    return `document.getElementById('${LOOP_STATE_ID}').textContent='${LOOP_READY}'`;
}

export function surfaceLoopNavigateOnclick(): string {
    return `window.location='/surface?loop=ready'`;
}

export function surfaceLoopBindScript(): string {
    return (
        `(function(){` +
        `function state(){` +
        `var s=document.getElementById('${LOOP_STATE_ID}');` +
        `if(s)return s;` +
        `s=document.createElement('p');` +
        `s.id='${LOOP_STATE_ID}';` +
        `s.textContent='${LOOP_IDLE}';` +
        `document.body.appendChild(s);` +
        `return s;` +
        `}` +
        `state();` +
        `document.addEventListener('click',function(ev){` +
        `var t=ev.target;` +
        `if(!t||t.id!=='${LOOP_BUTTON_ID}')return;` +
        `state().textContent='${LOOP_READY}';` +
        `});` +
        `})();`
    );
}

export function surfaceLoopControlHtml(): string {
    return (
        `<p id="${LOOP_STATE_ID}">${LOOP_IDLE}</p>` +
        `<button id="${LOOP_BUTTON_ID}" type="button" onclick="${surfaceLoopOnclickAttr()}">${LOOP_BUTTON_NAME}</button>` +
        `<script>${surfaceLoopBindScript()}</script>`
    );
}

export function surfaceLoopDocument(): string {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Keyless agent surface</title>
</head>
<body>
    <p>OmniOS · product</p>
    <h1>Keyless agent surface</h1>
    <p>This is the product: local tabs, action refs, and a PNG screenshot. No API key.</p>
    ${surfaceLoopControlHtml()}
</body>
</html>`;
}
