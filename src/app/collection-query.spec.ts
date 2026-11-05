import { createField, text, parseApplicationProject, example } from './project';
import { createCollectionList } from './collection.model';
import { ApplicationForm } from './application-project';
import { collectionSignature, queryCollection, validRecordValues } from './collection-query';
import { ownResponse, readRecordValues, writeNativeResponse } from './response-values';

describe('Collection queries and native values', () => {
  const form = (): ApplicationForm => {
    const form = parseApplicationProject(example('saas'))!.forms[0];
    form.fields = [
      { ...createField('text', 'constructor'), label: text('Name', 'Name') },
      createField('number', 'amount'),
      { ...createField('select', 'state'), options: [text('Offen', 'Open'), text('Zu', 'Closed')] },
      createField('checkbox', 'flag'),
    ];
    return form;
  };
  it('combines fixed filters, reader filters, localized search and stable numeric sorting without mutating records', () => {
    const f = form(),
      list = createCollectionList(f.fields, []);
    list.filters = ['flag'];
    list.presets = [{ fieldId: 'state', value: '0' }];
    const records = [
      { id: '1', values: { constructor: 'Ada', amount: '10', state: '0', flag: true } },
      { id: '2', values: { constructor: 'Ada', amount: '2', state: '0', flag: true } },
      { id: '3', values: { constructor: 'Ada', amount: '1', state: '1', flag: true } },
      { id: '4', values: { constructor: 'Ada', amount: '0', state: '0', flag: false } },
    ];
    const query = {
      search: 'open',
      filters: new Map([['flag', true]]),
      sort: { fieldId: 'amount', direction: 'asc' as const },
    };
    expect(queryCollection(f, list, records, query, 'en').map((r) => r.id)).toEqual(['2', '1']);
    expect(queryCollection(f, list, records, query, 'de')).toEqual([]);
    expect(records.map((r) => r.id)).toEqual(['1', '2', '3', '4']);
    expect(ownResponse({}, 'constructor')).toBeUndefined();
  });
  it('marks answer-rule and option-order changes stale, retaining data through copy and field-order edits', () => {
    const f = form(),
      signature = collectionSignature(f, 'en');
    f.fields.reverse();
    f.fields[0].label.en = 'Changed';
    expect(collectionSignature(f, 'en')).toBe(signature);
    f.fields[0].required = true;
    expect(collectionSignature(f, 'en')).not.toBe(signature);
    expect(
      validRecordValues(form().fields, { constructor: 'A', amount: '2', state: '0', flag: false }),
    ).toBe(true);
    expect(
      validRecordValues(form().fields, { constructor: 'A', amount: '2', state: '99', flag: false }),
    ).toBe(false);
    expect(validRecordValues(form().fields, {})).toBe(false);
    expect(validRecordValues(form().fields, {}, true)).toBe(true);
  });
  it('reads a single unchecked radio and sparse group row identities, and restores native choices', () => {
    const group = createField('group', 'items');
    group.group!.fields = [createField('checkbox', 'flag')];
    const radio = createField('radio', 'choice');
    const native = document.createElement('form');
    native.innerHTML =
      '<input type="radio" name="preview-choice" value="0"><input type="checkbox" name="preview-items:7:flag">';
    const rows = new Map([['items', [7]]]);
    expect(readRecordValues(native, [radio, group], rows)).toEqual({
      choice: '',
      items: [{ flag: false }],
    });
    writeNativeResponse(native.elements.namedItem('preview-choice'), '0');
    writeNativeResponse(native.elements.namedItem('preview-items:7:flag'), true);
    expect(readRecordValues(native, [radio, group], rows)).toEqual({
      choice: '0',
      items: [{ flag: true }],
    });
    native.innerHTML += '<input type="radio" name="preview-choice" value="1">';
    writeNativeResponse(native.elements.namedItem('preview-choice'), '1');
    expect(readRecordValues(native, [radio], new Map())).toEqual({ choice: '1' });
  });
});
