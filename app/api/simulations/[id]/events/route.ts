import { NextRequest } from 'next/server';
import { getSimulationById } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function sseFormat(obj: any) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const controller = new AbortController();
  request.signal.addEventListener('abort', () => controller.abort());

  const encoder = new TextEncoder();
  const { id } = await params;
  const simId = parseInt(id, 10);
  if (Number.isNaN(simId)) {
    return new Response('Invalid id', { status: 400 });
  }

  let lastStatus: string | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controllerStream) {
      // Initial heartbeat & state
      try {
        const sim = await getSimulationById(simId);
        if (sim) {
          lastStatus = sim.status as string;
          controllerStream.enqueue(encoder.encode(sseFormat({ status: sim.status })));
        }
      } catch (_) {
        // ignore
      }

      const heartbeat = setInterval(() => {
        try {
          controllerStream.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {}
      }, 15000);

      const interval = setInterval(async () => {
        try {
          const sim = await getSimulationById(simId);
          if (!sim) return;
          const status = sim.status as string;
          if (status !== lastStatus) {
            lastStatus = status;
            controllerStream.enqueue(encoder.encode(sseFormat({ status })));
          }
          if (status === 'completed' || status === 'failed') {
            clearInterval(interval);
            clearInterval(heartbeat);
            try { controllerStream.close(); } catch {}
          }
        } catch (_) {
          // swallow transient errors
        }
      }, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        try { controllerStream.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Connection: 'keep-alive',
    },
  });
}
