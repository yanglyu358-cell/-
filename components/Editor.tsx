import React from 'react';
import { TaskDefinition, PRESET_COLORS, TaskColor } from '../types';
import { formatTime, calculateDuration } from '../utils';

interface EditorProps {
  task: TaskDefinition | null;
  allTasks: Record<string, TaskDefinition>;
  onUpdate: (id: string, updates: Partial<TaskDefinition>) => void;
  onDelete: (id: string) => void;
  onSetEditGroup: (id: string | null) => void;
  editingGroupId: string | null;
}

const Editor: React.FC<EditorProps> = ({ task, allTasks, onUpdate, onDelete, onSetEditGroup, editingGroupId }) => {
  if (!task) {
    return (
      <div className="h-full bg-gray-800 border-r border-gray-700 flex items-center justify-center text-gray-500 text-sm">
        Select a module to edit
      </div>
    );
  }

  const duration = calculateDuration(task.id, allTasks);

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="h-8 bg-gray-750 px-2 flex items-center border-b border-gray-700 font-semibold text-sm">
        Edit: {task.name}
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        
        {/* Name */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input 
            type="text" 
            value={task.name}
            onChange={(e) => onUpdate(task.id, { name: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:border-editor-blue outline-none"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Color</label>
          <div className="grid grid-cols-6 gap-1">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onUpdate(task.id, { color: c })}
                className={`w-5 h-5 rounded-sm hover:scale-110 transition-transform ${task.color === c ? 'ring-1 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Duration / Type */}
        <div className="grid grid-cols-2 gap-2">
            <div>
                 <label className="block text-xs text-gray-400 mb-1">Is Group</label>
                 <input 
                    type="checkbox" 
                    checked={task.isGroup}
                    onChange={(e) => {
                        onUpdate(task.id, { isGroup: e.target.checked });
                        if(e.target.checked) {
                            onSetEditGroup(task.id);
                        } else if (editingGroupId === task.id) {
                            onSetEditGroup(null);
                        }
                    }}
                    className="accent-editor-blue"
                 />
                 <span className="ml-2 text-sm text-gray-300">Composite</span>
            </div>
            
            <div>
                 <label className="block text-xs text-gray-400 mb-1">Duration</label>
                 {task.isGroup ? (
                     <div className="text-sm text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-700 cursor-not-allowed">
                         {formatTime(duration)} (Auto)
                     </div>
                 ) : (
                     <input 
                        type="number"
                        min={3}
                        max={7200}
                        value={task.baseDuration}
                        onChange={(e) => onUpdate(task.id, { baseDuration: parseInt(e.target.value) || 3 })}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm focus:border-editor-blue outline-none"
                     />
                 )}
            </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea 
            value={task.description}
            onChange={(e) => onUpdate(task.id, { description: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm h-20 focus:border-editor-blue outline-none resize-none"
          />
        </div>

        <div className="pt-4 border-t border-gray-700 flex justify-between">
           <button 
             onClick={() => onDelete(task.id)}
             className="bg-red-900/50 text-red-400 border border-red-900 hover:bg-red-900 px-3 py-1 rounded text-sm w-full"
           >
             Delete Task
           </button>
        </div>

        {task.isGroup && (
            <div className="mt-4">
                <button
                    onClick={() => onSetEditGroup(task.id)}
                    className="w-full bg-editor-orange text-black font-semibold text-sm py-2 rounded hover:brightness-110"
                >
                    Edit Sub-Tasks Timeline
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
