import { onBeforeUnmount } from 'vue';

/** Delays `fn` until `delay` ms have passed without another call. */
export function useDebounceFn<Args extends unknown[]>(fn: (...args: Args) => void, delay = 400) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  const run = (...args: Args) => {
    cancel();
    timer = setTimeout(() => fn(...args), delay);
  };
  onBeforeUnmount(cancel);
  return { run, cancel };
}
