/** react-native-web has no Alert; the browser's own confirm does the job. */
export async function confirmDestructive(options: {
  title: string
  message?: string
  confirmLabel: string
}): Promise<boolean> {
  return window.confirm(options.message ? `${options.title}\n\n${options.message}` : options.title)
}
