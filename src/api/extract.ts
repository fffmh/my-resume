import mammoth from 'mammoth/mammoth.browser'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface ExtractResult {
  text: string
  error?: string
}

/** 从本地文件抽取纯文本（.txt/.md 直接读，.docx 用 mammoth，.pdf 用 pdfjs） */
export async function extractText(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase()
  try {
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv') || name.endsWith('.log')) {
      return { text: await file.text() }
    }
    if (name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return { text: result.value }
    }
    if (name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n'
      }
      return { text }
    }
    return { text: '', error: '暂不支持该文件类型，请使用 .txt / .md / .docx / .pdf' }
  } catch (err) {
    return { text: '', error: `解析失败：${(err as Error).message}` }
  }
}