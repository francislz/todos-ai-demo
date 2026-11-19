import type { LabelResponse, LabelsResponse } from '@/lib/api-types';
import { readJsonBody, withErrorHandling } from '@/lib/http';
import { getLabelService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/** GET /api/labels → 200 { labels: Label[] } (sorted by name) */
export function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    const body: LabelsResponse = { labels: await getLabelService().list() };
    return Response.json(body);
  });
}

/**
 * POST /api/labels { name, color? }
 * → 201 { label } | 400 VALIDATION_ERROR | 409 LABEL_NAME_TAKEN | 409 LABEL_LIMIT_REACHED
 */
export function POST(request: Request): Promise<Response> {
  return withErrorHandling(async () => {
    const body: LabelResponse = {
      label: await getLabelService().create(await readJsonBody(request)),
    };
    return Response.json(body, { status: 201 });
  });
}
