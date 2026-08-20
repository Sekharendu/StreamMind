type GETReqType = {
    Params:{
        id: string;
    }
}
type ReqType= GETReqType & {
    Header: {
        "x-tenant-id": string
    }
    Body: {
        query : string;
        llmProvider?: string
    };
}

type RequestContext ={
    chatId: string,
    requestId: string,
    tenantId: string
    startTime?: number
}

type Telemetry={
    chatId: string,
    requestId: string,
    tenantId: string,

    provider?: string,
    model: string,

    latencyMs: number,
    inputToken?: number;
    outputToken?:number,
    totalToken?: number,

    cost?:number
}
export type {GETReqType, ReqType, RequestContext, Telemetry}