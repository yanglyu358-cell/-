import { TaskDefinition, RenderedBlock } from './types';

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const generateId = (): string => {
  return 'task-' + Math.random().toString(36).substr(2, 9);
};

// Recursive function to calculate total duration of a task (handling groups)
export const calculateDuration = (taskId: string, tasks: Record<string, TaskDefinition>, visited: Set<string> = new Set()): number => {
  if (visited.has(taskId)) return 0; // Prevent infinite recursion loops
  
  const task = tasks[taskId];
  if (!task) return 0;
  
  if (!task.isGroup) {
    return task.baseDuration;
  }
  
  visited.add(taskId);
  let total = 0;
  for (const subId of task.subTaskIds) {
    total += calculateDuration(subId, tasks, new Set(visited));
  }
  return total;
};

// Flatten timeline for rendering specific tracks
export const getRenderedBlocks = (
  timelineIds: string[], 
  tasks: Record<string, TaskDefinition>, 
  targetDepth: number,
  currentDepth: number = 1
): RenderedBlock[] => {
  const blocks: RenderedBlock[] = [];
  let currentTime = 0;

  for (const id of timelineIds) {
    const task = tasks[id];
    if (!task) continue;

    const duration = calculateDuration(id, tasks);

    // If we are at the target depth, push the block
    if (currentDepth === targetDepth) {
      blocks.push({
        definitionId: id,
        instanceId: `${id}-${currentTime}-${currentDepth}`,
        startTime: currentTime,
        duration,
        depth: currentDepth,
        color: task.color,
        name: task.name,
        isGroup: task.isGroup
      });
    } 
    // If current item is a group and we need to go deeper
    else if (task.isGroup && currentDepth < targetDepth) {
      const subBlocks = getRenderedBlocks(task.subTaskIds, tasks, targetDepth, currentDepth + 1);
      
      // Shift sub-blocks by current start time
      subBlocks.forEach(b => {
        b.startTime += currentTime;
        blocks.push(b);
      });
    }

    currentTime += duration;
  }
  return blocks;
};

// Get atomic tasks (leaves)
export const getAtomicBlocks = (
  timelineIds: string[],
  tasks: Record<string, TaskDefinition>
): RenderedBlock[] => {
  const blocks: RenderedBlock[] = [];
  let currentTime = 0;

  for (const id of timelineIds) {
    const task = tasks[id];
    if (!task) continue;

    const duration = calculateDuration(id, tasks);

    if (task.isGroup) {
      const subBlocks = getAtomicBlocks(task.subTaskIds, tasks);
      subBlocks.forEach(b => {
        b.startTime += currentTime;
        blocks.push(b);
      });
    } else {
      blocks.push({
        definitionId: id,
        instanceId: `${id}-${currentTime}-atomic`,
        startTime: currentTime,
        duration,
        depth: 0,
        color: task.color,
        name: task.name,
        isGroup: false
      });
    }
    currentTime += duration;
  }
  return blocks;
}

export const checkCycle = (parentId: string, childId: string, tasks: Record<string, TaskDefinition>): boolean => {
  if (parentId === childId) return true;
  const child = tasks[childId];
  if (!child || !child.isGroup) return false;
  
  for (const subId of child.subTaskIds) {
    if (checkCycle(parentId, subId, tasks)) return true;
  }
  return false;
};
