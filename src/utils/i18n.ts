import { createLogger } from 'discordeno';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { join } from 'path';

const logger = createLogger({ name: 'i18n' })

export async function i18n(): Promise<void> {
  try {
    await i18next.use(Backend).init({
      backend: {
        loadPath: join(__dirname, '..', 'locales', '{{lng}}.json'),
      },
      fallbackLng: 'en',
      supportedLngs: ['en', 'pt-br'],
      preload: ['en'],
      interpolation: {
        escapeValue: false,
      },
      returnObjects: true,
    });

    logger.info('i18n initialized successfully');
  } catch (e) {
    logger.info('Failed to initialize i18n:', e);
  }
}

export function Translate(lang: string, key: string, options?: Record<string, unknown>) {
  return i18next.t(key, { ...options, lng: lang })
}