import { test } from '@substrate-system/tapzero'
import { effect, effectScope, signal } from '../src/index.js'

test('should not trigger after stop', (t) => {
    t.plan(4)
    const count = signal(1)
    let triggers = 0
    const stopScope = effectScope(() => {
        effect(() => {
            triggers++
            count()
        })
        t.equal(triggers, 1)
        count(2)
        t.equal(triggers, 2)
    })
    count(3)
    t.equal(triggers, 3)
    stopScope()
    count(4)
    t.equal(triggers, 3)
})

test('should dispose inner effects if created in an effect', (t) => {
    t.plan(3)
    const source = signal(1)
    let triggers = 0
    effect(() => {
        const dispose = effectScope(() => {
            effect(() => {
                source()
                triggers++
            })
        })
        t.equal(triggers, 1)
        source(2)
        t.equal(triggers, 2)
        dispose()
        source(3)
        t.equal(triggers, 2)
    })
})

