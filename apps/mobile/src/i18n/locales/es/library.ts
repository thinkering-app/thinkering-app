import type { LibraryItemCopy } from '../en/library'

export const library: Record<string, Partial<LibraryItemCopy>> = {
  // Siguiente
  'plain-explainer': {
    name: 'Explicación sencilla',
    overview: 'Conoce la idea con una comparación cotidiana y luego precísala.',
    whyItHelps: 'Relacionar algo nuevo con algo que ya sabes hace que se te quede mejor.',
  },
  'worked-example': {
    name: 'Ejemplo resuelto',
    overview: 'Sigue un ejemplo paso a paso y luego haz tú un paso.',
    whyItHelps:
      'Estudiar un ejemplo resuelto enseña un método más rápido que resolverlo desde cero, sobre todo al principio.',
  },
  'guided-discovery': {
    name: 'Descubrimiento guiado',
    overview: 'Responde unas preguntas que te llevan a la idea por tu cuenta.',
    whyItHelps: 'Deducir algo antes de que tenga nombre hace que se recuerde mejor.',
  },
  'mini-case': {
    name: 'Caso breve',
    overview: 'Lee una historia real y breve, decide qué harías y luego analízala.',
    whyItHelps: 'Una historia muestra por qué importa una idea y le da a tu memoria un gancho.',
  },
  'big-picture-map': {
    name: 'Mapa general',
    overview: 'Mira dónde encaja esta idea dentro de la materia en su conjunto.',
    whyItHelps: 'Conocer la forma de una materia facilita ubicar cada pieza nueva.',
    activation: 'Activada por defecto hasta que empieces tu primer objetivo.',
  },
  'watch-along': {
    name: 'Mira y responde',
    overview: 'Mira un clip breve con preguntas por el camino.',
    whyItHelps: 'Pararte a responder preguntas convierte mirar en aprender.',
  },
  'guided-reading': {
    name: 'Lectura guiada',
    overview: 'Lee un fragmento breve con una pregunta en mente.',
    whyItHelps: 'Leer con un propósito te ayuda a notar y retener lo que importa.',
  },

  // Reforzar
  'retrieval-quiz': {
    name: 'Recuerdo rápido',
    overview: 'Responde de memoria unas preguntas rápidas.',
    whyItHelps: 'Sacar algo de la memoria es lo que hace que se quede.',
  },
  'explain-back': {
    name: 'Explícalo tú',
    overview: 'Explica la idea con tus palabras y recibe comentarios.',
    whyItHelps: 'Decirlo con tus palabras muestra lo que entiendes y lo que falta.',
  },
  'spot-the-error': {
    name: 'Encuentra el error',
    overview: 'Encuentra lo que falla en un ejemplo y corrígelo.',
    whyItHelps: 'Detectar errores afina tu idea de cómo se ve lo correcto.',
  },
  'compare-contrast': {
    name: 'Compara y contrasta',
    overview: 'Pon lado a lado dos ideas que se confunden fácilmente.',
    whyItHelps: 'Ver exactamente en qué se diferencian dos ideas evita que las mezcles.',
  },
  'faded-example': {
    name: 'Completa el ejemplo',
    overview: 'Rellena los pasos que faltan en un ejemplo resuelto.',
    whyItHelps: 'Es el puente entre seguir un método y usarlo por tu cuenta.',
  },
  'mixed-review': {
    name: 'Repaso mixto',
    overview: 'Responde preguntas que mezclan lo reciente con objetivos anteriores.',
    whyItHelps: 'Alternar entre temas cuesta más, y eso es lo que hace que dure.',
    activation: 'Se activa sola cuando hayas empezado tres objetivos.',
  },
  'focused-drill': {
    name: 'Práctica dirigida',
    overview: 'Practica de forma breve y concreta un punto débil.',
    whyItHelps:
      'Practicar justo por encima de tu zona de confort, con comentarios cada vez, es lo que más rápido construye una habilidad.',
  },
  'notice-training': {
    name: 'Entrena la mirada',
    overview: 'Clasifica ejemplos rápidos para entrenar tu ojo con los patrones.',
    whyItHelps:
      'Muchos juicios rápidos y corregidos construyen el reconocimiento instantáneo de un experto.',
  },

  // Ir más allá
  'put-to-work': {
    name: 'Ponlo a trabajar',
    overview: 'Planea cómo usar esto en tu propio proyecto, tu trabajo o tu vida.',
    whyItHelps: 'Usar una idea en algo real es como se hace tuya.',
    outcomeLabel: 'Puesto en práctica',
  },
  'scenario-challenge': {
    name: 'Reto de escenario',
    overview: 'Toma decisiones en una situación nueva y mira qué pasa.',
    whyItHelps:
      'Tomar las decisiones tú, no solo elegir respuestas, te prepara para las de verdad.',
    outcomeLabel: 'Puesto en práctica',
  },
  'teach-back': {
    name: 'Enséñalo',
    overview: 'Planea cómo le explicarías esto a alguien que conoces.',
    whyItHelps: 'Prepararte para enseñar te muestra dónde tu comprensión tiene huecos.',
    outcomeLabel: 'Puesto en práctica',
  },
  'make-something': {
    name: 'Crea algo pequeño',
    overview: 'Haz una cosa pequeña con lo que has aprendido.',
    whyItHelps: 'Producir algo, por pequeño que sea, usa lo que sabes de una forma nueva.',
    outcomeLabel: 'Puesto en práctica',
  },
  'in-the-wild': {
    name: 'En el mundo real',
    overview: 'Observa de cerca algo real: un artículo, un gráfico, un recurso guardado.',
    whyItHelps: 'Descubrir ideas en el mundo conecta lo que aprendes con el lugar donde se usa.',
    outcomeLabel: 'Puesto en práctica',
  },
  'dig-deeper': {
    name: 'Más a fondo',
    overview: 'Explora las excepciones y los casos límite que la introducción omitió.',
    whyItHelps:
      'Las primeras explicaciones simplifican; los matices son lo que hace precisa tu comprensión.',
    outcomeLabel: 'Profundizado',
  },
  'connect-ideas': {
    name: 'Conecta ideas',
    overview: 'Relaciona este objetivo con otro objetivo, interés o campo.',
    whyItHelps: 'Las ideas que has conectado son más fáciles de recordar y usar juntas.',
    outcomeLabel: 'Ampliado',
  },
}
