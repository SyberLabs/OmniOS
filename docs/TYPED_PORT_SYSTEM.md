# Typed Port & Wire System - Complete Guide

## Overview

The **Typed Port System** brings type-safe data flow to Omni OS blocks. Every block now defines input and output ports with specific data types, ensuring only compatible connections can be made.

## Core Concepts

### Port Types

```typescript
type PortDataType = 'json' | 'text' | 'media' | 'any';
```

| Type | Description | Example Sources |
|------|-------------|-----------------|
| **json** | Structured data (arrays, objects) | API blocks, Polymarket, NewsAPI |
| **text** | Plain text or Markdown | Text notes, Mind responses |
| **media** | Images, PDFs, files | Media blocks, generated charts |
| **any** | Accepts all types | Mind Chat input, Persona inputs |

### Type Compatibility

```
✅ Direct Match:    json → json
✅ Auto-Convert:    json → text (via JSON.stringify)
✅ Auto-Convert:    text → json (via JSON.parse)
✅ Accept Any:      * → any
❌ No Conversion:   json → media (requires explicit block)
❌ No Conversion:   text → media (requires explicit block)
```

### Port Directions

- **Output Port** (`direction: 'output'`) - Produces data
- **Input Port** (`direction: 'input'`) - Consumes data

### Port Schema

```typescript
interface PortSchema {
  id: string;                 // Unique within block (e.g., 'in', 'out')
  direction: 'input' | 'output';
  dataType: PortDataType;
  label?: string;             // Human-readable label
  accepts?: PortDataType[];   // For inputs: which types accepted
  required?: boolean;         // Whether port must be connected
  description?: string;       // Tooltip description
}
```

## Architecture

```
┌──────────────┐              ┌──────────────┐
│  Polymarket  │              │  Mind Chat   │
│              │              │              │
│  [OUT:json] ─┼─────────────►┼─ [IN:any]   │
│              │  Wire with   │  [OUT:text] ─┼───►
└──────────────┘  validation  └──────────────┘
```

## Implementation

### 1. Block Schema with Ports

```typescript
// In BlockRegistry.ts
import { createJsonOutputPort, createAnyInputPort } from '@/core/services/port.service';

blockRegistry.register({
    block_id: 'polymarket_live_odds',
    display_name: 'Polymarket',
    category: 'truth',
    data_type: 'probabilistic_stream',
    refresh_rate: '1s',
    semantic_tags: ['prediction', 'market'],
    wiring_logic: 'map_to_game_theory_agent',
    ports: [
        createJsonOutputPort('out', 'Market Data')
    ],
    icon: 'TrendingUp',
    description: 'Real-time prediction market odds'
});
```

### 2. Wire Validation

```typescript
import { validateWire } from '@/core/services/port.service';

// Before creating a wire
const validation = validateWire(
    sourceBlockSchema,
    'out',  // source port ID
    targetBlockSchema,
    'in'    // target port ID
);

if (!validation.valid) {
    console.error(validation.error);
    // Show error toast: "Incompatible types: json cannot connect to media"
} else if (validation.requiresConversion) {
    console.log(`Auto-conversion: ${validation.conversionPath}`);
    // Show info toast: "Auto-converting: json → text"
}
```

### 3. Data Conversion

```typescript
import { convertWireData } from '@/core/services/port.service';

// When data flows through a wire
const result = convertWireData(
    data,
    sourcePort,
    targetPort
);

if (result.success) {
    targetBlock.receiveData(result.data);
} else {
    console.error(`Conversion failed: ${result.error}`);
}
```

## Port Helpers

### Create Standard Ports

```typescript
import {
    createJsonOutputPort,
    createTextOutputPort,
    createMediaOutputPort,
    createAnyInputPort,
    createJsonInputPort,
    createTextInputPort
} from '@/core/services/port.service';

// JSON output (for API blocks)
const jsonPort = createJsonOutputPort('out', 'Data Stream');

// Text output (for Mind responses)
const textPort = createTextOutputPort('out', 'Response');

// Any-type input (for Persona blocks)
const anyPort = createAnyInputPort('in', 'Context');

// JSON input that also accepts text
const jsonInPort = createJsonInputPort('in', 'Structured Data', true);

// Text input that also accepts JSON
const textInPort = createTextInputPort('in', 'Text Content', true);
```

