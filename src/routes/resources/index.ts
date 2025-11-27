import { DurableObject } from 'cloudflare:workers'

interface PatchPayload {
  elements: string
  selector: string
  mode?: 'outer' | 'inner' | 'replace' | 'prepend' | 'append' | 'before' | 'after' | 'remove'
  useViewTransition?: boolean
}

export abstract class BaseResource extends DurableObject {
  private sessions = new Map<string, WritableStream>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  protected abstract render(): Promise<string>

  protected abstract getUiSelector(): string

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/stream') {
      return this.handleStreamRequest(request)
    }
    return new Response('Not Found', { status: 404 })
  }

  private handleStreamRequest(request: Request): Response {
    const { readable, writable } = new TransformStream()
    const sessionId = crypto.randomUUID()
    this.sessions.set(sessionId, writable)

    request.signal.addEventListener('abort', () => {
      this.sessions.delete(sessionId)
    })

    this.ctx.waitUntil(this.pushInitialState(writable))

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  private async pushInitialState(writable: WritableStream): Promise<void> {
    try {
      const componentHtml = await this.render()
      const payload: PatchPayload = {
        elements: componentHtml,
        selector: this.getUiSelector(),
        mode: 'outer',
      }
      const message = this.createSseMessage('datastar-patch-elements', payload)
      if (message) {
        const writer = writable.getWriter()
        await writer.write(new TextEncoder().encode(message))
        writer.releaseLock()
      }
    } catch (error) {
      console.error('Failed to push initial state:', error)
    }
  }

  protected async broadcastState(): Promise<void> {
    const componentHtml = await this.render()
    this.broadcastPatch({
      elements: componentHtml,
      selector: this.getUiSelector(),
      mode: 'outer',
    })
  }

  protected broadcastPatch(payload: PatchPayload): void {
    // console.log(payload)
    const message = this.createSseMessage('datastar-patch-elements', payload)
    if (!message) return

    const data = new TextEncoder().encode(message)
    const failedSessions: string[] = []

    for (const [sessionId, stream] of this.sessions.entries()) {
      try {
        const writer = stream.getWriter()
        writer.write(data)
        writer.releaseLock()
      } catch (error) {
        console.error(`Failed to write to session ${sessionId}:`, error)
        failedSessions.push(sessionId)
      }
    }

    for (const sessionId of failedSessions) {
      this.sessions.delete(sessionId)
    }
  }

  private createSseMessage(eventType: string, payload: PatchPayload): string | null {
    if (typeof payload.elements !== 'string') return null

    const dataLines: string[] = []
    if (payload.selector) dataLines.push(`data: selector ${payload.selector}`)
    if (payload.mode) dataLines.push(`data: mode ${payload.mode}`)
    if (payload.useViewTransition) dataLines.push(`data: useViewTransition true`)

    for (const line of payload.elements.split('\n')) {
      dataLines.push(`data: elements ${line}`)
    }

    return `event: ${eventType}\n${dataLines.join('\n')}\n\n`
  }
}
