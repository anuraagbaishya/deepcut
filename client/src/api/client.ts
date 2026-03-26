import type { ListSummary, FullList, ListItem } from '../types';

const BASE_URL = '/api';

export async function fetchLists(): Promise<ListSummary[]> {
  const res = await fetch(`${BASE_URL}/lists`);
  if (!res.ok) {
    throw new Error(`Failed to fetch lists: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchList(slug: string): Promise<FullList> {
  const res = await fetch(`${BASE_URL}/lists/${slug}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch list "${slug}": ${res.statusText}`);
  }
  return res.json();
}

export interface ListPayload {
  slug: string;
  title: string;
  category: string;
  description: string;
  items: ListItem[];
}

export async function createList(payload: ListPayload): Promise<FullList> {
  const res = await fetch(`${BASE_URL}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to create list: ${res.statusText}`);
  }
  return res.json();
}

export async function updateList(slug: string, payload: ListPayload): Promise<FullList> {
  const res = await fetch(`${BASE_URL}/lists/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to update list: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteList(slug: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/lists/${slug}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to delete list: ${res.statusText}`);
  }
}
