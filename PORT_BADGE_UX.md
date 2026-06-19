# Port Badge UX Design - Implementation Guide

**Date:** January 12, 2026
**Status:** ✅ Implemented
**Design:** Option 4 - Icon-Only Minimal Badges

---

## Design Philosophy

Port badges should be:
- **Unobtrusive** - Don't clutter the block UI
- **Discoverable** - Easy to find when needed
- **Intuitive** - Align with actual wire connection points
- **Informative** - Rich details on hover

---

## Visual Layout

### Compact Icon-Only Design

```
🔌  ┌─────────────────────────┐  📝
    │ ○                     ○ │  ②  ← Connection count
    │                         │
    │   Analyst Persona       │
    │                         │
    │ ○                     ○ │
    └─────────────────────────┘

    Input (left)          Output (right)
    Gray 🔌 ANY          Green 📝 TEXT
```

### Multi-Port Stacking

When a block has multiple ports, they stack vertically:

```
🔌  ┌─────────────────────────┐  📝
🔷  │ ○                     ○ │  ②
    │                         │
    │   Advanced Block        │
    │                         │
    │ ○                     ○ │
    └─────────────────────────┘

    2 Inputs              1 Output
    (ANY + JSON)          (TEXT with 2 connections)
```

---

## Component Architecture

### PortBadge Component

**Variants:**
1. **`compact`** (default) - Icon-only with connection count
2. **`full`** - Original design with type label

**Props:**
```typescript
interface PortBadgeProps {
    port: PortSchema;           // Port configuration
    connectionCount?: number;   // Active wire count
    onClick?: () => void;       // Click handler (future: config panel)
    className?: string;         // Additional styling
    variant?: 'full' | 'compact';  // Display mode
    side?: 'left' | 'right';    // Tooltip direction
}
```

### Positioning

**Left Edge (Inputs):**
```tsx
<div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
    {inputPorts.map(port => (
        <PortBadge port={port} variant="compact" side="left" />
    ))}
</div>
```

**Right Edge (Outputs):**
```tsx
<div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
    {outputPorts.map(port => (
        <PortBadge port={port} variant="compact" side="right" />
    ))}
</div>
```

---

## Interaction Design

### Default State

- **Icon visible** - Port type emoji (🔌🔷📝🎨)
- **Transparent background** - Minimal visual footprint
- **Connection count** - Small badge if wired

### Hover State

- **Background tint** - Subtle color wash (25% opacity)
- **Scale up** - 1.15x for emphasis
- **Tooltip appears** - Slides in from the side (150ms)

### Click State (Future Phase)

- **Scale down** - 0.9x for tactile feedback
- **Opens config panel** - Port configuration UI
- **Shows wire management** - Connect/disconnect tools

---

## Tooltip Design

### Positioning

**For Left-Side Badges (Inputs):**
```
      ┌──────────────────┐
      │ 🔌 Any Input     │ ← Tooltip slides from left
      │ • Data Input     │
      │ • Type: any      │
      │ • 0 connections  │
      └────────┬─────────┘
               │
            🔌 │ ← Badge
```

**For Right-Side Badges (Outputs):**
```
                         ┌──────────────────┐
       Tooltip slides → │ 📝 Text Output   │
                        │ • Analysis       │
                        │ • Type: text     │
                        │ ✓ 2 connections  │
                        └─────────┬────────┘
                                  │
                              📝② │ ← Badge
```

### Tooltip Content

```typescript
{
    header: `${icon} ${typeLabel} ${direction}`,
    details: [
        port.label,           // Human-readable name
        port.description,     // What this port does
        `Type: ${dataType}`,  // Port data type
        connectionInfo,       // Wire count
        clickHint            // "→ Click to configure"
    ]
}
```

### Visual Style

- **Dark background** - `rgba(0, 0, 0, 0.95)` for high contrast
- **Colored border** - Matches port type color (60% opacity)
- **Backdrop blur** - `backdrop-blur-xl` for depth
- **Shadow** - `shadow-xl` for elevation
- **Font size** - `11px` for compact readability

---

## Port Type Colors

### Color Palette

| Type | Emoji | Hex Color | Usage |
|------|-------|-----------|-------|
| **JSON** | 🔷 | `#3B82F6` (Blue) | Structured data (API blocks) |
| **TEXT** | 📝 | `#10B981` (Green) | Plain text (Personas, Mind) |
| **MEDIA** | 🎨 | `#8B5CF6` (Purple) | Files, images, PDFs (future) |
| **ANY** | 🔌 | `#6B7280` (Gray) | Accepts all types (Personas) |

