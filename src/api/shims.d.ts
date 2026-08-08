declare module 'mammoth/mammoth.browser' {
  export interface MammothResult {
    value: string
    messages: unknown[]
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>
  const mammoth: { extractRawText: typeof extractRawText }
  export default mammoth
}