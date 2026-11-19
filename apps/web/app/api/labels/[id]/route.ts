import type { LabelResponse } from '@/lib/api-types';
import { readJsonBody, withErrorHandling, type IdRouteContext } from '@/lib/http';
import { getLabelService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/labels/:id { name?, color? } (at least one)
 * → 200 { label } | 400 VALIDATION_ERROR | 404 LABEL_NOT_FOUND | 409 LABEL_NAME_TAKEN
 */
export function PATCH(request: Request, { params }: IdRouteContext): Promise<Response> {
  return withErrorHandling(async () => {
    const { id } = await params;
    const body: LabelResponse = {
      label: await getLabelService().update(id, await readJsonBody(request)),
    };
    return Response.json(body);
  });
}

/** DELETE /api/labels/:id → 204 (the id is removed from every todo) | 404 LABEL_NOT_FOUND */
export function DELETE(_request: Request, { params }: IdRouteContext): Promise<Response> {
  return withErrorHandling(async () => {
    const { id } = await params;
    await getLabelService().remove(id);
    return new Response(null, { status: 204 });
  });
}
