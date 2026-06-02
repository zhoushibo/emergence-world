import Dexie from 'dexie';
import type { AgentData } from './types';

export type { AgentData };

export const db = new Dexie('EmergenceWorldDB');
db.version(1).stores({
  agents: 'id',
  events: '++id, timestamp'
});

export const agentDB = db.table<AgentData>('agents');
export const eventDB = db.table<{ id?: number; message: string; timestamp: number }>('events');