### Color Application

**Icon Tint:**
```typescript
style={{ color: typeConfig.color }}
```

**Hover Background:**
```typescript
backgroundColor: isHovered ? `${typeConfig.color}25` : 'transparent'
```

**Connection Badge:**
```typescript
style={{
    backgroundColor: typeConfig.color,
    color: '#000'  // Black text for contrast
}}
```

**Tooltip Border:**
```typescript
borderColor: `${typeConfig.color}60`
```

---

## Block Examples

### Data Source Block (Polymarket)

```
┌─────────────────────────┐  🔷
│    📊 Polymarket        │
│                         │
│  Live prediction odds   │
│                         │
└─────────────────────────┘

Right edge: 🔷 JSON output
```

### AI Persona Block (Analyst)

```
🔌  ┌─────────────────────────┐  📝
    │    🧠 Analyst           │  ②
    │                         │
    │  Analyzes market data   │
    │                         │
    └─────────────────────────┘

Left: 🔌 ANY input (accepts all types)
Right: 📝 TEXT output (2 connections)
```

### Workspace Block (Mind Chat)

```
🔌  ┌─────────────────────────┐  📝
    │    💬 Mind Chat         │
    │                         │
    │  AI conversation        │
    │                         │
    └─────────────────────────┘

Left: 🔌 ANY input (optional context)
Right: 📝 TEXT output (conversation)
```

---

## Alignment with WireHandles

### WireHandle Positioning

The existing `WireHandle` components are positioned:

```tsx
<WireHandle blockId={block.id} side="left" />   // Left edge
<WireHandle blockId={block.id} side="right" />  // Right edge
```

### Badge Alignment Strategy

Port badges are positioned **vertically centered** on the same edges:

```
     ○ ← WireHandle (top-left)
🔌      ← PortBadge (center-left)
     ○ ← WireHandle (bottom-left)
```

**Why this works:**
- WireHandles are for **dragging** wire creation
- PortBadges are for **information** and configuration
- Both on same edge = clear mental model
- Vertical separation = no overlap

---

## Responsive Behavior

### Narrow Blocks

