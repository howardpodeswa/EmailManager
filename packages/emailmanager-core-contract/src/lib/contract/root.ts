import { initContract } from '@ts-rest/core'
import { authContract } from './auth.js'
import { inboxContract } from './inbox.js'
import { sessionContract } from './session.js'

const c = initContract()

export const emailManagerCoreContract = c.router(
  {
    session: sessionContract,
    auth: authContract,
    inbox: inboxContract,
  },
  {
    pathPrefix: '/emailmanager-core',
  },
)
