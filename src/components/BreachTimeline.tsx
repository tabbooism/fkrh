import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { InvestigationState } from '../types';

export function BreachTimeline({ state }: { state: InvestigationState }) {
  // Process breach history for visualization
  const breachData = state.breachHistory.reduce((acc: any[], breach) => {
    // Extract year from timestamp (e.g., "3/28/2026 @ 12:54:41 AM")
    const yearMatch = breach.timestamp.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : 'Unknown';
    const existing = acc.find(d => d.year === year);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ year, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => parseInt(a.year) - parseInt(b.year));

  // Process breach sources for a bar chart
  const sourceData = state.breachHistory.reduce((acc: any[], breach) => {
    const source = breach.source;
    const existing = acc.find(d => d.name === source);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: source, value: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const COLORS = ['#141414', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  if (state.breachHistory.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center border border-dashed border-ink/20 text-[10px] uppercase font-mono opacity-50">
        No breach data available for visualization.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white/50 border border-ink p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Breach Timeline (By Year)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={breachData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141414" opacity={0.1} />
              <XAxis 
                dataKey="year" 
                stroke="#141414" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#141414" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#141414', 
                  color: '#E4E3E0', 
                  border: 'none',
                  fontSize: '10px',
                  fontFamily: 'monospace'
                }}
              />
              <Line 
                type="stepAfter" 
                dataKey="count" 
                stroke="#141414" 
                strokeWidth={2} 
                dot={{ r: 4, fill: '#141414' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/50 border border-ink p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Breach Distribution (By Source)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#141414" opacity={0.1} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#141414" 
                fontSize={8} 
                width={80}
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#141414', 
                  color: '#E4E3E0', 
                  border: 'none',
                  fontSize: '10px',
                  fontFamily: 'monospace'
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
