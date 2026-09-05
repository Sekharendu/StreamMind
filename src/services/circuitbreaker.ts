import { info } from "./logger.js";

type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private state: BreakerState
  private failures: number
  private lastFailureTime: number | null
  private readonly threshold: number
  private readonly timeoutMs: number
  private provider: string;

  constructor(providerName: string, threshold: number, timeoutMs: number) {
    this.threshold= threshold;
    this.timeoutMs = timeoutMs;
    this.lastFailureTime = 0;
    this.failures = 0;
    this.state = "CLOSED";
    this.provider = providerName;
  }

  canRequest(): boolean {
    if(this.state == "CLOSED")return true;
    else if(this.state == "OPEN"){
        if(this.lastFailureTime && Date.now() - this.lastFailureTime>= this.timeoutMs) {
            this.state = "HALF_OPEN";
            info(`State updated to ${this.state} for ${this.provider} provider`);
            return true;
        }
        else return false;
    }
    else{
        return true;
    }
    // Case CLOSED → return true
    // Case OPEN:
    //   has Date.now() - this.lastFailureTime >= this.timeoutMs?
    //     YES → switch state to HALF_OPEN, log it, return true  (this is the test)
    //     NO  → log "blocked", return false
    // Case HALF_OPEN → hmm, tricky: one test at a time. For now, return true.
  }

  recordSuccess(): void {
        this.failures = 0;
        this.state="CLOSED";
    // regardless of current state:
    // reset failures to 0, state to CLOSED, log transition if state changed
    // Q2: why does success in HALF_OPEN mean "go back to CLOSED"?
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now();
    if(this.state  == "HALF_OPEN"){
        this.state = "OPEN";
        info(`State updated to ${this.state} for ${this.provider} provider`);
    }else{
        this.failures++;
        if(this.failures >= this.threshold){
            this.state = "OPEN";
            info(`State updated to ${this.state} for ${this.provider} provider`);
        }
    }
  }
}