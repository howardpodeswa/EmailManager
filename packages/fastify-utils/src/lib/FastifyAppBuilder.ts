import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import formbody from '@fastify/formbody'
import { getLogger } from '@emailmanager/logging'
import Fastify, { type FastifyInstance } from 'fastify'
import { correlationIdPlugin } from './correlationIdPlugin.js'
import { appErrorHandler } from './errorHandler.js'
import { httpLoggingPlugin } from './httpLoggingPlugin.js'

interface FastifyAppBuilderBaseOptions {
  registerRoutes: (app: FastifyInstance) => Promise<void> | void
}

/**
 * `kind` decides whether the browser-facing plugins get registered, and it's deliberately required
 * rather than defaulting: every service should state its posture out loud.
 *
 * A `userFacing` service gets cookie parsing (the session lives in an HTTP-only cookie) and CORS
 * locked to `websiteDomain` with credentials. In local dev the web app reaches the API through the
 * Vite proxy, so requests are same-origin and CORS is a backstop rather than the main path.
 */
export type FastifyAppBuilderOptions = FastifyAppBuilderBaseOptions &
  (
    | {
        kind: 'userFacing'
        websiteDomain: string
      }
    | {
        /** Service-to-service only. No CORS, no cookies. */
        kind: 'internal'
      }
  )

export class FastifyAppBuilder {
  public static async build(options: FastifyAppBuilderOptions): Promise<FastifyInstance> {
    const app = Fastify({
      logger: false,
      ignoreTrailingSlash: true,
      // Without this, `close()` waits for keep-alive sockets that are just sitting idle — a
      // healthcheck poller or a browser tab is enough to stall shutdown until the socket times out.
      // 'idle' closes those immediately while still letting in-flight requests finish.
      forceCloseConnections: 'idle',
    })

    // Correlation IDs and HTTP logging must come first so they wrap everything downstream.
    await app.register(correlationIdPlugin)
    await app.register(httpLoggingPlugin)

    await app.register(formbody)

    if (options.kind === 'userFacing') {
      await app.register(cookie)
      await app.register(cors, {
        origin: options.websiteDomain,
        allowedHeaders: ['content-type'],
        credentials: true,
      })
    }

    app.setErrorHandler(appErrorHandler)

    await options.registerRoutes(app)

    app.setNotFoundHandler((request, reply) => {
      getLogger().debug('404', { method: request.method, url: request.url })
      void reply.status(404).send({ message: 'Endpoint not found', code: 'EndpointNotFoundError' })
    })

    return app
  }
}
