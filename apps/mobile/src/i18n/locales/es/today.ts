import type { TranslationOf } from '../en'
import type { today as english } from '../en/today'

export const today: TranslationOf<typeof english> = {
  title: 'Hoy',
  generating: 'Eligiendo las actividades de hoy',
  section: {
    next: 'Siguiente',
    strengthen: 'Reforzar',
    goFurther: 'Ir más allá',
    completedToday: '{{count}} hoy',
    configureLabel: 'Configurar {{section}}',
  },
  card: {
    doneToday: 'Hecha hoy',
    writing: 'Escribiendo',
    write: 'Escribir',
    minutes: '{{count}} minutos',
    minutesShort: '{{count}} min',
  },
  goalLine: {
    foundation: 'Una base para tu ruta',
  },
  draft: {
    newActivity: 'Nueva actividad',
  },
  routine: {
    configure: 'Configurar la rutina de aprendizaje',
  },
  empty: {
    noInterest: 'Añade algo que quieras aprender para empezar.',
    exploreAllNoGoals: 'Ninguno de estos intereses tiene objetivos todavía.',
    noGoals: 'Este interés aún no tiene objetivos.',
  },
  aboutItem: 'Sobre {{name}}',
  configureSheet: {
    title: 'Ajustes de actividad: {{section}}',
    help: {
      next: 'Aprende algo nuevo del siguiente objetivo de tu ruta.',
      strengthen: 'Mejora tu memoria o tu comprensión de algo que ya has visto.',
      goFurther: 'Aplica lo que aprendes en el mundo real o conéctalo con otras ideas.',
    },
    listHelp:
      'Las actividades de aquí se crean con estos tipos. Desactiva los que prefieras no ver.',
  },
  request: {
    createTitle: 'Nueva actividad de {{section}}',
    create: 'Crear',
    forGoal: 'Para un objetivo existente (opcional)',
    activityType: 'Tipo de actividad (opcional)',
    focusPlaceholder: 'En qué centrarte o cómo te gustaría aprenderlo',
  },
  routineSheet: {
    title: 'Rutina de aprendizaje',
    feedbackNotice:
      'Por ahora las secciones son fijas. Para cambiarlo, vota o comenta en <a>el tablón de comentarios</a>.',
    next: { what: 'Aprende algo nuevo', cadence: '1 al día' },
    strengthen: { what: 'Repasa y profundiza lo que has aprendido', cadence: 'Opcional' },
    goFurther: { what: 'Pon en práctica lo aprendido o llévalo más lejos', cadence: 'Opcional' },
    generating: 'Ajustando tu rutina',
    prompt: '¿De qué te gustaría más o menos?',
    promptHint: 'Tus actividades lo seguirán a partir de ahora.',
    placeholder: 'Más práctica oral, menos gramática',
  },
}
