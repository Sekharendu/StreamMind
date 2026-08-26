import {CircuitBreaker} from "../services/circuitbreaker.js"
import { asyncLocalStorage } from "../services/context.js";

asyncLocalStorage.run({ requestId: "test", chatId: "test", tenantId: "test", startTime: Date.now() }, () => { 
    const geminiCircuitBreaker = new CircuitBreaker("gemini-test",3,5000);
   for(let i = 0; i<3; i++){
        geminiCircuitBreaker.recordFailure();
        console.log(geminiCircuitBreaker.canRequest());
    }

// const resolve = Promise.resolve(()=>{setTimeout(()=>{},6000)});
  setTimeout(() => {
    console.log(geminiCircuitBreaker.canRequest());
    geminiCircuitBreaker.recordSuccess();
    console.log(geminiCircuitBreaker.canRequest());
  }, 6000);
});
