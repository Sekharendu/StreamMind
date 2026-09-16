import "dotenv/config";
import {geminiAgent} from '../services/gemini.js'
import { pool } from "../services/db.js";
import { redisClient } from "../services/redis.js"
import type { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';
import { asyncLocalStorage } from '../services/context.js';
import { randomUUID } from "node:crypto";
import type {GETReqType, ReqType,RequestContext} from "../types/type.js"
import {info} from "../services/logger.js"
import {  generateResponse } from "../services/llmProviders.js";
import {searchQuery} from "../services/rag/retriever.js";
import { splitIntoChunks } from "../services/rag/chunker.js";
import { cleanUpRawString } from "../services/rag/cleaner.js";
import { loadDocument } from "../services/rag/loader.js";
import { executeBatch } from "../services/rag/embedder.js";
import {insertChunks, searchSimilar} from "../services/rag/vectorStore.js"

async function chatRoute(fastify: FastifyInstance, options: FastifyPluginOptions){
    fastify.post<ReqType>('/chat/:id',async (request,reply)=>{
        if(!request?.body?.query || request.body.query==null  || typeof(request.body.query)!='string') 
            return reply.send({
                "response": "please send an appt response using a 'query' as a key"
            })
        const tenantId = String(request.headers["x-tenant-id"]|| "");
        if(!tenantId) return reply.status(400).send({error: "Please add a proper tenant-id to the header"});

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
        const startTime = Date.now();
        const requestContext: RequestContext = { chatId, requestId, tenantId, startTime};
        const LLMPROVIDER:string = request.body?.llmProvider || " " ;

        await asyncLocalStorage.run(requestContext,async()=>{
            try{
                info("1. request started");
                //REDIS -> adding a check to make sure users cannot do more than 20 req/min
                var requestCount = await redisClient.get(chatId) || 0;
                if(requestCount as unknown as number >= 10){
                    reply.raw.write("You have exceeded the request limit of the minute, please wait for a minute till it gets back [20 req/minute]");
                    return reply.raw.end();
                }
                requestCount = await redisClient.incr(chatId);
                if(requestCount ===1 ) await redisClient.expire(chatId, 60);// the key expires after 1 minute
                info("2. redis updated");
                const dbExist = await pool.query("SELECT * FROM chats WHERE id=$1",[chatId])
                if(dbExist.rows.length == 0){
                    const chatObj = await pool.query("INSERT INTO chats(title) VALUES($1) RETURNING id" , [request.body.query.slice(0,50)]);
                    chatId = chatObj.rows[0].id;
                }


                
                // SAVE USER MSSG TO DB
                await pool.query("INSERT INTO messages(chat_id, role, content) VALUES($1,$2,$3)",[chatId,"user",request.body.query]);
                var gemResponseInChunks=""; 
                info("3. DB updated with user req ");


                //SENDING REQUEST TO LLM PROVIDER
                for await (const chunk of generateResponse(LLMPROVIDER, request.body.query, "")) {
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
                info("6. DB updated with GEM response ");
                // Tell client generation completed
                reply.raw.write(
                    `event: done\n` +
                    `data: ${JSON.stringify({
                        success: true,
                    })}\n\n`
                );
                info("7. req ended");
                const reqEndTime = Date.now();

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

    fastify.post<ReqType>('/rag/upload', async (request, reply)=>{
       if(!request?.body?.documentPath){
        return reply.send("Please add a path to you document");
       }
       try{
            const tenantId = String(request?.headers["x-tenant-id"] || "");
                if(!tenantId) {
                return reply.status(400).send({
                    error: "Please add a proper tenant-id to the header"
                });
            }
        const paramsObj = request.params;
        var chatId = paramsObj?.id;
        const requestId = randomUUID();
        const startTime = Date.now();
        const requestContext: RequestContext = { chatId, requestId, tenantId, startTime};
        await asyncLocalStorage.run(requestContext,async()=>{
            const source = request.body.documentPath || "";
            const document = await loadDocument(source);
            const raw = cleanUpRawString(document.rawContents);
            const chunks = await splitIntoChunks(raw, document.source, document.documentId);

            // console.log(`Document: ${document.source}`);
            // console.log(`Raw characters: ${document.rawContents.length}`);
            // console.log(`Clean characters: ${raw.length}`);
            // console.log(`Chunks: ${chunks.length}`);

            // for (const chunk of chunks) {
            //     console.log(`Chunk ${chunk.metadata.chunkIndex}: ${chunk.pageContent.slice(0, 120)}`);
            // }
            // console.log('chunks', chunks);
            const newArr: number[][] = [];
            for(let i=0; i<chunks.length; i+=4){
                // console.log("ABout to send 1st chunk");
                const end = i+4<chunks.length?i+4:chunks.length;
                const batchOfChuks = chunks.slice(i,end);
                const pageContent = batchOfChuks.map((chunks)=>chunks.pageContent);
                // console.log(`chunks counter ${i},---${chunksArr}`);
                const valuesList = await executeBatch(pageContent);
                
                for (const val of valuesList){
                    if (val.values) {
                        newArr.push(val.values);
                    }
                }
                // for(const val of newArr){
                //     console.log(`---val----${val}`);
                // }
            }
            if (newArr.length) await insertChunks(chunks, newArr);
            reply.send("Chunks successfully embedded");
        });
        }catch(e){
            throw (e);
        }
    })

    fastify.post<ReqType>('/rag/query', async (request, reply)=>{
        if(!request?.body?.query || request.body.query==null  || typeof(request.body.query)!='string') 
            return reply.send({
                "response": "please send an appt response using a 'query' as a key"
            })
        const tenantId = String(request.headers["x-tenant-id"]|| "");

        if(!tenantId) return reply.status(400).send({error: "Please add a proper tenant-id to the header"});

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
        const query = request.body?.query;
        const requestId = randomUUID();
        const requestContext: RequestContext = {
            chatId: requestId,
            requestId,
            tenantId,
            startTime: Date.now()
        };

        await asyncLocalStorage.run(requestContext, async () => {
            for await (const chunk of searchQuery(query)){
                console.log(`--chunk arrived---`);
                reply.raw.write(
                    `event: chunk\n` +
                    `data: ${JSON.stringify({
                        text: chunk,
                    })}\n\n`
                );
            }
        });
        reply.raw.end();
        return;
    })

}
export {chatRoute};
