# Shell Snapshot System - Technical Guide

## Overview

The Shell Snapshot system captures a **complete, comprehensive view** of the entire Shell's landscape when the Mind's "Think" button is pressed. This replaces the previous simple block data gathering with a rich, context-aware snapshot that includes:

- All blocks on the canvas with their full state
- Pinned/focused blocks (📌) for deep analysis priority
- Awareness observations from the cognitive substrate
- Block connections and relationships
- Real-time statistics about the Shell's health and status

## Architecture

### Core Components

1. **`shell.snapshot.ts`** - The snapshot capture service
   - `captureShellSnapshot()` - Captures complete Shell state
   - `formatSnapshotForLLM()` - Formats snapshot for LLM consumption
   - `ShellSnapshot` interface - Complete snapshot data structure

2. **`mind.engine.ts`** - Updated to use snapshots
   - `think()` method now captures snapshot before analysis
   - `buildSnapshotAnalysisPrompt()` creates rich context for LLM
   - Metadata tracking includes snapshot timestamp and block count

3. **Integration Points**
   - Block Store - Source of block instances and connections
   - Mind Store - Source of focused blocks and observations
   - LLM Service - Consumes formatted snapshot for analysis

## Snapshot Data Structure

```typescript
interface ShellSnapshot {
    timestamp: number;                    // When snapshot was taken
    totalBlocks: number;                  // Total blocks on canvas
    blocks: BlockSnapshotData[];          // All block states
    focusedBlocks: ContextEntry[];        // Pinned blocks (high priority)
    observations: ContextEntry[];         // Recent observations
    connections: Array<{                  // Block connections
        sourceBlockId: string;
        targetBlockId: string;
    }>;
    stats: {                              // Aggregate statistics
        connectedBlocks: number;
        disconnectedBlocks: number;
        errorBlocks: number;
        blocksByCategory: Record<string, number>;
        dataAge: {
            newest: number | null;
            oldest: number | null;
        };
    };
}
```

### Block Snapshot Data

Each block in the snapshot includes:

```typescript
interface BlockSnapshotData {
    instanceId: string;         // Unique instance ID
    blockType: string;          // Block type (polymarket, newsapi, etc.)
    displayName: string;        // Human-readable name
    category: string;           // Category (truth, pulse, etc.)
    status: string;             // Connection status
    position: { x, y };         // Canvas position
    dimensions: { w, h };       // Size
    lastUpdated: number | null; // Last data update
    isPinned: boolean;          // Whether user pinned this block
    data: unknown;              // Raw data payload
    summary: string;            // Human-readable summary
    keyMetrics: string[];       // Extracted key metrics
    error?: string;             // Error message if any
}
```

## How It Works

### 1. Snapshot Capture Flow

```
User clicks "Think" button
    ↓
MindPanel.handleThink()
    ↓
MindEngine.think()
    ↓
captureShellSnapshot()
    ├─ Gets all blocks from BlockStore
    ├─ Gets focused blocks from MindStore (focus pool)
    ├─ Gets observations from MindStore (observations pool)
    ├─ Processes each block:
    │   ├─ Extracts summary
    │   ├─ Extracts key metrics
    │   ├─ Checks if pinned
    │   └─ Includes full data
    └─ Calculates aggregate statistics
    ↓
formatSnapshotForLLM(snapshot)
    ├─ Formats overview section
    ├─ Prioritizes focused blocks at top
    ├─ Groups blocks by category
    ├─ Adds recent observations
    └─ Returns formatted string
    ↓
LLM receives complete landscape context
    ↓
Returns analysis based on full Shell state
```

### 2. Example Formatted Snapshot

