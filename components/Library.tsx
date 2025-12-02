import React from 'react';
import { TaskDefinition } from '../types';
import { formatTime, calculateDuration } from '../utils';

interface LibraryProps {
  tasks: Record<string, TaskDefinition>;
  selectedId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  fullStateTasks: Record<string, TaskDefinition>; // Passed to calculate recursive duration
}

const Library: React.FC<LibraryProps> = ({ tasks, selectedId, onAdd, onSelect, onDelete, fullStateTasks }) => {
  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      <div className="h-8 bg-gray-750 flex items-center justify-between px-2 border-b border-gray-700">
        <span className="text-sm font-semibold">Library</span>
        <button 
          onClick={onAdd}
          className="bg-editor-blue text-white text-xs px-2 py-0.5 rounded hover:bg-blue-600"
        >
          New Module
        </button>
      </div>
      
      <div className="p-2 text-xs text-gray-400 border-b border-gray-700 italic">
        Drag modules to the Main Track
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Object.values(tasks).map(task => {
          const duration = calculateDuration(task.id, fullStateTasks);
          return (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
              }}
              onClick={() => onSelect(task.id)}
              onDoubleClick={() => onSelect(task.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                if(confirm(`Delete ${task.name} and all its instances?`)) {
                    onDelete(task.id);
                }
              }}
              className={`p-2 rounded border cursor-pointer flex items-center gap-2 select-none transition-colors
                ${selectedId === task.id ? 'bg-gray-700 border-editor-blue' : 'bg-gray-750 border-gray-600 hover:border-gray-500'}
              `}
            >
              <div 
                className="w-4 h-4 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: task.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-1">
                    {task.name}
                    {task.isGroup && <span className="text-[10px] text-editor-orange bg-gray-900 px-1 rounded">[Group]</span>}
                </div>
                <div className="text-xs text-gray-400 flex justify-between">
                   <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Library;
