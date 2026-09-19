import type { TranslationOf } from '../en'
import type { intake as english } from '../en/intake'

export const intake: TranslationOf<typeof english> = {
  welcome: {
    greeting: 'Te damos la bienvenida a',
    body: 'Elige algo que quieras aprender. Crearemos una ruta y unas pocas cosas que hacer cada día.',
    getStarted: 'Empezar',
    signInOrRestore: 'Ya tengo una cuenta o un archivo de copia de seguridad',
    restoreFromBackup: 'Restaurar desde una copia de seguridad',
  },
  returning: {
    title: 'Hola de nuevo',
    signIn: 'Inicia sesión en tu cuenta',
    restoreFile: 'Restaurar desde un archivo de copia de seguridad',
  },
  signIn: {
    title: 'Iniciar sesión',
    restoring: 'Recuperando tu aprendizaje…',
    switchAccount: 'Usar otra cuenta',
  },
  learn: {
    question: '¿Qué cosa quieres aprender?',
    placeholder: 'Cualquier cosa que te despierte curiosidad',
    addMoreLater: 'Puedes añadir más después.',
    examples: {
      llms: 'Entender los LLM y la IA',
      personalFinance: 'Mejorar cómo manejo mis finanzas personales',
      productManagement: 'Habilidades de gestión de producto',
      climate: 'Saber más sobre el clima y la sostenibilidad',
      drawing: 'Aprender a dibujar',
      // Spanish is the reader's own language here, so the example names another.
      spanish: 'Retomar el inglés',
      german: 'Poder conversar en alemán',
      chess: 'Mejorar mi ajedrez',
    },
  },
  why: {
    question: '¿Por qué quieres aprenderlo?',
    options: {
      career: 'Por mi carrera',
      personalGoal: 'Por una meta personal',
      fun: 'Por diversión',
    },
    noteQuestion: '¿Qué quieres ser capaz de hacer y por qué?',
  },
  experience: {
    question: '¿Cuánta experiencia tienes?',
    options: {
      gettingStarted: 'Estoy empezando',
      explored: 'He explorado un poco',
      inMiddle: 'Tengo algo de base',
      experienced: 'Tengo mucha experiencia',
    },
    noteQuestion: '¿Qué has probado antes y cómo te fue?',
  },
  topics: {
    question: '¿Qué temas te parecen más relevantes?',
    generating: 'Buscando temas',
  },
  success: {
    question: '¿Qué esperas conseguir?',
    generating: 'Pensándolo bien',
  },
  chipPicker: {
    addYourOwn: 'Añadir otro',
  },
  time: {
    question: '¿Cuánto tiempo quieres dedicarle?',
    howOften: 'Con qué frecuencia',
    frequency: {
      daily: 'A diario',
      severalWeekly: 'Varias veces por semana',
      whenICan: 'Cuando pueda',
    },
    eachSession: 'Cada sesión',
    minutes_one: '{{count}} min',
    minutes_other: '{{count}} min',
    custom: 'Otra',
    customAccessibilityLabel: 'Duración personalizada de la sesión en minutos',
    minUnit: 'min',
  },
  direction: {
    question: 'Esta es una dirección para empezar.',
    evolving: 'La iremos ajustando sobre la marcha.',
    generating: 'Preparando una ruta',
    goToToday: 'Ir a Hoy',
    modeHint: {
      focus: 'Para lo que quieres avanzar con constancia.',
      exploring: 'Para lo que te despierta curiosidad, sin prisa.',
    },
    modeLabel: {
      focus: 'En foco',
      exploring: 'Explorando',
    },
    modeAccessibilityLabel: {
      focus: 'Modo: en foco. Toca para cambiar.',
      exploring: 'Modo: explorando. Toca para cambiar.',
    },
  },
  addInterest: {
    resumeTitle: '¿Seguir donde lo dejaste?',
    keepGoing: 'Seguir',
    startNew: 'Empezar algo nuevo',
  },
  leave: {
    title: '¿Terminar esto más tarde?',
    saveForLater: 'Guardar para más tarde',
    discard: 'Descartar',
  },
  optionalNote: {
    suffix: '(opcional)',
  },
  stepScreen: {
    back: 'Atrás',
    close: 'Cerrar',
  },
}
