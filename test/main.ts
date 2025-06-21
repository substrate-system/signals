import { test } from '@substrate-system/tapzero'
import { computed, effect, signal } from '../src/index.js'

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

test('should bail out if result is the same', (t) => {
    t.plan(4)
    // Bail out if value of "B" never changes
    // A->B->C
    const a = signal('a')
    const b = computed(() => {
        a()
        return 'foo'
    })

    let spyCalls = 0
    const c = computed(() => {
        spyCalls++
        return b()
    })

    t.equal(c(), 'foo')
    t.equal(spyCalls, 1)

    a('aa')
    t.equal(c(), 'foo')
    t.equal(spyCalls, 1)
})

test('should only update every signal once (jagged diamond graph + tails)', (t) => {
    t.plan(9)
    const a = signal('a')
    const b = computed(() => a())
    const c = computed(() => a())
    const d = computed(() => c())

    let eCount = 0
    const e = computed(() => {
        eCount++
        return b() + ' ' + d()
    })

    let fCount = 0
    const f = computed(() => {
        fCount++
        return e()
    })

    let gCount = 0
    const g = computed(() => {
        gCount++
        return e()
    })

    t.equal(f(), 'a a')
    t.equal(fCount, 1)
    t.equal(g(), 'a a')
    t.equal(gCount, 1)

    a('b')
    t.equal(e(), 'b b')
    t.equal(eCount, 2)
    t.equal(f(), 'b b')
    t.equal(g(), 'b b')
    t.equal(gCount, 2)
})

test('should only subscribe to signals listened to', (t) => {
    t.plan(4)
    const a = signal('a')
    const b = computed(() => a())

    let spyCalls = 0
    computed(() => {
        spyCalls++
        return a()
    })

    t.equal(b(), 'a')
    t.equal(spyCalls, 0)

    a('aa')
    t.equal(b(), 'aa')
    t.equal(spyCalls, 0)
})

test('should only subscribe to signals listened to II', (t) => {
    t.plan(3)
    // Here both "B" and "C" are active in the beginning, but
    // "B" becomes inactive later. At that point it should
    // not receive any updates anymore.
    //    *A
    //   /   \
    // *B     D <- we don't listen to C
    //  |
    // *C
    const a = signal('a')
    const b = computed(() => a())
    const c = computed(() => b())
    const d = computed(() => a())

    let result = ''
    const unsub = effect(() => {
        result = c()
    })

    t.equal(result, 'a')
    t.equal(d(), 'a')

    unsub()
    a('aa')
    t.equal(d(), 'aa')
})

test('should ensure subs update even if one dep unmarks it', (t) => {
    t.plan(2)
    // In this scenario "C" always returns the same value. When "A"
    // changes, "B" will update, then "C" at which point its update
    // to "D" will be unmarked. But "D" must still update because
    // "B" marked it. If "D" isn't updated, then we have a bug.
    //     A
    //   /   \
    //  B     *C <- returns same value every time
    //   \   /
    //     D
    const a = signal('a')
    const b = computed(() => a())
    const c = computed(() => {
        a()
        return 'c'
    })

    let callCount = 0
    const d = computed(() => {
        callCount++
        return b() + ' ' + c()
    })

    t.equal(d(), 'a c')
    callCount = 0

    a('aa')
    d()
    t.equal(callCount, 1)
})

test('should ensure subs update even if two deps unmark it', (t) => {
    t.plan(2)
    // In this scenario both "C" and "D" always return the same
    // value. But "E" must still update because "A" marked it.
    // If "E" isn't updated, then we have a bug.
    //     A
    //   / | \
    //  B *C *D
    //   \ | /
    //     E
    const a = signal('a')
    const b = computed(() => a())
    const c = computed(() => {
        a()
        return 'c'
    })
    const d = computed(() => {
        a()
        return 'd'
    })

    let callCount = 0
    const e = computed(() => {
        callCount++
        return b() + ' ' + c() + ' ' + d()
    })

    t.equal(e(), 'a c d')
    callCount = 0

    a('aa')
    e()
    t.equal(callCount, 1)
})

test('should support lazy branches', (t) => {
    t.plan(3)
    const a = signal(0)
    const b = computed(() => a())
    const c = computed(() => (a() > 0 ? a() : b()))

    t.equal(c(), 0)
    a(1)
    t.equal(c(), 1)

    a(0)
    t.equal(c(), 0)
})

test('should not update a sub if all deps unmark it', (t) => {
    t.plan(2)
    // In this scenario "B" and "C" always return the same value. When "A"
    // changes, "D" should not update.
    //     A
    //   /   \
    // *B     *C
    //   \   /
    //     D
    const a = signal('a')
    const b = computed(() => {
        a()
        return 'b'
    })
    const c = computed(() => {
        a()
        return 'c'
    })

    let callCount = 0
    const d = computed(() => {
        callCount++
        return b() + ' ' + c()
    })

    t.equal(d(), 'b c')
    callCount = 0

    a('aa')
    t.equal(callCount, 0)
})

test('should keep graph consistent on errors during activation', (t) => {
    t.plan(2)
    const a = signal(0)
    const b = computed(() => {
        throw new Error('fail')
    })
    const c = computed(() => a())

    t.throws(() => b(), null, 'fail')

    a(1)
    t.equal(c(), 1)
})

test('should keep graph consistent on errors in computeds', (t) => {
    t.plan(3)
    const a = signal(0)
    const b = computed(() => {
        if (a() === 1) throw new Error('fail')
        return a()
    })
    const c = computed(() => b())

    t.equal(c(), 0)

    a(1)
    t.throws(() => b(), null, 'fail')

    a(2)
    t.equal(c(), 2)
})
