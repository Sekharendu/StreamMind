import Groq from "groq-sdk";
import { info} from './logger.js'
import "dotenv/config"
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});

async function* groqAgent(query: string):AsyncGenerator<string>{
    console.log('____API KEY___',)
    const response = await groq.chat.completions.create({
        model: "qwen/qwen3.6-27b",
        // model : "openai/gpt-oss-120b ",
        messages: [{
            role: "user",
            content: query
        }],
        stream: true,
        reasoning_format: "hidden"
    }); 
    for await(const chunk of response){
        console.log(chunk);
        console.log(chunk.choices[0]?.delta);
        const text = chunk.choices[0]?.delta.content;
        if(text)
            yield(text);    
    }
    info('5.Groq chat respine completed');
}
export {groqAgent};

