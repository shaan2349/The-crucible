import type { Request, Response } from 'express'

/**
 * How a route answers. A request made with ?stream=1 gets server-sent
 * events: `partial` with the reply as written so far, then `done` with the
 * finished reply (or `error`). Any other request gets plain JSON, as before.
 */
export function replyChannel<T>(req: Request, res: Response) {
  const streaming = req.query.stream === '1'
  let open = false
  const start = () => {
    if (open) return
    open = true
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
  }
  const event = (name: string, data: unknown) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
  return {
    onPartial: streaming
      ? (snapshot: Partial<T>) => {
          start()
          event('partial', snapshot)
        }
      : undefined,
    done(result: unknown) {
      if (!streaming) return void res.json(result)
      start()
      event('done', result)
      res.end()
    },
    fail(status: number, message: string) {
      if (!open) return void res.status(status).json({ error: message })
      event('error', { error: message })
      res.end()
    },
  }
}
