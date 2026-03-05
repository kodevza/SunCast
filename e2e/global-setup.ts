import { rm } from 'node:fs/promises'

export default async function globalSetup() {
  if (process.env.PW_COVERAGE !== '1') {
    return
  }

  await rm('.nyc_output', { recursive: true, force: true })
  await rm('coverage', { recursive: true, force: true })
}
