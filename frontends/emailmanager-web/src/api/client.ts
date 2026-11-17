import { AxiosInstanceBuilder } from '@emailmanager/api-client-utils'
import { EmailManagerCoreClient } from '@emailmanager/emailmanager-core-client'

/**
 * All API calls go to `/api` on the web app's own origin; Vite proxies them to emailmanager-core
 * (see vite.config.ts), so the HTTP-only session cookie is sent automatically. The base URL is
 * absolute because ts-rest hands axios full URLs.
 */
export const API_BASE_URL = `${window.location.origin}/api`

export const GOOGLE_SIGN_IN_URL = '/api/emailmanager-core/auth/google/start'

export const apiClient = new EmailManagerCoreClient(
  AxiosInstanceBuilder.build({ baseURL: API_BASE_URL, withCredentials: true }),
)
