import {createClient} from "redis";

const redisClient = createClient();
redisClient.on("error", (err)=>{console.log('Error connection to redis', err)});
await redisClient.connect();

// await redisClient.set("name","naruto");
// const name = await redisClient.get("name");
// console.log('name',name);
export {redisClient};