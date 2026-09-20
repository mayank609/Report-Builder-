export async function fetchCollection<T>(collection: string): Promise<T[]> {
  const res = await fetch(`/api/collections/${collection}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch ${collection}`);
  return res.json();
}

export async function fetchDocument<T>(collection: string, id: string): Promise<T | null> {
  const res = await fetch(`/api/collections/${collection}/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch ${collection}/${id}`);
  return res.json();
}

export async function createDocument<T>(collection: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`/api/collections/${collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create in ${collection}`);
  return res.json();
}

export async function updateDocument<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`/api/collections/${collection}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update ${collection}/${id}`);
  return res.json();
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  const res = await fetch(`/api/collections/${collection}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete ${collection}/${id}`);
}
