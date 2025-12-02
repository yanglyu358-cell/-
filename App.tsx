
import React, { useReducer, useEffect } from 'react';
import { AppState, Action, TaskDefinition, TaskColor, MainTimelineDefinition } from './types';
import { INITIAL_TASKS, INITIAL_MAIN_TIMELINES, DEFAULT_TASK_DURATION, MAX_ZOOM, MIN_ZOOM } from './constants';
import { generateId, checkCycle } from './utils';
import Timeline from './components/Timeline';
import Library from './components/Library';
import Editor from './components/Editor';

const initialState: AppState = {
  tasks: INITIAL_TASKS,
  mainTimelines: INITIAL_MAIN_TIMELINES,
  selectedTaskId: null,
  editingGroupId: null,
  mainZoom: 10,
  subZoom: 10,
  past: [],
  future: []
};

const reducer = (state: AppState, action: Action): AppState => {
  // Helpers for Undo/Redo
  const saveHistory = (s: AppState): AppState => ({
    ...s,
    past: [...s.past, { tasks: s.tasks, mainTimelines: s.mainTimelines }],
    future: [] // Clear future on new action
  });

  switch (action.type) {
    case 'UNDO':
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        tasks: previous.tasks,
        mainTimelines: previous.mainTimelines,
        past: newPast,
        future: [{ tasks: state.tasks, mainTimelines: state.mainTimelines }, ...state.future]
      };
    
    case 'REDO':
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        tasks: next.tasks,
        mainTimelines: next.mainTimelines,
        past: [...state.past, { tasks: state.tasks, mainTimelines: state.mainTimelines }],
        future: newFuture
      };

    case 'ADD_TASK': {
      const s = saveHistory(state);
      return {
        ...s,
        tasks: { ...s.tasks, [action.payload.task.id]: action.payload.task },
        selectedTaskId: action.payload.task.id
      };
    }

    case 'UPDATE_TASK': {
      const s = saveHistory(state);
      const taskId = action.payload.id;
      const task = s.tasks[taskId];
      if(!task) return state;

      const newTasks = {
          ...s.tasks,
          [taskId]: { ...task, ...action.payload.updates }
      };

      // If switching from group to single, clear subtasks
      if (action.payload.updates.isGroup === false) {
          newTasks[taskId].subTaskIds = [];
      }
      
      return { ...s, tasks: newTasks };
    }

    case 'DELETE_TASK': {
      const s = saveHistory(state);
      const idToDelete = action.payload.id;
      const newTasks = { ...s.tasks };
      delete newTasks[idToDelete];

      // Remove from all main timelines
      const newMainTimelines = s.mainTimelines.map(tl => ({
          ...tl,
          taskIds: tl.taskIds.filter(id => id !== idToDelete)
      }));

      // Remove from all subtasks lists
      Object.keys(newTasks).forEach(key => {
        newTasks[key] = {
            ...newTasks[key],
            subTaskIds: newTasks[key].subTaskIds.filter(sid => sid !== idToDelete)
        };
      });

      return {
        ...s,
        tasks: newTasks,
        mainTimelines: newMainTimelines,
        selectedTaskId: s.selectedTaskId === idToDelete ? null : s.selectedTaskId,
        editingGroupId: s.editingGroupId === idToDelete ? null : s.editingGroupId
      };
    }

    case 'DELETE_INSTANCE_MAIN': {
       const s = saveHistory(state);
       const { timelineId, index } = action.payload;
       const newMainTimelines = s.mainTimelines.map(tl => {
           if(tl.id !== timelineId) return tl;
           const newIds = [...tl.taskIds];
           newIds.splice(index, 1);
           return { ...tl, taskIds: newIds };
       });
       return { ...s, mainTimelines: newMainTimelines };
    }

    case 'DELETE_INSTANCE_SUB': {
       const s = saveHistory(state);
       const parent = s.tasks[action.payload.parentId];
       if(!parent) return state;

       const newSubIds = [...parent.subTaskIds];
       newSubIds.splice(action.payload.index, 1);

       return {
           ...s,
           tasks: {
               ...s.tasks,
               [parent.id]: { ...parent, subTaskIds: newSubIds }
           }
       };
    }

    case 'ADD_TO_MAIN': {
        const s = saveHistory(state);
        const { timelineId, taskId, index } = action.payload;
        const newMainTimelines = s.mainTimelines.map(tl => {
            if(tl.id !== timelineId) return tl;
            const newIds = [...tl.taskIds];
            const insertIdx = index !== undefined ? index : newIds.length;
            newIds.splice(insertIdx, 0, taskId);
            return { ...tl, taskIds: newIds };
        });
        return { ...s, mainTimelines: newMainTimelines };
    }

    case 'MOVE_MAIN_ITEM': {
        const s = saveHistory(state);
        const { timelineId, fromIndex, toIndex } = action.payload;
        const newMainTimelines = s.mainTimelines.map(tl => {
            if(tl.id !== timelineId) return tl;
            const list = [...tl.taskIds];
            const [removed] = list.splice(fromIndex, 1);
            const target = toIndex > fromIndex ? toIndex - 1 : toIndex;
            list.splice(target, 0, removed);
            return { ...tl, taskIds: list };
        });
        return { ...s, mainTimelines: newMainTimelines };
    }

    case 'ADD_TO_SUB': {
        const { parentId, taskId, index } = action.payload;
        
        // Cycle check
        if(checkCycle(parentId, taskId, state.tasks)) {
            alert("Cannot add task: Cyclic dependency detected.");
            return state;
        }

        const s = saveHistory(state);
        const parent = s.tasks[parentId];
        const newSubIds = [...parent.subTaskIds];
        const insertIdx = index !== undefined ? index : newSubIds.length;
        newSubIds.splice(insertIdx, 0, taskId);

        return {
            ...s,
            tasks: {
                ...s.tasks,
                [parentId]: { ...parent, subTaskIds: newSubIds }
            }
        };
    }

    case 'MOVE_SUB_ITEM': {
        const s = saveHistory(state);
        const { parentId, fromIndex, toIndex } = action.payload;
        const parent = s.tasks[parentId];
        const list = [...parent.subTaskIds];
        const [removed] = list.splice(fromIndex, 1);
        const target = toIndex > fromIndex ? toIndex - 1 : toIndex;
        list.splice(target, 0, removed);

        return {
            ...s,
            tasks: {
                ...s.tasks,
                [parentId]: { ...parent, subTaskIds: list }
            }
        };
    }

    case 'RENAME_MAIN_TIMELINE': {
        const s = saveHistory(state);
        const { timelineId, name } = action.payload;
        const newMainTimelines = s.mainTimelines.map(tl => 
            tl.id === timelineId ? { ...tl, name } : tl
        );
        return { ...s, mainTimelines: newMainTimelines };
    }

    case 'SELECT_TASK':
        return { ...state, selectedTaskId: action.payload.id };
    
    case 'SET_EDIT_GROUP':
        return { ...state, editingGroupId: action.payload.id };

    case 'SET_MAIN_ZOOM':
        return { ...state, mainZoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, action.payload)) };

    case 'SET_SUB_ZOOM':
        return { ...state, subZoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, action.payload)) };
    
    case 'LOAD_STATE':
        return { ...action.payload, past: [], future: [] };

    case 'RESET_HISTORY':
        return { ...state, past: [], future: [] };

    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Auto-save
  useEffect(() => {
    const saved = localStorage.getItem('taskflow_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration check for old state
        if (!parsed.mainTimelines && parsed.mainTimeline) {
             const legacyTimeline = parsed.mainTimeline;
             parsed.mainTimelines = INITIAL_MAIN_TIMELINES.map((tl, i) => 
                 i === 0 ? { ...tl, taskIds: legacyTimeline } : tl
             );
             delete parsed.mainTimeline;
        }
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error("Failed to load local storage", e);
      }
    }
  }, []);

  useEffect(() => {
    const toSave = { ...state, past: [], future: [] }; // Don't save history
    localStorage.setItem('taskflow_project', JSON.stringify(toSave));
  }, [state.tasks, state.mainTimelines]);


  // Actions
  const handleAddTask = () => {
    const newId = generateId();
    const newTask: TaskDefinition = {
        id: newId,
        name: 'New Module',
        color: TaskColor.Blue,
        description: '',
        isGroup: false,
        baseDuration: DEFAULT_TASK_DURATION,
        subTaskIds: []
    };
    dispatch({ type: 'ADD_TASK', payload: { task: newTask } });
  };

  const handleZoomMain = (multiplier: number) => {
    dispatch({ type: 'SET_MAIN_ZOOM', payload: state.mainZoom * multiplier });
  };

  const handleZoomSub = (multiplier: number) => {
    dispatch({ type: 'SET_SUB_ZOOM', payload: state.subZoom * multiplier });
  };
  
  const handleSaveFile = () => {
      const data = JSON.stringify({ ...state, past: [], future: [] }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project.json';
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const loaded = JSON.parse(ev.target?.result as string);
              // Migration logic duplicate
              if (!loaded.mainTimelines && loaded.mainTimeline) {
                 const legacyTimeline = loaded.mainTimeline;
                 loaded.mainTimelines = INITIAL_MAIN_TIMELINES.map((tl, i) => 
                     i === 0 ? { ...tl, taskIds: legacyTimeline } : tl
                 );
              }
              dispatch({ type: 'LOAD_STATE', payload: loaded });
          } catch(err) {
              alert("Invalid file format");
          }
      };
      reader.readAsText(file);
  };

  const handleContextMenuMain = (e: React.MouseEvent, timelineId: string, index: number, taskId: string) => {
      e.preventDefault();
      const choice = window.prompt("Type 'd' to delete, 'c' to convert to composite:", "");
      if (choice === 'd') {
        dispatch({ type: 'DELETE_INSTANCE_MAIN', payload: { timelineId, index } });
      } else if (choice === 'c') {
        dispatch({ type: 'UPDATE_TASK', payload: { id: taskId, updates: { isGroup: true } } });
      }
  };
  
  const handleContextMenuSub = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      if(state.editingGroupId) {
          if(confirm("Delete this sub-task instance?")) {
             dispatch({ type: 'DELETE_INSTANCE_SUB', payload: { parentId: state.editingGroupId, index } });
          }
      }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-300 font-sans">
      {/* Header */}
      <header className="h-10 bg-gray-800 border-b border-gray-600 flex items-center px-4 justify-between shrink-0">
        <h1 className="font-bold text-sm text-white">Cleanliness Rate Detection Equipment Task Overview Tool</h1>
        <div className="flex items-center gap-2">
           <button onClick={() => window.location.reload()} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Refresh</button>
           <div className="w-px h-4 bg-gray-600 mx-1"></div>
           <button onClick={() => dispatch({type: 'UNDO'})} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50" disabled={state.past.length===0}>Undo</button>
           <button onClick={() => dispatch({type: 'REDO'})} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50" disabled={state.future.length===0}>Redo</button>
           <div className="w-px h-4 bg-gray-600 mx-1"></div>
           <button onClick={handleSaveFile} className="px-2 py-1 bg-editor-blue text-white hover:brightness-110 rounded text-xs">Save</button>
           <label className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs cursor-pointer">
               Load
               <input type="file" onChange={handleLoadFile} className="hidden" accept=".json"/>
           </label>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {/* Top Split: Timeline & Library */}
        <div className="flex-1 flex min-h-0 border-b border-gray-600" style={{ flexBasis: '60%' }}>
           {/* Main Timeline */}
           <div className="flex-1 flex flex-col min-w-0">
              <div className="h-8 bg-gray-750 border-b border-gray-700 px-2 flex items-center justify-between text-xs font-semibold">
                  <span>Main Timeline Sequence</span>
                  <div className="flex gap-2">
                      <button onClick={() => handleZoomMain(1.2)} className="bg-gray-600 hover:bg-gray-500 text-white px-2 rounded font-bold">+</button>
                      <button onClick={() => handleZoomMain(0.8)} className="bg-gray-600 hover:bg-gray-500 text-white px-2 rounded font-bold">-</button>
                  </div>
              </div>
              <Timeline 
                timelines={state.mainTimelines}
                tasks={state.tasks}
                zoom={state.mainZoom}
                onZoom={handleZoomMain}
                onDrop={(timelineId, index, taskId) => dispatch({ type: 'ADD_TO_MAIN', payload: { timelineId, taskId, index } })}
                onMove={(timelineId, from, to) => dispatch({ type: 'MOVE_MAIN_ITEM', payload: { timelineId, fromIndex: from, toIndex: to } })}
                onRenameTimeline={(timelineId, name) => dispatch({ type: 'RENAME_MAIN_TIMELINE', payload: { timelineId, name } })}
                onSelect={(id) => dispatch({ type: 'SELECT_TASK', payload: { id } })}
                onContextMenu={handleContextMenuMain}
                isMain={true}
              />
           </div>

           {/* Library */}
           <div className="w-64 shrink-0 flex flex-col border-l border-gray-600">
              <Library 
                 tasks={state.tasks}
                 selectedId={state.selectedTaskId}
                 onAdd={handleAddTask}
                 onSelect={(id) => dispatch({ type: 'SELECT_TASK', payload: { id } })}
                 onDelete={(id) => dispatch({ type: 'DELETE_TASK', payload: { id } })}
                 fullStateTasks={state.tasks}
              />
           </div>
        </div>

        {/* Bottom Split: Editor & Sub-Timeline */}
        <div className="flex flex-1 min-h-0 bg-gray-800" style={{ flexBasis: '40%' }}>
            {/* Editor Panel */}
            <div className="w-80 shrink-0 border-r border-gray-600 overflow-hidden">
                <Editor 
                   task={state.selectedTaskId ? state.tasks[state.selectedTaskId] : null}
                   allTasks={state.tasks}
                   editingGroupId={state.editingGroupId}
                   onUpdate={(id, updates) => dispatch({ type: 'UPDATE_TASK', payload: { id, updates } })}
                   onDelete={(id) => dispatch({ type: 'DELETE_TASK', payload: { id } })}
                   onSetEditGroup={(id) => dispatch({ type: 'SET_EDIT_GROUP', payload: { id } })}
                />
            </div>

            {/* Sub Timeline */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900 relative">
               <div className="h-8 bg-gray-750 border-b border-gray-700 px-2 flex items-center justify-between text-xs font-semibold">
                  <span>
                      Composite Task Timeline 
                      {state.editingGroupId && <span className="text-editor-orange ml-2">Editing: {state.tasks[state.editingGroupId]?.name}</span>}
                  </span>
                  <div className="flex gap-2">
                      <button onClick={() => handleZoomSub(1.2)} className="bg-gray-600 hover:bg-gray-500 text-white px-2 rounded font-bold">+</button>
                      <button onClick={() => handleZoomSub(0.8)} className="bg-gray-600 hover:bg-gray-500 text-white px-2 rounded font-bold">-</button>
                  </div>
               </div>

               {state.editingGroupId ? (
                   <Timeline 
                     timelines={[{ id: 'sub', name: 'Group', taskIds: state.tasks[state.editingGroupId].subTaskIds }]}
                     tasks={state.tasks}
                     zoom={state.subZoom}
                     onZoom={handleZoomSub}
                     onDrop={(_, index, taskId) => dispatch({ type: 'ADD_TO_SUB', payload: { parentId: state.editingGroupId!, taskId, index } })}
                     onMove={(_, from, to) => dispatch({ type: 'MOVE_SUB_ITEM', payload: { parentId: state.editingGroupId!, fromIndex: from, toIndex: to } })}
                     onSelect={(id) => dispatch({ type: 'SELECT_TASK', payload: { id } })}
                     onContextMenu={(e, tlId, index) => handleContextMenuSub(e, index)}
                     isMain={false}
                   />
               ) : (
                   <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic">
                       Select a Composite Task and click "Edit Sub-Tasks Timeline" in the editor.
                   </div>
               )}
            </div>
        </div>
      </div>
      
      {/* Footer Status Bar */}
      <div className="h-6 bg-editor-blue text-white text-xs flex items-center px-2 justify-end">
          {state.selectedTaskId ? `Selected: ${state.tasks[state.selectedTaskId]?.name}` : 'Ready'}
      </div>
    </div>
  );
};

export default App;
