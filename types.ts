
export enum TaskColor {
  Red = '#ef4444',
  Orange = '#f97316',
  Amber = '#f59e0b',
  Yellow = '#eab308',
  Lime = '#84cc16',
  Green = '#22c55e',
  Emerald = '#10b981',
  Teal = '#14b8a6',
  Cyan = '#06b6d4',
  Sky = '#0ea5e9',
  Blue = '#3b82f6',
  Indigo = '#6366f1',
  Violet = '#8b5cf6',
  Purple = '#a855f7',
  Fuchsia = '#d946ef',
  Pink = '#ec4899',
}

export const PRESET_COLORS = Object.values(TaskColor);

export interface TaskDefinition {
  id: string;
  name: string;
  color: string;
  description: string;
  isGroup: boolean;
  baseDuration: number; // In seconds. Used if not a group.
  subTaskIds: string[]; // Ordered list of children definition IDs
}

export interface RenderedBlock {
  definitionId: string;
  instanceId: string; // Unique ID for this specific placement (if needed for selection)
  startTime: number;
  duration: number;
  depth: number;
  color: string;
  name: string;
  isGroup: boolean;
}

export interface MainTimelineDefinition {
  id: string;
  name: string;
  taskIds: string[];
}

export interface AppState {
  tasks: Record<string, TaskDefinition>; // The "Library"
  mainTimelines: MainTimelineDefinition[]; // List of Main Timelines
  
  // UI State
  selectedTaskId: string | null; // Currently selected definition (for editing)
  editingGroupId: string | null; // For the bottom-right sub-timeline view
  
  // Viewport State
  mainZoom: number; // Pixels per second
  subZoom: number; // Pixels per second
  
  // History
  past: { tasks: Record<string, TaskDefinition>; mainTimelines: MainTimelineDefinition[] }[];
  future: { tasks: Record<string, TaskDefinition>; mainTimelines: MainTimelineDefinition[] }[];
}

export type Action =
  | { type: 'ADD_TASK'; payload: { task: TaskDefinition } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<TaskDefinition> } }
  | { type: 'DELETE_TASK'; payload: { id: string } } // Deletes from library and all usages
  | { type: 'DELETE_INSTANCE_MAIN'; payload: { timelineId: string; index: number } } // Removes from main timeline
  | { type: 'DELETE_INSTANCE_SUB'; payload: { parentId: string; index: number } } // Removes from group
  | { type: 'MOVE_MAIN_ITEM'; payload: { timelineId: string; fromIndex: number; toIndex: number } }
  | { type: 'ADD_TO_MAIN'; payload: { timelineId: string; taskId: string; index?: number } }
  | { type: 'MOVE_SUB_ITEM'; payload: { parentId: string; fromIndex: number; toIndex: number } }
  | { type: 'ADD_TO_SUB'; payload: { parentId: string; taskId: string; index?: number } }
  | { type: 'SELECT_TASK'; payload: { id: string | null } }
  | { type: 'SET_EDIT_GROUP'; payload: { id: string | null } }
  | { type: 'SET_MAIN_ZOOM'; payload: number }
  | { type: 'SET_SUB_ZOOM'; payload: number }
  | { type: 'RENAME_MAIN_TIMELINE'; payload: { timelineId: string; name: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'RESET_HISTORY' };
