const BASE_CDN = 'https://cdn.discordapp.com';

export namespace CDN {
  // Emojis
  export function emoji(emojiId: string, ext: 'png' | 'jpeg' | 'webp' | 'gif' | 'avif' = 'png') {
    return `${BASE_CDN}/emojis/${emojiId}.${ext}`;
  }

  // Guilds
  export function guildIcon(guildId: string, icon: string, ext: 'png' | 'jpeg' | 'webp' | 'gif' = 'png') {
    return `${BASE_CDN}/icons/${guildId}/${icon}.${ext}`;
  }

  export function guildSplash(guildId: string, splash: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/splashes/${guildId}/${splash}.${ext}`;
  }

  export function guildBanner(guildId: string, banner: string, ext: 'png' | 'jpeg' | 'webp' | 'gif' = 'png') {
    return `${BASE_CDN}/banners/${guildId}/${banner}.${ext}`;
  }

  // Users
  export function userAvatar(userId: string, avatar: string, ext: 'png' | 'jpeg' | 'webp' | 'gif' = 'png') {
    return `${BASE_CDN}/avatars/${userId}/${avatar}.${ext}`;
  }

  export function defaultAvatar(index: number) {
    return `${BASE_CDN}/embed/avatars/${index}.png`;
  }

  export function userBanner(userId: string, banner: string, ext: 'png' | 'jpeg' | 'webp' | 'gif' = 'png') {
    return `${BASE_CDN}/banners/${userId}/${banner}.${ext}`;
  }

  // Guild Member
  export function memberAvatar(
    guildId: string,
    userId: string,
    avatar: string,
    ext: 'png' | 'jpeg' | 'webp' | 'gif' = 'png',
  ) {
    return `${BASE_CDN}/guilds/${guildId}/users/${userId}/avatars/${avatar}.${ext}`;
  }

  export function memberBanner(
    guildId: string,
    userId: string,
    banner: string,
    ext: 'png' | 'jpeg' | 'webp' | 'gif' = 'png',
  ) {
    return `${BASE_CDN}/guilds/${guildId}/users/${userId}/banners/${banner}.${ext}`;
  }

  // Stickers
  export function sticker(stickerId: string, ext: 'png' | 'gif' | 'json' = 'png') {
    return `${BASE_CDN}/stickers/${stickerId}.${ext}`;
  }

  // Roles
  export function roleIcon(roleId: string, icon: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/role-icons/${roleId}/${icon}.${ext}`;
  }

  // Applications
  export function appIcon(appId: string, icon: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/app-icons/${appId}/${icon}.${ext}`;
  }

  export function appCover(appId: string, cover: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/app-icons/${appId}/${cover}.${ext}`;
  }

  export function appAsset(appId: string, assetId: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/app-assets/${appId}/${assetId}.${ext}`;
  }

  // Teams
  export function teamIcon(teamId: string, icon: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/team-icons/${teamId}/${icon}.${ext}`;
  }

  // Guild Event
  export function sscheduledEventCover(eventId: string, cover: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/guild-events/${eventId}/${cover}.${ext}`;
  }

  // Badges
  export function guildTagBadge(guildId: string, hash: string, ext: 'png' | 'jpeg' | 'webp' = 'png') {
    return `${BASE_CDN}/guild-tag-badges/${guildId}/${hash}.${ext}`;
  }
}
