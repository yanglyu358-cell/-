
import { TaskColor, MainTimelineDefinition } from './types';

export const DEFAULT_TASK_DURATION = 10; // seconds
export const MAX_ZOOM = 50; // pixels per second
export const MIN_ZOOM = 1; // pixels per second
export const TRACK_HEIGHT = 40; // pixels
export const RULER_HEIGHT = 30; // pixels

export const INITIAL_TASKS = {
  'task-1': {
    id: 'task-1',
    name: 'Intro',
    color: TaskColor.Blue,
    description: 'Basic intro segment',
    isGroup: false,
    baseDuration: 5,
    subTaskIds: []
  },
  'task-2': {
    id: 'task-2',
    name: 'Content A',
    color: TaskColor.Green,
    description: 'Main content part A',
    isGroup: false,
    baseDuration: 15,
    subTaskIds: []
  },
  'task-3': {
    id: 'task-3',
    name: 'Outro',
    color: TaskColor.Red,
    description: 'Ending segment',
    isGroup: false,
    baseDuration: 8,
    subTaskIds: []
  }
};

export const INITIAL_MAIN_TIMELINES: MainTimelineDefinition[] = [
  { id: 'main-1', name: 'Main Task 1', taskIds: [] },
  { id: 'main-2', name: 'Main Task 2', taskIds: [] },
  { id: 'main-3', name: 'Main Task 3', taskIds: [] },
  { id: 'main-4', name: 'Main Task 4', taskIds: [] },
];
