import { describe, expect, it } from 'vitest'
import { FREQUENCIES, WHY_CHOICES } from '../domain'
import { placeInterest } from './placement'

describe('placeInterest (D15)', () => {
  it('places for-fun + when-I-can as the only exploring combination', () => {
    const exploring = FREQUENCIES.flatMap((frequency) =>
      WHY_CHOICES.filter((whyChoice) => placeInterest({ frequency, whyChoice }) === 'exploring').map(
        (whyChoice) => `${frequency}/${whyChoice}`,
      ),
    )
    expect(exploring).toEqual(['when_i_can/fun'])
  })
})
