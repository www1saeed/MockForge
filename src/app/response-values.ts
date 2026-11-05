import { Field } from './project.model';

export type ResponseScalar = string | boolean;
export type ResponseRow = Record<string, ResponseScalar>;
export type ResponseValues = Record<string, ResponseScalar | ResponseRow[]>;

/** Missing values must not resolve prototype members for valid IDs such as constructor. */
export function ownResponse(
  values: ResponseValues | ResponseRow,
  id: string,
): ResponseScalar | ResponseRow[] | undefined {
  return Object.hasOwn(values, id) ? values[id] : undefined;
}

export function readNativeResponse(control: Element | RadioNodeList | null): ResponseScalar {
  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox') return control.checked;
    if (control.type === 'radio') return control.checked ? control.value : '';
  }
  return (
    (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | RadioNodeList | null)
      ?.value ?? ''
  );
}

/** Serialize mounted physical rows, independently of transient DOM row identifiers. */
export function readRecordValues(
  form: HTMLFormElement,
  fields: readonly Field[],
  rowIds: ReadonlyMap<string, readonly number[]>,
): ResponseValues {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      field.group
        ? (rowIds.get(field.id) ?? []).map((row) =>
            Object.fromEntries(
              field.group!.fields.map((child) => [
                child.id,
                readNativeResponse(
                  form.elements.namedItem(`preview-${field.id}:${row}:${child.id}`),
                ),
              ]),
            ),
          )
        : readNativeResponse(form.elements.namedItem(`preview-${field.id}`)),
    ]),
  );
}

/** Assign native representations only. Event dispatch/validity refresh remains with the renderer. */
export function writeNativeResponse(control: Element | RadioNodeList | null, value: unknown): void {
  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox') control.checked = value === true;
    else if (control.type === 'radio')
      control.checked = typeof value === 'string' && control.value === value;
    else control.value = typeof value === 'string' ? value : '';
  } else if (control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)
    control.value = typeof value === 'string' ? value : '';
  else if (control instanceof RadioNodeList)
    for (const item of Array.from(control))
      if (item instanceof HTMLInputElement)
        item.checked = typeof value === 'string' && item.value === value;
}
