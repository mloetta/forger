import Env from "./env";

export const TOKEN = Env.get('token');
export const BOT_ID = Env.get('bot_id');
export const BOT_PORT = Env.get('bot_port');
export const BOT_URL = Env.get('bot_url');
export const AUTHORIZATION = Env.get('authorization');
export const REST_PORT = Env.get('rest_port');
export const REST_URL = Env.get('rest_url');
export const GATEWAY_PORT = Env.get('gateway_port');
export const GATEWAY_URL = Env.get('gateway_url');
export const SHARD_SERVER_PORT = Env.get('shard_server_port');
export const SHARD_SERVER_URL = Env.get('shard_server_url');
export const EVENT_SERVER_URLS = Env.get('event_server_urls');
export const EVENT_SERVER_PORT = Env.get('event_server_port')