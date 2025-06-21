import { test } from '@substrate-system/tapzero'
import { computed, signal } from '../src/index.js'

test('should correctly propagate changes through computed signals', (t) => {
    t.plan(1)
    const src = signal(0)
    const c1 = computed(() => src() % 2)
    const c2 = computed(() => c1())
    const c3 = computed(() => c2())

    c3()
    src(1)  // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
    c2()  // c1 -> none, c2 -> none
    src(3)  // c1 -> dirty, c2 -> toCheckDirty

    t.equal(c3(), 1)
})

test('should propagate updated source value through chained computations', (t) => {
    t.plan(2)
    const src = signal(0)
    const a = computed(() => src())
    const b = computed(() => a() % 2)
    const c = computed(() => src())
    const d = computed(() => b() + c())

    t.equal(d(), 0)
    src(2)
    t.equal(d(), 2)
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

    t.equal(d(), false)
    a(true)
    t.equal(d(), true)
})

test('should not update if the signal value is reverted', (t) => {
    t.plan(2)
    let times = 0

    const src = signal(0)
    const c1 = computed(() => {
        times++
        return src()
    })
    c1()
    t.equal(times, 1)
    src(1)
    src(0)
    c1()
    t.equal(times, 1)
})
