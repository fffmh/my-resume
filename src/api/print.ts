/**
 * 打印 / 另存为 PDF：把简历 HTML 注入打印样式（白底深字、去辉光阴影），
 * 经隐藏 iframe 调用浏览器打印，用户可在对话框中选择「另存为 PDF」。
 */
export function printResume(html: string): void {
  const PRINT_CSS = `
    @media print {
      body, .page, .card { background: #ffffff !important; }
      .page { padding: 24px !important; box-shadow: none !important; }
      .card { border: none !important; box-shadow: none !important; backdrop-filter: none !important; border-radius: 0 !important; }
      .foot, .sec-title::after { display: none !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      mark { background: #dff6ff !important; color: #0b1e33 !important; }
      li, .self, .muted, .sub, .t, .row, .chip, .tag { color: #1c2b45 !important; }
      .lv, .gain, .role { color: #0f766e !important; }
      .name { color: #0b1e33 !important; -webkit-text-fill-color: #0b1e33 !important; background: none !important; }
      li::before { background: #0f766e !important; box-shadow: none !important; }
    }
  `
  const doc = html.replace('</head>', `<style>${PRINT_CSS}</style></head>`)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.srcdoc = doc
  document.body.appendChild(iframe)
  iframe.onload = () => {
    try {
      const win = iframe.contentWindow
      if (win) {
        win.focus()
        win.print()
      }
    } finally {
      setTimeout(() => iframe.remove(), 1500)
    }
  }
}