### Query Ports

```typescript
import {
    findPort,
    getInputPorts,
    getOutputPorts,
    getDefaultInputPort,
    getDefaultOutputPort
} from '@/core/services/port.service';

// Find a specific port
const port = findPort(blockSchema, 'out');

// Get all inputs
const inputs = getInputPorts(blockSchema);

// Get all outputs
const outputs = getOutputPorts(blockSchema);

// Get default ports
const defaultIn = getDefaultInputPort(blockSchema);   // First 'in' or first input
const defaultOut = getDefaultOutputPort(blockSchema); // First 'out' or first output
```

## Block Port Specifications

### API Blocks (Data Sources)

```typescript
// Polymarket, NewsAPI, CoinGecko
ports: [
    createJsonOutputPort('out', 'Data Stream')
]
```

### Workspace Blocks

```typescript
// Text Note
ports: [
    createTextOutputPort('out', 'Text Content')
]

// Mind Chat
ports: [
    createAnyInputPort('in', 'Context Input'),
    createTextOutputPort('out', 'Conversation')
]

// Code Block (future)
ports: [
    createTextOutputPort('out', 'Code')
]
```

### Persona Blocks (AI Agents)

```typescript
// Analyst, Strategist, Researcher, Creative, Guardian
ports: [
    createAnyInputPort('in', 'Data Input'),
    createTextOutputPort('out', 'Analysis/Strategy/Research/Ideas/Risk Analysis')
]
```

### Media Blocks (future)

```typescript
// Media Gallery
ports: [
    createMediaOutputPort('out', 'Media Files')
]

// Chart Generator
ports: [
    createJsonInputPort('in', 'Chart Data'),
    createMediaOutputPort('out', 'Chart Image')
]

// PDF Generator
ports: [
    createTextInputPort('in', 'Content'),
    createMediaOutputPort('out', 'PDF Document')
]
```

## Wire Creation Flow

### 1. User Interaction

```
User drags from Polymarket [OUT:json] to Mind Chat [IN:any]
    ↓
Canvas detects drop event
    ↓
Validate connection
    ↓
Create wire if valid
```

### 2. Validation Process

```typescript
// Pseudo-code for wire creation
function createWire(sourceBlockId, sourcePortId, targetBlockId, targetPortId) {
    // Get block schemas
    const sourceSchema = blockRegistry.get(sourceBlockId);
    const targetSchema = blockRegistry.get(targetBlockId);

    // Validate
    const validation = validateWire(sourceSchema, sourcePortId, targetSchema, targetPortId);

    if (!validation.valid) {
        showErrorToast(validation.error);
        return null;
    }

    // Show conversion info if needed
    if (validation.requiresConversion) {
        showInfoToast(`Auto-converting: ${validation.conversionPath}`);
    }

    // Create wire
    const wireId = useBlockStore.getState().addConnection({
        sourceBlockId,
        sourcePort: sourcePortId,
        targetBlockId,
        targetPort: targetPortId
    });

    return wireId;
}
```

### 3. Data Flow

```typescript
// When source block updates data
function onSourceDataUpdate(blockId, newData) {
    const connections = useBlockStore.getState().connections;
    const outgoingWires = connections.filter(c => c.sourceBlockId === blockId);

    for (const wire of outgoingWires) {
        // Get port schemas
        const sourcePort = findPort(sourceBlock.schema, wire.sourcePort);
        const targetPort = findPort(targetBlock.schema, wire.targetPort);

        // Convert data if needed
        const result = convertWireData(newData, sourcePort, targetPort);

        if (result.success) {
            // Send to target block
            updateTargetBlock(wire.targetBlockId, result.data);
        } else {
            console.error(`Wire ${wire.id} conversion failed: ${result.error}`);
        }
    }
}
```

