// ============================================
// PROJECT OMNI: PORT SERVICE
// Type-safe port and wire validation system
// ============================================

import {
    PortSchema,
    PortDataType,
    ConversionResult,
    OmniBlockSchema
} from '@/core/schemas/block.schema';

// ============================================
// PORT COMPATIBILITY
// ============================================

/**
 * Check if a source port can connect to a target port
 */
export function arePortsCompatible(
    sourcePort: PortSchema,
    targetPort: PortSchema
): boolean {
    // Source must be output, target must be input
    if (sourcePort.direction !== 'output' || targetPort.direction !== 'input') {
        return false;
    }

    // Check type compatibility
    return isTypeCompatible(sourcePort.dataType, targetPort);
}

/**
 * Check if a source data type is compatible with a target port
 */
export function isTypeCompatible(
    sourceType: PortDataType,
    targetPort: PortSchema
): boolean {
    const targetType = targetPort.dataType;
    const accepts = targetPort.accepts || [targetType];

    // any accepts everything
    if (accepts.includes('any')) {
        return true;
    }

    // Direct type match
    if (accepts.includes(sourceType)) {
        return true;
    }

    // Check auto-convertible types
    if (sourceType === 'json' && accepts.includes('text')) {
        return true; // JSON can be stringified to text
    }

    if (sourceType === 'text' && accepts.includes('json')) {
        return true; // Text can be parsed as JSON
    }

    return false;
}

/**
 * Get compatibility error message
 */
export function getCompatibilityError(
    sourcePort: PortSchema,
    targetPort: PortSchema
): string {
    if (sourcePort.direction !== 'output') {
        return 'Source port must be an output port';
    }

    if (targetPort.direction !== 'input') {
        return 'Target port must be an input port';
    }

    if (!isTypeCompatible(sourcePort.dataType, targetPort)) {
        const accepts = targetPort.accepts || [targetPort.dataType];
        const acceptStr = accepts.join(', ');
        return `Incompatible types: ${sourcePort.dataType} cannot connect to port accepting ${acceptStr}`;
    }

    return 'Ports are compatible';
}

// ============================================
// DATA CONVERSION
// ============================================

/**
 * Convert data from one type to another
 */
