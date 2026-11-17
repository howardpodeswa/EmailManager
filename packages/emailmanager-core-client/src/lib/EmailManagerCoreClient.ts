import {
  type ApiAxiosInstance,
  type ApiClient,
  ApiClientBuilder,
  extractDeleteResponse,
  extractGetByIdResponse,
  extractListResponse,
} from '@emailmanager/api-client-utils'
import {
  emailManagerCoreContract,
  type ListInboxThreadsQuery,
  type ListInboxThreadsResponse,
  type SessionInfo,
} from '@emailmanager/emailmanager-core-contract'

export class EmailManagerCoreClient {
  private readonly client: ApiClient<typeof emailManagerCoreContract>

  public constructor(axiosInstance: ApiAxiosInstance) {
    this.client = ApiClientBuilder.build(emailManagerCoreContract, axiosInstance)
  }

  public readonly session = {
    /** The signed-in user. Throws an `UnauthorizedError` when not signed in. */
    get: async (): Promise<SessionInfo | undefined> =>
      extractGetByIdResponse(this.client.session.get()) as Promise<SessionInfo | undefined>,
  }

  public readonly auth = {
    signOut: async (): Promise<void> => extractDeleteResponse(this.client.auth.signOut({ body: {} })),
  }

  public readonly inbox = {
    listThreads: async (query: ListInboxThreadsQuery = {}): Promise<ListInboxThreadsResponse> =>
      extractListResponse(this.client.inbox.listThreads({ query })),
  }
}
