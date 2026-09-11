export function v2EntityDisplayName(entity: { id: string; name?: string }): string {
  return entity.name?.trim() || entity.id;
}
