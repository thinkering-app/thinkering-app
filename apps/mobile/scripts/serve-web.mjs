import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const outputRoot = resolve(projectRoot, 'dist')
const vercel = JSON.parse(readFileSync(resolve(projectRoot, 'vercel.json'), 'utf8'))
const deploymentHeaders = vercel.headers.flatMap((rule) => rule.headers)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
}

function fileFor(pathname) {
  const requested = resolve(outputRoot, `.${decodeURIComponent(pathname)}`)
  if (requested !== outputRoot && !requested.startsWith(`${outputRoot}${sep}`)) return null

  const candidates = pathname.endsWith('/')
    ? [resolve(requested, 'index.html')]
    : [requested, `${requested}.html`, resolve(requested, 'index.html')]
  return (
    candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null
  )
}

// vercel.json's catch-all: a path with no file of its own (a dynamic route
// like /activity/<id>, or one that doesn't exist) gets the root page, and the
// router takes it from there. Only extensionless paths, so a missing asset
// still fails loudly here.
const appShell = resolve(outputRoot, 'index.html')

const server = createServer((request, response) => {
  for (const { key, value } of deploymentHeaders) response.setHeader(key, value)

  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  const file = fileFor(pathname) ?? (extname(pathname) === '' ? appShell : null)
  if (!file) {
    response.statusCode = 404
    response.end('Not found')
    return
  }

  response.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(response)
})

server.listen(Number(process.env.PORT ?? 4173), '127.0.0.1')

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
