
import React, { useRef, useState } from 'react';
import { TaskDefinition } from '../types';
import { formatTime, getRenderedBlocks, getAtomicBlocks } from '../utils';
import { TRACK_HEIGHT } from '../constants';

interface TimelineData {
  id: string;
  name: string;
  taskIds: string[];
}

interface TimelineProps {
  timelines: TimelineData[];
  tasks: Record<string, TaskDefinition>;
  zoom: number;
  onZoom: (val: number) => void;
  onDrop: (timelineId: string, index: number, taskId: string) => void;
  onMove: (timelineId: string, fromIndex: number, toIndex: number) => void;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, timelineId: string, index: number, taskId: string) => void;
  onRenameTimeline?: (timelineId: string, name: string) => void;
  isMain: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ 
  timelines, tasks, zoom, onZoom, onDrop, onMove, onSelect, onContextMenu, onRenameTimeline, isMain 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ timelineId: string, index: number } | null>(null);

  // Calculate total width based on the longest timeline
  const maxDuration = timelines.reduce((max, tl) => {
    const blocks = getRenderedBlocks(tl.taskIds, tasks, 1);
    const duration = blocks.reduce((sum, b) => sum + b.duration, 0);
    return Math.max(max, duration);
  }, 0);
  
  const contentWidth = Math.max(maxDuration * zoom, window.innerWidth - 300); // Minimum screen width

  const handleWheel = (e: React.WheelEvent) => {
    if (e.altKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      onZoom(delta);
    }
  };

  const handleDragOver = (e: React.DragEvent, timelineId: string, index: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverInfo(index === null ? null : { timelineId, index });
  };

  const handleDrop = (e: React.DragEvent, timelineId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('taskId');
    const fromIndexStr = e.dataTransfer.getData('fromIndex');
    const fromTimelineType = e.dataTransfer.getData('fromTimelineType');
    const fromTimelineId = e.dataTransfer.getData('fromTimelineId'); // Source timeline ID if moving within main
    
    // Determine drop index. If dragOverInfo doesn't match current timeline, append to end.
    let targetIndex = 0;
    const currentTimeline = timelines.find(t => t.id === timelineId);
    const count = currentTimeline ? currentTimeline.taskIds.length : 0;
    
    if (dragOverInfo && dragOverInfo.timelineId === timelineId) {
        targetIndex = dragOverInfo.index;
    } else {
        targetIndex = count;
    }

    if (fromIndexStr) {
        // Moving existing
        // Check if moving within the same type (Main -> Main, Sub -> Sub)
        const isTargetMain = isMain;
        const isSourceMain = fromTimelineType === 'main';

        if (isTargetMain === isSourceMain) {
            // If moving between different main timelines, we might need a different action or handle it as remove+add
            // But current MOVE_MAIN_ITEM only supports reorder within SAME timeline.
            // For simplicity and prompt scope, let's assume dragging is restricted to reordering within same timeline 
            // OR if different timeline, we might strictly prevent it or handle it.
            // The prompt says "Drag ... to ANY main task timeline... moving between axes invalid" -> "Drag to other axis invalid" (Wait: "Drag to other axis invalid" refers to drop from library?)
            // "Drag from task fragment library... to any main task timeline"
            // Let's assume reorder is only within same timeline for now based on `MOVE_MAIN_ITEM`. 
            // If `fromTimelineId` equals `timelineId`, we move.
            
            if (fromTimelineId === timelineId) {
                 onMove(timelineId, parseInt(fromIndexStr), targetIndex);
            }
        }
    } else if (taskId) {
        // Adding new
        onDrop(timelineId, targetIndex, taskId);
    }
    
    setDragOverInfo(null);
  };

  const renderRuler = () => {
    const marks = [];
    const step = zoom > 10 ? 1 : zoom > 2 ? 5 : zoom > 0.5 ? 30 : 60;
    
    for (let i = 0; i <= Math.max(maxDuration + 60, 3600 * 12); i += step) {
      const left = i * zoom;
      marks.push(
        <div key={i} className="absolute border-l border-gray-600 text-xs text-gray-500 pl-1" style={{ left, height: 20, top: 0 }}>
          {formatTime(i)}
        </div>
      );
    }
    return marks;
  };

  const renderTimelineSection = (timeline: TimelineData) => {
     // Helper to render a specific track row
     const renderTrackRow = (depth: number, label: string) => {
        const blocks = depth === -1 
          ? getAtomicBlocks(timeline.taskIds, tasks) 
          : getRenderedBlocks(timeline.taskIds, tasks, depth);
        
        const isLevel1 = depth === 1;

        return (
          <div className="relative border-b border-gray-700 bg-gray-800/50" style={{ height: TRACK_HEIGHT, width: contentWidth }}>
            <div className="sticky left-0 z-10 bg-gray-750 text-xs text-gray-400 px-2 py-1 border-r border-gray-600 w-24 h-full flex items-center absolute">
              {label}
            </div>
            <div className="absolute left-24 top-0 bottom-0 right-0">
               {/* Drop Zones for Level 1 */}
               {isLevel1 && (
                 <div 
                   className="absolute inset-0 z-0"
                   onDragOver={(e) => handleDragOver(e, timeline.id, timeline.taskIds.length)}
                   onDrop={(e) => handleDrop(e, timeline.id)}
                 />
               )}
    
               {blocks.map((block, idx) => {
                 const isHovered = isLevel1 && dragOverInfo?.timelineId === timeline.id && dragOverInfo.index === idx;
    
                 return (
                   <React.Fragment key={`${block.instanceId}-${idx}`}>
                     {/* Insertion Marker */}
                     {isHovered && (
                       <div 
                         className="absolute w-1 bg-editor-blue z-50 top-0 bottom-0"
                         style={{ left: block.startTime * zoom }}
                       />
                     )}
                     
                     <div
                       draggable={isLevel1}
                       onDragStart={(e) => {
                         e.dataTransfer.setData('taskId', block.definitionId);
                         e.dataTransfer.setData('fromIndex', idx.toString());
                         e.dataTransfer.setData('fromTimelineType', isMain ? 'main' : 'sub');
                         e.dataTransfer.setData('fromTimelineId', timeline.id);
                       }}
                       onDragOver={(e) => isLevel1 && handleDragOver(e, timeline.id, idx)}
                       onDrop={(e) => isLevel1 && handleDrop(e, timeline.id)}
                       onClick={(e) => { e.stopPropagation(); onSelect(block.definitionId); }}
                       onContextMenu={(e) => {
                         if (isLevel1) {
                            onContextMenu(e, timeline.id, idx, block.definitionId);
                         }
                       }}
                       className={`absolute top-1 bottom-1 rounded border border-gray-600 overflow-hidden cursor-pointer hover:brightness-110 flex items-center px-1 text-xs whitespace-nowrap text-white
                         ${block.isGroup ? 'bg-[length:10px_10px] bg-gradient-to-br from-transparent via-black/20 to-transparent' : ''}
                       `}
                       style={{
                         left: block.startTime * zoom,
                         width: Math.max(block.duration * zoom, 2),
                         backgroundColor: block.color,
                         zIndex: 10
                       }}
                       title={`${block.name} (${formatTime(block.duration)})`}
                     >
                        {block.name}
                     </div>
                   </React.Fragment>
                 );
               })}
               
               {/* Trailing Drop Zone Indicator */}
               {isLevel1 && dragOverInfo?.timelineId === timeline.id && dragOverInfo.index === timeline.taskIds.length && (
                  <div 
                    className="absolute w-1 bg-editor-blue z-50 top-0 bottom-0"
                    style={{ left: blocks.reduce((acc, b) => Math.max(acc, b.startTime + b.duration), 0) * zoom }}
                  />
               )}
            </div>
          </div>
        );
     };

     return (
         <div key={timeline.id} className="mb-4 border-b-2 border-gray-600 pb-2">
             {isMain && (
                 <div className="bg-gray-800 text-white px-2 py-1 sticky left-0 z-10 flex items-center w-full border-b border-gray-700">
                     <span className="text-xs font-bold mr-2 text-editor-blue">Timeline:</span>
                     <input 
                        className="bg-transparent border border-transparent hover:border-gray-600 focus:border-editor-blue px-1 text-sm text-white outline-none rounded"
                        value={timeline.name}
                        onChange={(e) => onRenameTimeline && onRenameTimeline(timeline.id, e.target.value)}
                     />
                 </div>
             )}
             <div className="flex flex-col">
                {renderTrackRow(1, isMain ? 'Main (L1)' : 'Group L1')}
                {renderTrackRow(2, isMain ? 'L2' : 'Group L2')}
                {renderTrackRow(3, isMain ? 'L3' : 'Group L3')}
                {renderTrackRow(4, isMain ? 'L4' : 'Group L4')}
                {renderTrackRow(5, isMain ? 'L5' : 'Group L5')}
                {isMain && renderTrackRow(6, 'L6')}
                {isMain && renderTrackRow(-1, 'Detail')}
             </div>
         </div>
     );
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-x-auto overflow-y-auto relative bg-gray-900 select-none custom-scrollbar"
      onWheel={handleWheel}
    >
      <div className="sticky top-0 z-20 bg-gray-800 border-b border-gray-600 h-8" style={{ width: contentWidth, minWidth: '100%' }}>
        <div className="relative h-full ml-24">
          {renderRuler()}
        </div>
      </div>
      
      <div className="pt-2">
         {timelines.map(tl => renderTimelineSection(tl))}
      </div>

      {/* Crosshair Cursor */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-30 hidden group-hover:block" 
        id="cursor-line"
      />
    </div>
  );
};

export default Timeline;
