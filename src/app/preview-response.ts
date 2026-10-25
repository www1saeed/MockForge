/** Physical row position is reproducible; transient native row IDs are deliberately ignored. */
export function previewResponseScope(groupId: string | undefined, instance: number): string {
  return groupId ? `preview-${groupId}:${instance}` : 'root';
}

export function controlResponseScope(name: string, instance: number): string {
  const separator = name.indexOf(':');
  return previewResponseScope(
    separator < 0 ? undefined : name.slice('preview-'.length, separator),
    instance,
  );
}

export function patternDataKey(id: string, scope: string): string {
  return `${id}|${scope}`;
}