For blocks narrower than 200px:
- Badges remain visible (don't hide)
- Icons scale slightly smaller
- Tooltips adjust to fit viewport

### Tall Blocks

For blocks taller than 400px:
- Multiple ports spread out vertically
- Each port stays near its logical position
- Gap between badges increases

### Dragging State

When block is being dragged:
- Badges remain visible
- Tooltips auto-hide
- Visual feedback on compatible targets (Phase 2)

---

## Animation Details

### Badge Hover Animation

```typescript
whileHover={{ scale: 1.15 }}  // 15% larger
whileTap={{ scale: 0.9 }}     // 10% smaller on click
```

**Timing:**
- Hover scale: Instant (uses browser's default)
- Background fade: CSS transition 150ms

### Tooltip Animation

```typescript
initial={{ opacity: 0, x: direction === 'left' ? -8 : 8 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: direction === 'left' ? -8 : 8 }}
transition={{ duration: 0.15 }}  // 150ms
```

**Motion:**
- Slides in from the side (8px offset)
- Fades in simultaneously
- 150ms total duration
- Smooth ease curve

### Connection Count Badge

```typescript
initial={{ scale: 0 }}
animate={{ scale: 1 }}
```

**Appears when:**
- Wire is connected
- Pops in with scale animation
- No delay

---

## Accessibility

### Keyboard Navigation

**Future enhancement:**
```typescript
onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        onClick?.();
    }
}}
tabIndex={0}
```

### Screen Readers

**Future enhancement:**
```typescript
aria-label={`${port.label || port.id}: ${port.dataType} ${port.direction}`}
role="button"
```

### Color Blindness

- Icons provide semantic meaning (not just color)
- High contrast tooltip text
- Color + icon combination

---

## Performance Optimizations

### Render Optimization

**Current:**
- Component re-renders only when port/count changes
- Framer Motion handles animation efficiently
- No expensive computations

**Tooltip Lazy Rendering:**
```tsx
<AnimatePresence>
    {isHovered && <Tooltip />}  // Only renders when needed
</AnimatePresence>
```

### GPU Acceleration

All animations use transform/opacity:
```typescript
transform: translateY(-50%)  // GPU-accelerated
opacity: 0 → 1              // GPU-accelerated
```

No layout thrashing from width/height changes.

---

## Future Enhancements

### Phase 2: Drag & Drop

**Visual feedback when dragging:**
```
User drags from 🔷 JSON output
    ↓
Highlight compatible inputs
    ✅ 🔌 ANY (compatible)
    ✅ 📝 TEXT (auto-convert)
    ❌ 🎨 MEDIA (incompatible)
```

### Phase 3: Configuration Panel

**Click badge to open panel:**
```
┌─────────────────────────┐
│ Port Configuration      │
├─────────────────────────┤
│ 📝 Text Output          │
│                         │
│ ✓ 2 Connections:        │
│   → Analyst Persona     │
│   → Mind Chat           │
│                         │
│ [Disconnect All]        │
│ [Advanced Settings]     │
└─────────────────────────┘
```

### Phase 4: Smart Routing

**Visualize data flow:**
- Animated particles along wires
- Color-coded by data type
- Show data transfer events

---

## Implementation Checklist

### ✅ Completed

- [x] Compact badge variant with icon-only design
- [x] Left/right edge positioning
- [x] Connection count indicators
- [x] Hover tooltips with rich details
- [x] Type-based color coding
- [x] Smooth animations (hover, tooltip)
- [x] TypeScript type safety
- [x] Zero compilation errors

### 🔄 In Progress

- [ ] Browser testing and visual verification
- [ ] Screenshot documentation

### 📋 Planned

- [ ] Drag-drop validation feedback
- [ ] Port configuration panel
- [ ] Wire creation from badge click
- [ ] Keyboard navigation support
- [ ] Screen reader accessibility

---

## Developer Guide

### Adding a New Port Type

1. **Define in schema:**
```typescript
export type PortDataType = 'json' | 'text' | 'media' | 'any' | 'custom';
```

2. **Add to type config:**
```typescript
function getPortTypeConfig(type: PortDataType) {
    // ...
    case 'custom':
        return {
            color: '#FF6B9D',  // Pink
            icon: '⭐',
            label: 'Custom'
        };
}
```

3. **Update compatibility matrix:**
```typescript
function isTypeCompatible(source: PortDataType, target: PortDataType) {
    // Add custom type rules
}
```

### Customizing Badge Appearance

**Per-block customization:**
```tsx
<PortBadge
    port={port}
    variant="compact"
    className="opacity-75"  // Custom styling
    style={{ filter: 'saturate(1.5)' }}  // Custom effects
/>
```

**Global styling:**
```css
.port-badge-compact {
    /* Custom global styles */
    transition: all 0.2s ease;
}
```

---

## Testing

### Visual Tests

1. **Badge Visibility**
   - [ ] Icons visible on left/right edges
   - [ ] Proper vertical centering
   - [ ] No overlap with WireHandles

2. **Hover Interaction**
   - [ ] Tooltip appears on correct side
   - [ ] Smooth animation (150ms)
   - [ ] Readable content

3. **Connection Counts**
   - [ ] Badge appears when wired
   - [ ] Correct number displayed
   - [ ] Updates on wire add/remove

### Functional Tests

1. **Port Detection**
   - [ ] Input ports → left edge
   - [ ] Output ports → right edge
   - [ ] Multiple ports stack vertically

2. **Type Colors**
   - [ ] JSON → Blue 🔷
   - [ ] TEXT → Green 📝
   - [ ] MEDIA → Purple 🎨
   - [ ] ANY → Gray 🔌

3. **Tooltip Content**
   - [ ] Correct port label
   - [ ] Accurate type information
   - [ ] Connection count matches

---

## Summary

The new port badge UX provides:

**✨ User Benefits:**
- Instant visual clarity of block capabilities
- Unobtrusive design that doesn't clutter UI
- Rich information on demand (hover)
- Aligned with wire connection points

**🎨 Design Benefits:**
- Clean, minimal aesthetic
- Icon-based for international clarity
- Color-coded for quick recognition
- Smooth, professional animations

**⚙️ Technical Benefits:**
- Type-safe TypeScript implementation
- GPU-accelerated animations
- Lazy tooltip rendering
- Extensible component API

**Next Steps:**
Test in browser to verify visual alignment and gather user feedback for potential refinements.

---

**Last Updated:** January 12, 2026
**Status:** ✅ Ready for Visual Testing
**Phase:** 1 Complete (Essential UI)
