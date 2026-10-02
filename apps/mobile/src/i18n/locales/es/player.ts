import type { TranslationOf } from '../en'
import type { player as english } from '../en/player'

export const player: TranslationOf<typeof english> = {
  back: 'Atrás',
  close: 'Cerrar',
  missing: 'Esta actividad ya no está aquí.',
  writingPage: 'Escribiendo la página {{page}}…',
  wait: {
    planning: 'Planificando tu actividad',
    writing: 'Escribiendo tu actividad',
  },
  review: {
    working: 'Un último vistazo a tus respuestas',
  },
  ask: {
    label: 'Preguntar',
    working: 'Buscando una respuesta',
    placeholder: '¿Qué tienes en mente?',
    questionLabel: 'Tu pregunta',
    askedHeading: 'Preguntaste',
  },
  freeText: {
    thinkAbout: 'Piensa en…',
    askQuestion: 'Hacer una pregunta',
  },
  fillBlank: {
    blankLabel: 'Hueco {{number}}',
    answer_one: 'Respuesta',
    answer_other: 'Respuestas',
  },
  ordering: {
    moveUp: 'Subir {{label}}',
    moveDown: 'Bajar {{label}}',
  },
  reveal: {
    show: 'Mostrar',
  },
  video: {
    openClip: 'Abrir el clip',
  },
  unknownBlock: 'Esta parte necesita una versión más reciente de la app.',
  summary: {
    celebrations: [
      'Bien hecho.',
      'Buen trabajo.',
      'Y listo.',
      'Una más.',
      'Bien merecido.',
      'Cerebro, ligeramente mejorado.',
      'Mírate, aprendiendo cosas.',
      'Neuronas: reconectadas.',
    ],
    goalLine: {
      introduce: 'Aprendiste <bold>{{goal}}</bold>.',
      strengthen: 'Reforzaste <bold>{{goal}}</bold>.',
      apply: 'Fuiste más allá con <bold>{{goal}}</bold>.',
    },
    activityType: 'Tipo de actividad: <bold>{{name}}</bold>',
    aboutItem: 'Sobre {{name}}',
    ratingPrompt: '¿Te ha sido útil?',
    rating: {
      down: 'No útil',
      mixed: 'A medias',
      up: 'Útil',
    },
    sent: 'Enviado. Gracias.',
    notePlaceholder: '¿Algo más? (opcional)',
    noteLabel: 'Detalle de la valoración',
    send: 'Enviar',
    sending: 'Enviando…',
    sendError: 'No se pudo enviar. Inténtalo más tarde.',
    shareHelp:
      'Tu valoración y tu nota se guardan en este dispositivo. Para ayudar a los desarrolladores a valorar la calidad de las actividades, puedes enviarles esta actividad con tu valoración y tu nota, pero no tus respuestas.',
  },
  error: {
    budgetUsed: 'Ya has usado la generación incluida de hoy.',
    searchFailed: 'No se pudo buscar en la web ahora mismo.',
    badOutput: 'La respuesta llegó en un formato que no pudimos usar.',
    generic: 'No se pudo generar ahora mismo.',
    outdatedClient: 'Actualiza thinkering para seguir.',
  },
  fallbackReview: {
    withConcepts: 'Vale la pena quedarse con esto: {{concepts}}.',
    bare: 'Vale la pena quedarse con la idea en torno a la que se construyó esta actividad.',
  },
}
