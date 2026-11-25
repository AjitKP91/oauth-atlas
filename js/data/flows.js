import { FLOWS_PART_1 } from './flows-core.js?v=4.3';
import { FLOWS_PART_2 } from './flows-ext.js?v=4.3';

export const FLOWS = [...FLOWS_PART_1, ...FLOWS_PART_2];
export const FLOW_MAP = Object.fromEntries(FLOWS.map(f => [f.id, f]));
