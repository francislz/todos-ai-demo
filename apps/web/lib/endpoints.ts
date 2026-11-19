/** HTTP API endpoints, shared by the client and the tests. */
export const API_ENDPOINTS = {
  todos: '/api/todos',
  labels: '/api/labels',
} as const;

export type ApiCollectionEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];

/** URL of one resource of a collection, e.g. `/api/todos/<id>`. */
export function resourceUrl(collection: ApiCollectionEndpoint, id: string): string {
  return `${collection}/${encodeURIComponent(id)}`;
}
