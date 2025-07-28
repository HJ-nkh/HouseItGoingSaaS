'use client';

import InteractiveRectangle from '@/components/interactive-rectangle';

export default function TestRectanglePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Test Interactive Rectangle</h1>
        
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">Width: 12, Depth: 10 (Problematic case)</h2>
            <InteractiveRectangle
              width={12}
              depth={10}
              selectedLineId={null}
              constructionLines={[]}
              rotation={0}
            />
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Width: 10, Depth: 6 (Default case)</h2>
            <InteractiveRectangle
              width={10}
              depth={6}
              selectedLineId={null}
              constructionLines={[]}
              rotation={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
