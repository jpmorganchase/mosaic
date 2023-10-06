#!/usr/bin/env node
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';

export default async function serveStatic(staticPath, port) {
  const start = async () => {
    try {
      await server.listen({ port });
      console.log(`[Mosaic] Listening on port ${port}`);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  const server = Fastify();
  await server.register(fastifyStatic, {
    root: staticPath
  });
  server.setNotFoundHandler((_request, reply) => {
    reply.sendFile(`404.html`);
  });
  await start();
}
