import { Env } from "./env";

export const TOKEN = Env.required('token').toString();
export const BOT_ID = Env.required('bot_id').toString();
export const BOT_PORT = Env.required('bot_port').toString();
export const BOT_URL = Env.required('bot_url').toString();
export const AUTHORIZATION = Env.required('authorization').toString();
export const REST_PORT = Env.required('rest_port').toString();
export const REST_URL = Env.required('rest_url').toString();
export const GATEWAY_PORT = Env.required('gateway_port').toString();
export const GATEWAY_URL = Env.required('gateway_url').toString();
export const SHARD_SERVER_PORT = Env.required('shard_server_port').toString();
export const SHARD_SERVER_URL = Env.required('shard_server_url').toString();
export const EVENT_SERVER_PORT = Env.required('event_server_port').toString();
export const EVENT_SERVER_URL = Env.required('event_server_url').toString();
export const SERVER_PORT = Env.required('server_port').toString();
export const SERVER_URL = Env.required('server_url').toString();