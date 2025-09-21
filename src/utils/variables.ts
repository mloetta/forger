import Env from "./env";

export const TOKEN = Env.get('token', true);
export const BOT_ID = Env.get('bot_id', true);
export const AUTHORIZATION = Env.get('authorization', true);
export const REST_PORT = Env.get('rest_port', true);
export const REST_URL = Env.get('rest_url', true);
export const GATEWAY_PORT = Env.get('gateway_port', true);
export const GATEWAY_URL = Env.get('gateway_url', true);
export const SHARD_SERVER_PORT = Env.get('shard_server_port', true);
export const SHARD_SERVER_URL = Env.get('shard_server_url', true);
export const EVENT_SERVER_URL = Env.get('event_server_url', true);
export const EVENT_SERVER_PORT = Env.get('event_server_port', true)
export const XATA_API_KEY = Env.get('xata_api_key', true)
export const POSTGRE_DATABASE_URL = Env.get('postgre_database_url', true)