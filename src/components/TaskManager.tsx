import React, { useEffect } from 'react';
import { Activity, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Task, InvestigationState } from '../types';

interface TaskManagerProps {
  state: InvestigationState;
  onUpdateState: (newState: Partial<InvestigationState>) => void;
}

export function TaskManager({ state, onUpdateState }: TaskManagerProps) {
  const activeTasks = state.tasks.filter(t => t.status === 'RUNNING' || t.status === 'PENDING');
  const completedTasks = state.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'FAILED').slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-green-500" />
        <h3 className="text-xs font-bold uppercase tracking-widest">Active Tasks</h3>
      </div>

      <div className="space-y-2">
        {activeTasks.length === 0 && (
          <div className="text-[10px] italic opacity-50 p-2 border border-dashed border-bg/20">
            No active tasks in queue.
          </div>
        )}
        {activeTasks.map(task => (
          <div key={task.id} className="bg-ink border border-bg/20 p-2 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{task.name}</span>
              <span className="text-[8px] font-mono opacity-50">{task.target}</span>
            </div>
            <div className="w-full bg-bg/10 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-500" 
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[8px] font-mono">
              <span className="flex items-center gap-1">
                <Loader2 className="w-2 h-2 animate-spin" />
                {task.status}
              </span>
              <span>{task.progress}%</span>
            </div>
          </div>
        ))}
      </div>

      {completedTasks.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-6 mb-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Recent History</h3>
          </div>
          <div className="space-y-1">
            {completedTasks.map(task => (
              <div key={task.id} className="flex justify-between items-center text-[9px] font-mono opacity-70 border-b border-bg/10 pb-1">
                <span className="flex items-center gap-2">
                  {task.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                  {task.name}
                </span>
                <span className="opacity-50">{task.timestamp}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
