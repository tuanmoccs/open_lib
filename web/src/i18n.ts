import { createI18n } from 'vue-i18n';
import vi from './locales/vi.json';

export type MessageSchema = typeof vi;

export const i18n = createI18n<[MessageSchema], 'vi'>({
  legacy: false,
  locale: 'vi',
  fallbackLocale: 'vi',
  messages: { vi },
});
