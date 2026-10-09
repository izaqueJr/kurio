import axios, { AxiosError } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '../domain'
import { getGuestId, getSessionToken } from './session-storage'
import { transportReady } from './transport'

export const API_TIMEOUT_MS = 8_000

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

/** Erro normalizado de transporte: todo consumidor recebe `code`, `message` e erros por campo. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | 'NETWORK' | 'TIMEOUT' | 'CANCELED' | 'UNKNOWN',
    message: string,
    readonly status?: number,
    readonly fields: Record<string, string> = {},
    readonly body?: ApiErrorBody,
  ) {
    super(message)
    this.name = 'ApiError'
  }
  get retryable() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT' || this.code === 'TRANSIENT' || (this.status ?? 0) >= 500
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError('CANCELED', 'Requisição cancelada.')
  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError('TIMEOUT', 'O servidor demorou para responder. Tente novamente.')
    }
    const data = error.response?.data as Partial<ApiErrorBody> | undefined
    if (!error.response) return new ApiError('NETWORK', 'Sem conexão com o servidor. Verifique sua rede e tente novamente.')
    return new ApiError(
      data?.code ?? (error.response.status >= 500 ? 'TRANSIENT' : 'UNKNOWN'),
      data?.message ?? 'Não foi possível concluir a operação. Tente novamente.',
      error.response.status,
      data?.fields ?? {},
      data as ApiErrorBody | undefined,
    )
  }
  return new ApiError('UNKNOWN', 'Não foi possível concluir a operação. Tente novamente.')
}

export function errorMessage(error: unknown) {
  return toApiError(error).message
}

type ExpiredListener = () => void
let expiredListener: ExpiredListener | undefined

/** Registrado pela camada de sessão para reagir a `SESSION_EXPIRED` em qualquer chamada. */
export function onSessionExpired(listener: ExpiredListener) {
  expiredListener = listener
  return () => { if (expiredListener === listener) expiredListener = undefined }
}

api.interceptors.request.use(async (config) => {
  await transportReady
  const token = getSessionToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['x-guest-id'] = getGuestId()
  return config
})

api.interceptors.response.use(undefined, (error: unknown) => {
  const normalized = toApiError(error)
  if (normalized.code === 'SESSION_EXPIRED') expiredListener?.()
  return Promise.reject(normalized)
})
