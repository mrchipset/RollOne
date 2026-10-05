import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

// 每个用例都从无持久化偏好开始，避免 localStorage 在用例之间泄漏
beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})
