type GETReqType = {
    Params:{
        id: string;
    }
}
type ReqType= GETReqType & {
    Body: {
        query : string;
    };
}

type RequestContext ={
    chatId: string,
    requestId: string
}
export type {GETReqType, ReqType,RequestContext}