## Conversion Rules

### JSON → Text

```typescript
// Input: { "market": "Will Bitcoin reach $100k?", "probability": 0.67 }
// Output:
{
  "market": "Will Bitcoin reach $100k?",
  "probability": 0.67
}
```

### Text → JSON

```typescript
// Input: '{"status": "active"}'
// Output: { status: "active" }

// Input: 'plain text'
// Output: Error - Failed to parse JSON
```

### Any Type → Any Type

```typescript
// Input: anything
// Output: same thing (pass through)
```

### Unsupported Conversions

```typescript
// JSON → Media: Error - "Requires explicit block (e.g., Chart Generator)"
// Text → Media: Error - "Requires explicit block (e.g., PDF Generator)"
```

## Error Handling

### Validation Errors

```typescript
{
    valid: false,
    error: "Incompatible types: json cannot connect to port accepting media",
    requiresConversion: false
}
```

### Conversion Errors

```typescript
{
    success: false,
    error: "Failed to parse JSON: Unexpected token..."
}
```

### UI Error Display

```typescript
// Show toast notification
showErrorToast({
    title: "Connection Failed",
    message: "Incompatible port types",
    details: "JSON data cannot be sent to a Media port without conversion"
});

// Prevent wire creation
```

## Future Enhancements

### Multi-Port Blocks

```typescript
// Block with multiple inputs/outputs
ports: [
    createJsonInputPort('data', 'Dataset'),
    createTextInputPort('config', 'Configuration'),
    createMediaOutputPort('chart', 'Chart Image'),
    createTextOutputPort('report', 'Analysis Report')
]
```

### Custom Port Types

```typescript
// Domain-specific types
type PortDataType =
    | 'json'
    | 'text'
    | 'media'
    | 'any'
    | 'timeseries'    // Time-series data
    | 'geojson'       // Geographic data
    | 'audio'         // Audio streams
    | 'video';        // Video streams
```

### Port Constraints

```typescript
interface PortSchema {
    // ... existing fields
    constraints?: {
        maxConnections?: number;  // Max wires to this port
        requiredSchema?: object;  // JSON schema validation
        acceptedMimeTypes?: string[]; // For media ports
    };
}
```

### Smart Conversion Blocks

```typescript
// Auto-insert conversion blocks
User: Connects JSON → Media
System: "This requires conversion. Add Chart Generator block?"
    [Yes] → Inserts Chart Generator between source and target
    [No] → Cancels connection
```

## Testing

### Unit Tests

```typescript
import { validateWire, convertData } from '@/core/services/port.service';

test('json to text conversion', () => {
    const result = convertData({ foo: 'bar' }, 'json', 'text');
    expect(result.success).toBe(true);
    expect(result.data).toContain('"foo"');
});

test('incompatible ports rejected', () => {
    const validation = validateWire(
        { ports: [{ id: 'out', direction: 'output', dataType: 'json' }] },
        'out',
        { ports: [{ id: 'in', direction: 'input', dataType: 'media', accepts: ['media'] }] },
        'in'
    );
    expect(validation.valid).toBe(false);
});
```

## Best Practices

1. **Use Standard Helpers** - Use `createJsonOutputPort()` etc. for consistency
2. **Clear Port Labels** - Use descriptive labels like "Market Data", not just "Output"
3. **Document Accepts** - Clearly specify what types each input port accepts
4. **Fail Gracefully** - Always handle conversion errors
5. **Show Feedback** - Display conversion info to users ("Auto-converting: json → text")
6. **Validate Early** - Check compatibility before creating wires
7. **Default Ports** - Name primary ports 'in' and 'out' for auto-detection

## API Reference

See `src/core/services/port.service.ts` for complete implementation.

---

**Last Updated:** 2026-01-12
**Status:** ✅ Production Ready
**Next Steps:** UI visualization of ports on Canvas blocks
