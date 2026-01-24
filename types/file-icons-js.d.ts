declare module 'file-icons-js' {
  /**
   * Get icon class name of the provided filename with color. If not found, default to text icon.
   *
   * @param {string} name - file name
   * @return {string}
   */
  export function getClassWithColor(name: string): string | null

  /**
   * Get icon class name of the provided filename. If not found, default to text icon.
   *
   * @param {string} name - file name
   * @return {string}
   */
  export function getClass(name: string): string | null
}

declare module 'file-icons-js/css/style.css' {
  const content: string
  export default content
}

