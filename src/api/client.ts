import axios from 'axios'

export const api = axios.create({ baseURL: '/api', timeout: 8_000, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const session = localStorage.getItem('kurio-session')
  if (session) config.headers['x-kurio-session'] = session
  const scenario = localStorage.getItem('kurio-mock-scenario')
  if (scenario) config.headers['x-kurio-scenario'] = scenario
  return config
})
