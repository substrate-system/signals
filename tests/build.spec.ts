import { expect, test } from 'vitest'

test('build: cjs', async () => {
    const index = await import('../dist/index.js')
    const system = await import('../dist/system.js')

    expect(typeof index.createReactiveSystem).toBe('function')
    expect(typeof system.createReactiveSystem).toBe('function')
})

test('build: esm', async () => {
    const index = await import('../dist/index.js')
    const system = await import('../dist/system.js')

    expect(typeof index.createReactiveSystem).toBe('function')
    expect(typeof system.createReactiveSystem).toBe('function')
})
