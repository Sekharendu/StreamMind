import "dotenv/config";
import Fastify from "fastify";
import {geminiAgent} from '../services/gemini.js'
import { request } from "node:http";
import type { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginOptions } from 'fastify';

type ReqType = {
    Body: {
        query : string;
    };
}
async function chatRoute(fastify: FastifyInstance, options: FastifyPluginOptions){
    fastify.post<ReqType>('/chat',async (request,reply)=>{
        try{
            if(!request?.body?.query) return reply.send({
                "response": "please send an appt response using a 'query' as a key"
            })
            await geminiAgent(request, reply);
        }catch(e){
            fastify.log.error(e);
            reply.status(500).send({ error: "Failed to reach the model provider" });
        }
    })
}
export {chatRoute};