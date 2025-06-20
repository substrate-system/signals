import { test } from '@substrate-system/tapzero'
import { computed, signal } from '../src/index.js'

test('should drop A->B->A updates', (t) => {
    t.plan(3)
    // we are checking that the compute function is called the correct
    // number of times

    //     A
    //   / |
    //  B  | <- Looks like a flag doesn't it? :D
    //   \ |
    //     C
    //     |
    //     D
    const a = signal(2)
    const b = computed(() => a() - 1)
    const c = computed(() => a() + b())
    const d = computed(() => {
        t.ok(true, 'should call this function once')
        return 'd: ' + c()
    })

    t.equal(d(), 'd: 3')

    a(4)
    d()
})

test('should only update every signal once (diamond graph)', (t) => {
    t.plan(4)
    // In this scenario "D" should only update once when "A" receives
    // an update. This is sometimes referred to as the "diamond" scenario.
    //     A
    //   /   \
    //  B     C
    //   \   /
    //     D

    const a = signal('a')
    const b = computed(() => a())
    const c = computed(() => a())
    const d = computed(() => {
        t.ok(true, 'counting...')
        return b() + ' ' + c()
    })

    t.equal(d(), 'a a', 'd has the right value')

    a('aa')
    t.equal(d(), 'aa aa', 'd should have the right value')
})

test('should only update every signal once (diamond graph + tail)', (t) => {
    t.plan(4)
    // "E" will be likely updated twice if our mark+sweep logic is buggy.
    //     A
    //   /   \
    //  B     C
    //   \   /
    //     D
    //     |
    //     E

    const a = signal('a')
    const b = computed(() => a())
    const c = computed(() => a())
    const d = computed(() => b() + ' ' + c())
    const e = computed(() => {
        t.ok('counting...')
        return d()
    })

    t.equal(e(), 'a a')

    a('aa')
    t.equal(e(), 'aa aa')
})
