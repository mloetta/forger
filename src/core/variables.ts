import env from 'libs/env';

export const BOT_TOKEN = env.get('bot_token', true);
export const BOT_ID = env.get('bot_id', true);
export const REST_PORT = env.get('rest_port', true);
export const REST_URL = env.get('rest_url', true);
export const BOT_SERVER_URL = env.get('bot_server_url', true);
export const BOT_SERVER_PORT = env.get('bot_server_port', true);
export const GATEWAY_PORT = env.get('gateway_port', true);
export const GATEWAY_URL = env.get('gateway_url', true);
export const SHARD_SERVER_PORT = env.get('shard_server_port', true);
export const SHARD_SERVER_URL = env.get('shard_server_url', true);
export const INFLUX_ENABLE = env.get('influx_enable', true);
export const INFLUX_URL = env.get('influx_url');
export const INFLUX_TOKEN = env.get('influx_token');
export const INFLUX_ORG = env.get('influx_org');
export const INFLUX_BUCKET = env.get('influx_bucket');
