import { useI18n } from 'vue-i18n';
import { ApiError } from '@/api/http';

/** Maps an API error to a localized, user-facing message. */
export function useErrorMessage() {
  const { t, te } = useI18n();
  return (error: unknown) => {
    const code = error instanceof ApiError ? error.code : 'UNKNOWN';
    return te(`errors.${code}`) ? t(`errors.${code}`) : t('errors.UNKNOWN');
  };
}
