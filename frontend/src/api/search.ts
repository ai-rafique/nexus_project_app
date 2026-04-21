import { apiClient } from './client';

export type SearchResultType = 'requirement' | 'document' | 'test';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  label: string;
  sub: string;
  url: string;
}

export const searchApi = {
  search: (q: string) =>
    apiClient.get<{ results: SearchResult[] }>('/search', { params: { q } }).then((r) => r.data.results),
};
