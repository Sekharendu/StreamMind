import "dotenv/config";
import {geminiAgent} from '../services/gemini.js'
import { pool } from "../services/db.js";
import type { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';

type ReqType = {
    Body: {
        query : string;
    };
}
type GETReqType = {
    Params:{
        id: string;
    }
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
            const chatObj = await pool.query("INSERT INTO chats(title) VALUES($1) RETURNING id" , [request.body.query.slice(0,50)]);
            var chatId = chatObj.rows[0].id;
            // save user mssg to db
            await pool.query("INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)",[chatId,"user",request.body.query]);
            var gemResponseInChunks=""; 
            for await (const chunk of geminiAgent(request.body.query)) {
                //chunk = only the text message like, chunk = "Hi!! i am good"
                reply.raw.write(
                    `event: chunk\n` +
                    `data: ${JSON.stringify({
                        text: chunk,
                    })}\n\n`
                );
                gemResponseInChunks+=chunk as unknown as string;
            }
            //save geminis response to db
            await pool.query("INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)", [chatId, "assistant", gemResponseInChunks]);
            
            // Tell client generation completed
            reply.raw.write(
                `event: done\n` +
                `data: ${JSON.stringify({
                    success: true,
                })}\n\n`
            );
        } catch (error) {
            fastify.log.error(error);
            const errorMessage = "Failed to generate response";
            // IMPORTANT:
            // We cannot send HTTP 500 here because
            // the SSE response has already started.
            await pool.query("INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)", [chatId, "assistant", `[Error]: ${errorMessage}`]);
            reply.raw.write(
                `event: error\n` +
                `data: ${JSON.stringify({
                    error: errorMessage,
                })}\n\n`
            );
            
        } finally {
            reply.raw.end();
        }
    })
    fastify.get<GETReqType>('/chats/:id/messages', async (request,reply)=>{
        const paramsObj = request.params;
        const chatId = String(paramsObj?.id);
        const userQuery = await pool.query("SELECT * FROM messages WHERE chat_id = $1", [chatId]);
        reply.send(userQuery.rows);
    })
    return;
}
export {chatRoute};
