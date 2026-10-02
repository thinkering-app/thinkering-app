/**
 * Spanish (neutral, tú). Glossary, used everywhere:
 * Interest: interés · Path: ruta · Goal: objetivo · Activity: actividad ·
 * Today: Hoy · History: Historial · Me: Yo · Next: Siguiente ·
 * Strengthen: Reforzar · Go further: Ir más allá · Put to use: puesto en
 * práctica · In focus: en foco · Exploring: explorando · Library item or
 * strategy: estrategia · Routine: rutina · Reflect: reflexionar (reflection:
 * reflexión) · Backup: copia de seguridad · Resource: recurso · Settings: ajustes ·
 * Feedback: comentarios (feedback board: tablón de comentarios).
 */
import type { LocaleTranslation } from '../en'
import { common } from './common'
import { history } from './history'
import { intake } from './intake'
import { library } from './library'
import { me } from './me'
import { path } from './path'
import { player } from './player'
import { today } from './today'

export const es = {
  common,
  today,
  path,
  history,
  me,
  intake,
  player,
  library,
} satisfies LocaleTranslation
