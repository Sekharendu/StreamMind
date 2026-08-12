import "dotenv/config";
import {geminiAgent} from '../services/gemini.js'
import type { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';

type ReqType = {
    Body: {
        query : string;
    };
}
async function chatRoute(fastify: FastifyInstance, options: FastifyPluginOptions){
    fastify.post<ReqType>('/chat',async (request,reply)=>{
        if(!request?.body?.query || request.body.query==null  || typeof(request.body.query)!='string') return reply.send({
                "response": "please send an appt response using a 'query' as a key"
            })
        // SSE headers
        reply.raw.setHeader(
            "Content-Type",
            "text/event-stream; charset=utf-8"
        );

        reply.raw.setHeader(
            "Cache-Control",
            "no-cache"
        );

        reply.raw.setHeader(
            "Connection",
            "keep-alive"
        );

        // Tell proxies that we're streaming
        reply.raw.setHeader(
            "X-Accel-Buffering",
            "no"
        );
         try {

            for await (const chunk of geminiAgent(request.body.query)) {

                reply.raw.write(
                    `event: chunk\n` +
                    `data: ${JSON.stringify({
                        text: chunk,
                    })}\n\n`
                );

            }

            // Tell client generation completed
            reply.raw.write(
                `event: done\n` +
                `data: ${JSON.stringify({
                    success: true,
                })}\n\n`
            );

        } catch (error) {

            fastify.log.error(error);

            // IMPORTANT:
            // We cannot send HTTP 500 here because
            // the SSE response has already started.

            reply.raw.write(
                `event: error\n` +
                `data: ${JSON.stringify({
                    error: "Failed to generate response",
                })}\n\n`
            );

        } finally {
            reply.raw.end();
        }
    })
    return;
}
export {chatRoute};
