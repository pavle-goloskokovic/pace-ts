export default interface RequestArgs {
    type: string;
    url: string;
    protocols?: string | string[];
    request: XMLHttpRequest | WebSocket;
}
