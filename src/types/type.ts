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
    };
}

type RequestContext ={
    chatId: string,
    requestId: string,
    tenantId: string
    startTime?: number
}
export type {GETReqType, ReqType,RequestContext}