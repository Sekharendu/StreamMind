//to run, type: pnpm start
import Fastify from "fastify";
const PORT_NUM = 3000;
const fastify = Fastify({
    logger: true
})
fastify.get('/',(req, res)=>{
    res.send({"message": "AI Backend is running"});
})
fastify.get('/health', (req,res)=>{
    res.send({"status": "healthy"});
})
fastify.post('/chat', (req,res)=>{
    res.send({
        "req made": req.body,
        "response": "Hii"
    })
})
fastify.listen({port: PORT_NUM}, function (err, fallback){
    if(err){
        fastify.log.info(`Failed to host on ${PORT_NUM}, Error: `+ err);
        process.exit(1);
    }
    fastify.log.info(`Server started at port ${PORT_NUM}`);
})