```
============================================================
SHELL LANDSCAPE SNAPSHOT
Captured at: 1/11/2026, 3:45:23 PM
============================================================

## OVERVIEW
Total Blocks: 5
Connected: 3 | Disconnected: 1 | Errors: 1
Categories: truth: 2, pulse: 2, model: 1
Data Freshness: 15s ago

## FOCUSED BLOCKS (📌 Pinned for Deep Analysis)

[POLYMARKET FOCUS - 10 markets]

📊 Will Trump win 2024 election?
  - YES: 67.3%
  - NO: 32.7%
  Volume: $45,231,091

📊 Will Bitcoin reach $100k in 2024?
  - YES: 52.1%
  - NO: 47.9%
  Volume: $12,445,332

------------------------------------------------------------

## ALL BLOCKS ON CANVAS

### TRUTH (2)

🟢 **Polymarket** (polymarket)
   Summary: "Will Trump win 2024?" - YES: 67.3% | Vol: $45k
   Metrics: YES: 67.3% | Vol: $45k
   Last updated: 15s ago

🔴 **TradingView** (tradingview)
   Summary: Chart: BTC/USD - 1D timeframe | Price: $98,432
   Metrics: $98,432 | +2.45%
   ⚠️ Error: Rate limit exceeded
   Last updated: 120s ago

### PULSE (2)

🟢 **NewsAPI** (newsapi)
   Summary: 20 articles | Latest: "Bitcoin reaches new..." (Reuters)
   Metrics: 20 articles | +12/-3
   Last updated: 8s ago

------------------------------------------------------------

## RECENT OBSERVATIONS

[analysis] Current market sentiment strongly bullish...
[inference] High correlation between prediction markets...
[observation] News sentiment aligns with market data...

============================================================
```

## Benefits

### Before (Old System)
- ❌ Only captured raw block data
- ❌ No context about focused blocks
- ❌ No awareness of block relationships
- ❌ No visibility into block status/health
- ❌ No prioritization of important data

### After (New System)
- ✅ Complete landscape context
- ✅ Focused blocks prioritized for analysis
- ✅ Includes observations and inferences
- ✅ Shows block health and freshness
- ✅ Provides aggregate statistics
- ✅ Groups blocks by category
- ✅ Highlights pinned blocks
- ✅ Shows connections and relationships

## Usage Examples

### For Users

1. **Pin important blocks** before clicking Think
   - Click 📌 on blocks you want deeply analyzed
   - These appear first in the snapshot as "FOCUSED BLOCKS"

2. **Check block status**
   - The snapshot shows which blocks are connected (🟢), disconnected (⚪), or errored (🔴)
   - Mind can identify missing data sources

3. **Review freshness**
   - Snapshot shows when data was last updated
   - Mind can flag stale data in its analysis

### For Developers

```typescript
// Capture a snapshot manually
import { captureShellSnapshot } from '@/core/services';

const snapshot = captureShellSnapshot();
console.log(`Captured ${snapshot.totalBlocks} blocks`);
console.log(`${snapshot.focusedBlocks.length} blocks are pinned`);

// Format for LLM
import { formatSnapshotForLLM } from '@/core/services';

const formatted = formatSnapshotForLLM(snapshot);
console.log(formatted);
```

## Future Enhancements

- [ ] Visual snapshot preview in UI
- [ ] Snapshot history/replay
- [ ] Diff between snapshots
- [ ] Export snapshots as JSON
- [ ] Snapshot-based block recommendations
- [ ] Time-series analysis across snapshots

## Technical Notes

- Snapshots are captured **synchronously** at Think time
- No caching - always fresh data
- Lightweight - only processes visible blocks
- Extensible - easy to add new block types
- Type-safe - full TypeScript support

## Related Files

- `src/core/services/shell.snapshot.ts` - Main snapshot service
- `src/core/services/mind.engine.ts` - Snapshot consumer
- `src/core/stores/mindStore.ts` - Focus/observation providers
- `src/core/stores/index.ts` - Block data provider
- `src/components/mind/MindPanel.tsx` - Think button UI

---

**Last Updated:** 2026-01-11
**Status:** ✅ Production Ready