export function convertData(
    data: unknown,
    fromType: PortDataType,
    toType: PortDataType
): ConversionResult {
    // No conversion needed
    if (fromType === toType || toType === 'any') {
        return { success: true, data };
    }

    try {
        // JSON to Text
        if (fromType === 'json' && toType === 'text') {
            return {
                success: true,
                data: JSON.stringify(data, null, 2)
            };
        }

        // Text to JSON
        if (fromType === 'text' && toType === 'json') {
            if (typeof data !== 'string') {
                return {
                    success: false,
                    error: 'Expected string data for text-to-json conversion'
                };
            }

            try {
                const parsed = JSON.parse(data);
                return { success: true, data: parsed };
            } catch (e) {
                return {
                    success: false,
                    error: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`
                };
            }
        }

        // JSON to Media
        if (fromType === 'json' && toType === 'media') {
            return {
                success: false,
                error: 'JSON to Media conversion requires explicit block'
            };
        }

        // Text to Media
        if (fromType === 'text' && toType === 'media') {
            return {
                success: false,
                error: 'Text to Media conversion requires explicit block'
            };
        }

        // Media to Text
        if (fromType === 'media' && toType === 'text') {
            return {
                success: true,
                data: `[Media Content: ${typeof data}]`
            };
        }

        // Media to JSON
        if (fromType === 'media' && toType === 'json') {
            return {
                success: true,
                data: {
                    type: 'media',
                    contentType: typeof data,
                    data: data
                }
            };
        }

        // Fallback
        return {
            success: true,
            data,
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Conversion failed'
        };
    }
}

/**
 * Convert data flowing through a wire
 */
export function convertWireData(
    data: unknown,
    sourcePort: PortSchema,
    targetPort: PortSchema
): ConversionResult {
    return convertData(data, sourcePort.dataType, targetPort.dataType);
}

// ============================================
// PORT UTILITIES
// ============================================

/**
 * Find a port in a block schema by ID
 */
export function findPort(
    schema: OmniBlockSchema,
    portId: string
): PortSchema | undefined {
    return schema.ports?.find(p => p.id === portId);
}

/**
 * Get all input ports for a block
 */
export function getInputPorts(schema: OmniBlockSchema): PortSchema[] {
    return schema.ports?.filter(p => p.direction === 'input') || [];
}

/**
 * Get all output ports for a block
 */
export function getOutputPorts(schema: OmniBlockSchema): PortSchema[] {
    return schema.ports?.filter(p => p.direction === 'output') || [];
}

/**
 * Get the default output port for a block
 */
export function getDefaultOutputPort(schema: OmniBlockSchema): PortSchema | undefined {
    const outputs = getOutputPorts(schema);
    return outputs.find(p => p.id === 'out' || p.id === 'output') || outputs[0];
}

/**
 * Get the default input port for a block
 */
export function getDefaultInputPort(schema: OmniBlockSchema): PortSchema | undefined {
    const inputs = getInputPorts(schema);
    return inputs.find(p => p.id === 'in' || p.id === 'input') || inputs[0];
}

/**
 * Validate a wire connection
 */
export interface WireValidation {
    valid: boolean;
    error?: string;
    requiresConversion: boolean;
    conversionPath?: string;
}

export function validateWire(
    sourceSchema: OmniBlockSchema,
    sourcePortId: string,
    targetSchema: OmniBlockSchema,
    targetPortId: string
): WireValidation {
    const sourcePort = findPort(sourceSchema, sourcePortId);
    const targetPort = findPort(targetSchema, targetPortId);

    if (!sourcePort) {
        return {
            valid: false,
            error: `Source port '${sourcePortId}' not found`,
            requiresConversion: false
        };
    }

    if (!targetPort) {
        return {
            valid: false,
            error: `Target port '${targetPortId}' not found`,
            requiresConversion: false
        };
    }

    if (!arePortsCompatible(sourcePort, targetPort)) {
        return {
            valid: false,
            error: getCompatibilityError(sourcePort, targetPort),
            requiresConversion: false
        };
    }

    const requiresConversion = sourcePort.dataType !== targetPort.dataType && targetPort.dataType !== 'any';

    return {
        valid: true,
        requiresConversion,
        conversionPath: requiresConversion
            ? `${sourcePort.dataType} to ${targetPort.dataType}`
            : undefined
    };
}

// ============================================
// HELPER: CREATE STANDARD PORTS
// ============================================

export function createJsonOutputPort(id: string = 'out', label?: string): PortSchema {
    return {
        id,
        direction: 'output',
        dataType: 'json',
        label: label || 'JSON Data',
        description: 'Structured data output'
    };
}

export function createTextOutputPort(id: string = 'out', label?: string): PortSchema {
    return {
        id,
        direction: 'output',
        dataType: 'text',
        label: label || 'Text',
        description: 'Plain text or markdown output'
    };
}

export function createMediaOutputPort(id: string = 'out', label?: string): PortSchema {
    return {
        id,
        direction: 'output',
        dataType: 'media',
        label: label || 'Media',
        description: 'Image, PDF, or other media output'
    };
}

export function createAnyInputPort(id: string = 'in', label?: string): PortSchema {
    return {
        id,
        direction: 'input',
        dataType: 'any',
        label: label || 'Input',
        description: 'Accepts any data type',
        accepts: ['any']
    };
}

export function createJsonInputPort(id: string = 'in', label?: string, acceptText: boolean = true): PortSchema {
    return {
        id,
        direction: 'input',
        dataType: 'json',
        label: label || 'JSON Data',
        description: 'Structured data input',
        accepts: acceptText ? ['json', 'text'] : ['json']
    };
}

export function createTextInputPort(id: string = 'in', label?: string, acceptJson: boolean = true): PortSchema {
    return {
        id,
        direction: 'input',
        dataType: 'text',
        label: label || 'Text',
        description: 'Plain text or markdown input',
        accepts: acceptJson ? ['text', 'json'] : ['text']
    };
}
