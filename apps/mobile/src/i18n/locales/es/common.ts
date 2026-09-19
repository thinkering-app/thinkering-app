import type { TranslationOf } from '../en'
import type { common as english } from '../en/common'

export const common: TranslationOf<typeof english> = {
  tryAgain: 'Reintentar',
  save: 'Guardar',
  done: 'Listo',
  continue: 'Continuar',
  add: 'Añadir',
  cancel: 'Cancelar',
  back: 'Atrás',
  close: 'Cerrar',
  screenError: 'Algo salió mal en esta pantalla.',
  dbUnavailable: {
    anotherTab: 'thinkering está abierto en otra pestaña. Ciérrala para seguir aquí.',
    noStorage:
      'Este navegador no deja que thinkering guarde nada. La navegación privada lo impide.',
    unknown: 'Algo salió mal al preparar tus datos. Reinicia la app.',
  },
  addInterest: 'Añadir un interés',
  sendFeedback: 'Enviar comentarios',
  tabs: {
    today: 'Hoy',
    path: 'Ruta',
    history: 'Historial',
    me: 'Yo',
  },
  calendarMonth: {
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
  },
  interestSelector: {
    explore: 'Explorar',
    all: 'Todos',
  },
  textField: {
    counter: '{{length}} / {{max}}',
    counterOver: '{{length}} / {{max}} · demasiado largo para enviar',
  },
}
