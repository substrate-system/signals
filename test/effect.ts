import { test } from '@substrate-system/tapzero'
import { computed, effect, effectScope, endBatch, setCurrentSub, signal, startBatch } from '../src/index.js'

test('should clear subscriptions when untracked by all subscribers', (t) => {
    t.plan(3)
    let bRunTimes = 0
    const a = signal(1)
    const b = computed(() => {
        bRunTimes++
        return a() * 2
    })
    const stopEffect = effect(() => {
        b()
    })
    t.equal(bRunTimes, 1)
    a(2)
    t.equal(bRunTimes, 2)
    stopEffect()
    a(3)
    t.equal(bRunTimes, 2)
})

test('should not run untracked inner effect', (t) => {
    t.plan(1)
    const a = signal(3)
    const b = computed(() => a() > 0)
    effect(() => {
        if (b()) {
            effect(() => {
                if (a() === 0) {
                    t.ok(false, 'should not throw')
                }
            })
        }
    })
    a(2)
    a(1)
    a(0)
    t.ok(true, 'no error thrown')
})

test('should run outer effect first', (t) => {
    t.plan(1)
    const a = signal(1)
    const b = signal(1)
    effect(() => {
        if (a()) {
            effect(() => {
                b()
                if (a() === 0) {
                    t.ok(false, 'should not throw')
                }
            })
        }
    })
    startBatch()
    b(0)
    a(0)
    endBatch()
    t.ok(true, 'no error thrown')
})

test('should not trigger inner effect when resolve maybe dirty', (t) => {
    t.plan(1)
    const a = signal(0)
    const b = computed(() => a() % 2)
    let innerTriggerTimes = 0
    effect(() => {
        effect(() => {
            b()
            innerTriggerTimes++
            if (innerTriggerTimes >= 2) {
                t.ok(false, 'should not trigger twice')
            }
        })
    })
    a(2)
    t.ok(true, 'inner effect triggered only once')
})

test('should trigger inner effects in sequence', (t) => {
    t.plan(1)
    const a = signal(0)
    const b = signal(0)
    const c = computed(() => a() - b())
    const order:string[] = []
    effect(() => {
        c()
        effect(() => {
            order.push('first inner')
            a()
        })
        effect(() => {
            order.push('last inner')
            a()
            b()
        })
    })
    order.length = 0
    startBatch()
    b(1)
    a(1)
    endBatch()
    t.equal(JSON.stringify(order), JSON.stringify(['first inner', 'last inner']))
})

test('should trigger inner effects in sequence in effect scope', (t) => {
    t.plan(1)
    const a = signal(0)
    const b = signal(0)
    const order:string[] = []
    effectScope(() => {
        effect(() => {
            order.push('first inner')
            a()
        })
        effect(() => {
            order.push('last inner')
            a()
            b()
        })
    })
    order.length = 0
    startBatch()
    b(1)
    a(1)
    endBatch()
    t.equal(JSON.stringify(order), JSON.stringify(['first inner', 'last inner']))
})

test('should custom effect support batch', (t) => {
    t.plan(1)
    function batchEffect (fn) {
        return effect(() => {
            startBatch()
            try {
                return fn()
            } finally {
                endBatch()
            }
        })
    }
    const logs:string[] = []
    const a = signal(0)
    const b = signal(0)
    const aa = computed(() => {
        logs.push('aa-0')
        if (!a()) {
            b(1)
        }
        logs.push('aa-1')
    })
    const bb = computed(() => {
        logs.push('bb')
        return b()
    })
    batchEffect(() => {
        bb()
    })
    batchEffect(() => {
        aa()
    })
    t.equal(JSON.stringify(logs), JSON.stringify(['bb', 'aa-0', 'aa-1', 'bb']))
})

test('should duplicate subscribers do not affect the notify order', (t) => {
    t.plan(1)
    const src1 = signal(0)
    const src2 = signal(0)
    const order:string[] = []
    effect(() => {
        order.push('a')
        const currentSub = setCurrentSub(undefined)
        const isOne = src2() === 1
        setCurrentSub(currentSub)
        if (isOne) {
            src1()
        }
        src2()
        src1()
    })
    effect(() => {
        order.push('b')
        src1()
    })
    src2(1)
    order.length = 0
    src1(src1() + 1)
    t.equal(JSON.stringify(order), JSON.stringify(['a', 'b']))
})

test('should handle side effect with inner effects', (t) => {
    t.plan(2)
    const a = signal(0)
    const b = signal(0)
    const order:string[] = []
    effect(() => {
        effect(() => {
            a()
            order.push('a')
        })
        effect(() => {
            b()
            order.push('b')
        })
        t.equal(JSON.stringify(order), JSON.stringify(['a', 'b']))
        order.length = 0
        b(1)
        a(1)
        t.equal(JSON.stringify(order), JSON.stringify(['b', 'a']))
    })
})

test('should handle flags are indirectly updated during checkDirty', (t) => {
    t.plan(2)
    const a = signal(false)
    const b = computed(() => a())
    const c = computed(() => {
        b()
        return 0
    })
    const d = computed(() => {
        c()
        return b()
    })
    let triggers = 0
    effect(() => {
        d()
        triggers++
    })
    t.equal(triggers, 1)
    a(true)
    t.equal(triggers, 2)
})

