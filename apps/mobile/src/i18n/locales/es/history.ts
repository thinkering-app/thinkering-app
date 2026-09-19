import type { TranslationOf } from '../en'
import type { history as english } from '../en/history'

export const history: TranslationOf<typeof english> = {
  title: 'Historial',
  empty: 'Aquí aparecen las actividades que terminas.',
  entryAccessibilityLabel: '{{title}}. {{outcome}}',
  today: 'Hoy',
  yesterday: 'Ayer',
  outcomeLine: {
    introduce: 'Introducido: {{subject}}',
    introduceBare: 'Introducido',
    strengthen: 'Reforzado: {{subject}}',
    strengthenBare: 'Reforzado',
    apply: 'Puesto en práctica: {{subject}}',
    applyBare: 'Puesto en práctica',
    withVerb: '{{verb}}: {{subject}}',
  },
}
