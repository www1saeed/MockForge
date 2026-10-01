import { createButton, createField, Field, FieldType, Project, text } from './project.model';

/** Commercial examples are fictional briefs, never customer claims. */
export type ExampleKind = 'saas' | 'commerce' | 'agency' | 'complex';
export function example(kind: ExampleKind): Project {
  const base: Project = {
    schemaVersion: '1.3.0',
    languages: ['de', 'en'],
    buttons: [createButton('submit', text('Anfrage senden', 'Send request'))],
    name: '',
    owner: '',
    audience: '',
    goal: '',
    scope: '',
    title: text('', ''),
    description: text('', ''),
    submit: text('Anfrage senden', 'Send request'),
    theme: 'bootstrap',
    columns: 2,
    fields: [],
    decisions: '',
    questions: '',
    review: { checks: [false, false, false, false, false], reviewer: '', approvedAt: null },
  };
  const field = (id: string, type: FieldType, de: string, en: string, required = true): Field => ({
    ...createField(type, id),
    label: text(de, en),
    required,
  });
  if (kind === 'complex') {
    // Fictional procurement brief: decisions are explicit, while production integrations remain open.
    const team = field('team-members', 'group', 'Projektteam', 'Project team');
    team.help = text(
      'Erfasse Verantwortliche und ihre Rollen.',
      'List stakeholders and their roles.',
    );
    team.tooltip = text('Jede Karte beschreibt eine Person.', 'Each card describes one person.');
    team.group = {
      layout: 'cards',
      minItems: 1,
      maxItems: 8,
      fields: [
        { ...field('member-name', 'text', 'Name', 'Name'), minLength: 2, maxLength: 80 },
        field('member-email', 'email', 'Geschäftliche E-Mail', 'Work email'),
        {
          ...field('member-role', 'select', 'Rolle', 'Role'),
          options: [
            text('Projektleitung', 'Project lead'),
            text('Fachbereich', 'Business owner'),
            text('Technik', 'Engineering'),
          ],
        },
        field('member-start', 'date', 'Verfügbar ab', 'Available from', false),
        field('member-profile', 'url', 'Profil-Link', 'Profile link', false),
        field(
          'member-contact',
          'checkbox',
          'Kontaktperson für Rückfragen',
          'Contact for questions',
          false,
        ),
      ],
    };
    team.note =
      'At least one stakeholder is required. Role does not grant application permissions.';
    const items = field('line-items', 'group', 'Beschaffungspositionen', 'Procurement line items');
    items.help = text(
      'Ein Produkt oder eine Leistung pro Zeile.',
      'One product or service per row.',
    );
    items.group = {
      layout: 'table',
      minItems: 1,
      maxItems: 12,
      fields: [
        {
          ...field('item-code', 'text', 'Artikelcode', 'Item code'),
          pattern: '[A-Z]{2}-[0-9]{4}',
          placeholder: text('IT-2048', 'IT-2048'),
          patternMessage: text('Format: IT-2048', 'Format: IT-2048'),
          tooltip: text(
            'Zwei Großbuchstaben, Bindestrich, vier Ziffern.',
            'Two uppercase letters, a hyphen, four digits.',
          ),
        },
        field('item-name', 'text', 'Bezeichnung', 'Description'),
        field('item-quantity', 'number', 'Menge', 'Quantity'),
        {
          ...field('item-category', 'select', 'Kategorie', 'Category'),
          options: [
            text('Hardware', 'Hardware'),
            text('Software', 'Software'),
            text('Dienstleistung', 'Service'),
          ],
        },
        field('item-delivery', 'date', 'Benötigt am', 'Needed by', false),
        field('item-notes', 'textarea', 'Begründung', 'Justification', false),
      ],
    };
    items.note =
      'Quantity is captured, not priced. Server-side positivity, currency and approval rules must be agreed before implementation.';
    return {
      ...base,
      name: 'Atlas · Project & procurement',
      owner: 'Fictional procurement product owner',
      audience: 'Project leads planning a cross-functional delivery and its procurement needs',
      goal: 'Align project scope, responsible people and requested line items before finance approval.',
      scope:
        'A bilingual request with repeatable stakeholder cards and procurement rows. No pricing, identity lookup, finance approval or purchasing integration.',
      title: text('Plane dein Projekt bis ins Detail.', 'Plan your project in detail.'),
      description: text(
        'Beschreibe Ziele, Team und Beschaffung. Prüfe alle Angaben gemeinsam vor der Umsetzung.',
        'Describe goals, team and procurement. Review the details together before implementation.',
      ),
      fields: [
        {
          ...field('project-title', 'text', 'Projekttitel', 'Project title'),
          minLength: 3,
          maxLength: 120,
          placeholder: text('Kundenportal erneuern', 'Renew the customer portal'),
        },
        {
          ...field('project-code', 'text', 'Projektkennung', 'Project reference'),
          pattern: 'PRJ-[0-9]{4}',
          patternMessage: text(
            'Bitte PRJ- und vier Ziffern eingeben.',
            'Enter PRJ- followed by four digits.',
          ),
          placeholder: text('PRJ-2026', 'PRJ-2026'),
          tooltip: text(
            'Die Kennung wird später im ERP geprüft.',
            'The reference will later be verified in the ERP.',
          ),
        },
        field('request-email', 'email', 'E-Mail für Rückfragen', 'Contact email'),
        field('project-url', 'url', 'Projekt-Webseite', 'Project website', false),
        field('project-budget', 'number', 'Geplanter Betrag in EUR', 'Planned amount in EUR'),
        field('project-start', 'date', 'Gewünschter Projektstart', 'Preferred project start'),
        {
          ...field(
            'project-summary',
            'textarea',
            'Ziele und Erfolgskriterien',
            'Goals and success criteria',
          ),
          minLength: 20,
          maxLength: 2000,
          help: text(
            'Beschreibe ein konkretes Ergebnis und die Abnahme.',
            'Describe a concrete outcome and acceptance criteria.',
          ),
        },
        {
          ...field('project-department', 'select', 'Fachbereich', 'Department'),
          options: [
            text('Vertrieb', 'Sales'),
            text('Betrieb', 'Operations'),
            text('IT', 'IT'),
            text('Finanzen', 'Finance'),
          ],
        },
        {
          ...field('project-priority', 'radio', 'Priorität', 'Priority'),
          options: [
            text('Normal', 'Normal'),
            text('Hoch', 'High'),
            text('Kritisch – Begründung erforderlich', 'Critical – justification required'),
          ],
        },
        field(
          'project-remote',
          'checkbox',
          'Zusammenarbeit an mehreren Standorten',
          'Collaboration across multiple locations',
          false,
        ),
        team,
        items,
        {
          ...field(
            'project-risks',
            'textarea',
            'Risiken und Abhängigkeiten',
            'Risks and dependencies',
            false,
          ),
          maxLength: 2000,
        },
        field(
          'project-confirm',
          'checkbox',
          'Ich habe Umfang und Positionen mit den Beteiligten abgestimmt.',
          'I have aligned scope and line items with the stakeholders.',
        ),
      ],
      buttons: [
        {
          ...createButton('submit', text('Antrag prüfen', 'Review request')),
          note: 'Simulates submission; actual finance routing is outside this mockup.',
        },
        {
          ...createButton('save-draft', text('Entwurf prüfen', 'Check draft')),
          variant: 'secondary',
          action: 'save',
        },
        {
          ...createButton('clear', text('Eingaben zurücksetzen', 'Reset responses')),
          variant: 'ghost',
          action: 'reset',
        },
        {
          ...createButton('cancel', text('Abbrechen', 'Cancel')),
          variant: 'ghost',
          action: 'cancel',
        },
      ],
      submit: text('Antrag prüfen', 'Review request'),
      decisions:
        'Use cards for stakeholder profiles and a table for comparable procurement positions. Every repeated entry validates independently. Team size is 1–8; line items are 1–12. Both languages require exact labels. No totals, permissions or automatic purchasing are implied.',
      questions:
        'Who approves the amount? Which currencies and quantity ranges are allowed? How are project codes verified? What happens when stakeholders leave? Which retention rules apply to saved drafts?',
    };
  }
  if (kind === 'saas') {
    return {
      ...base,
      name: 'Orbit · SaaS onboarding',
      audience: 'Operations teams evaluating a B2B SaaS product',
      goal: 'Qualify demo requests without asking for unnecessary information.',
      scope: 'Demo request form. CRM integration is a later implementation task.',
      title: text('Dein nächster Workflow beginnt hier.', 'Your next workflow starts here.'),
      description: text(
        'Erzähle uns von deinem Team. Wir zeigen dir, wie Orbit euren Alltag vereinfacht.',
        'Tell us about your team. See how Orbit can simplify your day.',
      ),
      submit: text('Demo anfragen', 'Request a demo'),
      buttons: [createButton('submit', text('Demo anfragen', 'Request a demo'))],
      fields: [
        {
          ...field('name', 'text', 'Vollständiger Name', 'Full name'),
          placeholder: text('Alex Morgan', 'Alex Morgan'),
          minLength: 2,
        },
        {
          ...field('email', 'email', 'Geschäftliche E-Mail', 'Work email'),
          placeholder: text('alex@company.com', 'alex@company.com'),
          help: text('Hierhin senden wir deine Einladung.', 'We will send your invitation here.'),
          note: 'PO decision needed: should personal email domains be allowed?',
        },
        {
          ...field('company', 'text', 'Unternehmen', 'Company'),
          placeholder: text('Acme Studio', 'Acme Studio'),
        },
        {
          ...field('team', 'select', 'Teamgröße', 'Team size'),
          options: [
            text('1–10 Personen', '1–10 people'),
            text('11–50 Personen', '11–50 people'),
            text('51+ Personen', '51+ people'),
          ],
        },
        {
          ...field(
            'needs',
            'textarea',
            'Was möchtest du verbessern?',
            'What would you like to improve?',
            false,
          ),
          placeholder: text(
            'Zum Beispiel: Kundenanfragen schneller bearbeiten',
            'For example: respond to customers faster',
          ),
        },
        {
          ...field(
            'privacy',
            'checkbox',
            'Ich habe die Datenschutzhinweise gelesen.',
            'I have read the privacy notice.',
          ),
          note: 'Replace this copy with the approved privacy notice and link before production.',
        },
      ],
      decisions:
        'Keep the request short. Team size is a single choice. The demo confirmation is simulated.',
      questions:
        'Who owns lead routing? Is a personal email address acceptable? What is the response time promise?',
    };
  }
  if (kind === 'commerce') {
    return {
      ...base,
      name: 'Northline · Returns',
      audience: 'Customers requesting an online order return',
      goal: 'Capture the minimum information support needs to evaluate a return.',
      scope: 'Return request only. No refunds, labels or order lookup.',
      title: text('Eine Retoure, ganz unkompliziert.', 'A simpler way to return.'),
      description: text(
        'Teile uns mit, was du zurückgeben möchtest.',
        'Tell us what you would like to return.',
      ),
      submit: text('Retoure anfragen', 'Request a return'),
      theme: 'material',
      buttons: [createButton('submit', text('Retoure anfragen', 'Request a return'))],
      fields: [
        field('order', 'text', 'Bestellnummer', 'Order number'),
        field('email', 'email', 'E-Mail-Adresse', 'Email address'),
        {
          ...field('reason', 'radio', 'Grund der Retoure', 'Reason for return'),
          options: [
            text('Passt nicht', 'Does not fit'),
            text('Beschädigt', 'Damaged'),
            text('Anderer Grund', 'Other reason'),
          ],
        },
        field('details', 'textarea', 'Weitere Angaben', 'Additional details', false),
      ],
      decisions: 'Return reasons use a single choice. Never promise an automatic refund.',
      questions:
        'What is the return window? Which orders are excluded? What message appears after submission?',
    };
  }
  return {
    ...base,
    name: 'Forma · Project inquiry',
    audience: 'Companies looking for a digital product partner',
    goal: 'Help the sales team understand project fit before the first call.',
    scope: 'Inquiry form only. No booking or automatic pricing.',
    theme: 'fluent',
    title: text('Lass uns dein Vorhaben verstehen.', 'Let us understand your next project.'),
    description: text(
      'Ein paar Details helfen uns, das erste Gespräch vorzubereiten.',
      'A few details help us prepare our first conversation.',
    ),
    fields: [
      field('name', 'text', 'Dein Name', 'Your name'),
      field('email', 'email', 'E-Mail-Adresse', 'Email address'),
      {
        ...field('budget', 'select', 'Budgetrahmen', 'Budget range'),
        options: [
          text('10.000–25.000 €', '€10,000–25,000'),
          text('25.000–50.000 €', '€25,000–50,000'),
          text('Noch offen', 'To be decided'),
        ],
      },
      field('date', 'date', 'Gewünschter Start', 'Preferred start', false),
      field('brief', 'textarea', 'Was möchtest du erreichen?', 'What would you like to achieve?'),
    ],
    decisions: 'Budget includes an undecided option. Start date is optional.',
    questions: 'Who follows up? What consent wording has been reviewed?',
  };
}
