//to run, type: pnpm start
import "dotenv/config";
import Fastify from "fastify";
// import {GoogleGenAI} from '@google/genai';
import {geminiAgent} from './services/gemini.js'
import { chatRoute } from "./routes/chat.js";

// const GOOGLE_API_KEY:string = process.env.GOOGLE_API_KEY || "";
// const ai = new GoogleGenAI({apiKey: GOOGLE_API_KEY})
const PORT_NUM:number = Number(process.env.PORT_NUM) || 3000;

const fastify = Fastify({
    logger: true
})

type ReqType = {
    Body: {
        query : string;
    };
}

fastify.get('/',(req, res)=>{
    res.send({"message": "AI Backend is running"});
})
fastify.get('/health', (req,res)=>{
    res.send({"status": "healthy"});
})
fastify.register(chatRoute);
// fastify.post<ReqType>('/chat', async (req,res)=>{
//     try{
//         // let chat:string = await chatRoute(req,res);
//         if(!req?.body?.query) return res.send({
//             "response": "please send an appt response using a 'query' as a key"
//         })
//         const response = await geminiAgent(req, res);
//         // const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
//         // fastify.log.info({text}, `---the response is : -----`);
//         // res.send({
//         //     "req made": req.body.query,
//         //     "response": text
//         // })
//     }catch(e){
//         fastify.log.error(e);
//         res.status(500).send({ error: "Failed to reach the model provider" });
//     }
    
// })
fastify.listen({port: PORT_NUM}, function (err, fallback){
    if(err){
        fastify.log.info(`Failed to host on ${PORT_NUM}, Error: `+ err);
        process.exit(1);
    }
    fastify.log.info(`Server started at port ${PORT_NUM}`);
})