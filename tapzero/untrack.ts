import { test } from '@substrate-system/tapzero'
import { computed, effect, effectScope, setCurrentSub, signal } from '../src/index.js'

test('should pause tracking in computed', (t) => {
    t.plan(4)
    const src = signal(0)

    let computedTriggerTimes = 0
    const c = computed(() => {
        computedTriggerTimes++
        const currentSub = setCurrentSub(undefined)
        const value = src()
        setCurrentSub(currentSub)
        return value
    })

    t.equal(c(), 0)
    t.equal(computedTriggerTimes, 1)

    src(1)
    src(2)
    src(3)

    t.equal(c(), 0)
    t.equal(computedTriggerTimes, 1)
})

test('should pause tracking in effect', (t) => {
    t.plan(7)
    const src = signal(0)
    const is = signal(0)

    let effectTriggerTimes = 0
    effect(() => {
        effectTriggerTimes++
        if (is()) {
            const currentSub = setCurrentSub(undefined)
            src()
            setCurrentSub(currentSub)
        }
    })

    t.equal(effectTriggerTimes, 1)

    is(1)
    t.equal(effectTriggerTimes, 2)

    src(1)
    src(2)
    src(3)

    t.equal(effectTriggerTimes, 2)

    is(2)
    t.equal(effectTriggerTimes, 3)

    src(4)
    src(5)
    src(6)
    t.equal(effectTriggerTimes, 3)

    is(0)
    t.equal(effectTriggerTimes, 4)

    src(7)
    src(8)
    src(9)
    t.equal(effectTriggerTimes, 4)
})

test('should pause tracking in effect scope', (t) => {
    t.plan(2)
    const src = signal(0)

    let effectTriggerTimes = 0
    effectScope(() => {
        effect(() => {
            effectTriggerTimes++
            const currentSub = setCurrentSub(undefined)
            src()
            setCurrentSub(currentSub)
        })
    })

    t.equal(effectTriggerTimes, 1)

    src(1)
    src(2)
    src(3)
    t.equal(effectTriggerTimes, 1)
})

