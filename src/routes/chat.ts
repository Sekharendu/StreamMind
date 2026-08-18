import "dotenv/config";
import {geminiAgent} from '../services/gemini.js'
import { pool } from "../services/db.js";
import { redisClient } from "../services/redis.js"
import type { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from "node:crypto";
import type {GETReqType, ReqType,RequestContext} from "../types/type.js"

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();




async function chatRoute(fastify: FastifyInstance, options: FastifyPluginOptions){
    fastify.post<ReqType>('/chat/:id',async (request,reply)=>{
        if(!request?.body?.query || request.body.query==null  || typeof(request.body.query)!='string') 
            return reply.send({
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
        const paramsObj = request.params;
        var chatId = paramsObj?.id;
        const requestId = randomUUID();
        const requestContext: RequestContext ={ chatId, requestId};
        await asyncLocalStorage.run(requestContext,async()=>{
            try{
                //REDIS -> adding a check to make sure users cannot do more than 20 req/min
                var requestCount = await redisClient.get(chatId) || 0;
                if(requestCount as unknown as number >= 10){
                    reply.raw.write("You have exceeded the request limit of the minute, please wait for a minute till it gets back [20 req/minute]");
                    reply.raw.end();
                }
                requestCount = await redisClient.incr(chatId);
                if(requestCount ===1 ) await redisClient.expire(chatId, 60);// the key expires after 1 minute
                if(! (await pool.query("SELECT * FROM chats WHERE id=$1",[chatId]))){
                    const chatObj = await pool.query("INSERT INTO chats(title) VALUES($1) RETURNING id" , [request.body.query.slice(0,50)]);
                    chatId = chatObj.rows[0].id;
                }

                
                // SAVE USER MSSG TO DB
                await pool.query("INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)",[chatId,"user",request.body.query]);
                var gemResponseInChunks=""; 


                //SENDING REQUEST TO GEMINI
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
            //Log test to check whether it is working or not
            // const { chatId: storedChatId, requestId: storedRequestId } = asyncLocalStorage.getStore()!;
            // console.log(`requestId -> ${storedRequestId}, and request is ${storedChatId}`);
        })
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
