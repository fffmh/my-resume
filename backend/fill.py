# -*- coding: utf-8 -*-
"""真实模板填写：Word 用 docxtpl（Jinja2），PDF 用 PyMuPDF 占位符原位覆盖。"""
import io
import re

import fitz

from .presets import FIELD_LABELS

PLACEHOLDER_RE = re.compile(r'\{\{([^{}]+)\}\}')

_LIST_NAMES = {'education': '教育经历', 'work': '工作经历', 'project': '项目经历', 'skills': '技能特长', 'certificate': '证书资质'}


def scan_placeholders(text):
    found = []
    for m in PLACEHOLDER_RE.finditer(text or ''):
        key = m.group(1).strip()
        if key and key not in found:
            found.append(key)
    return found


def build_context(data):
    """把 ResumeData 展开成 docxtpl/Jinja2 上下文：扁平中文标签 + 列表（含中文标签键）。"""
    ctx = {}
    for sid in ('basic', 'intention'):
        d = data.get(sid) or {}
        labels = FIELD_LABELS.get(sid, {})
        if not isinstance(d, dict):
            d = {}
        ctx[sid] = dict(d)
        for k, v in d.items():
            if k == 'id':
                continue
            ctx[labels.get(k, k)] = v
    ctx['self'] = data.get('self', '')
    ctx['自我评价'] = data.get('self', '')
    for sid, name in _LIST_NAMES.items():
        items = data.get(sid) or []
        labels = FIELD_LABELS.get(sid, {})
        labeled = []
        for it in items:
            if not isinstance(it, dict):
                continue
            d = dict(it)
            for k, v in it.items():
                if k != 'id' and k in labels:
                    d.setdefault(labels[k], v)
            labeled.append(d)
        ctx[sid] = labeled
        ctx[name] = labeled
        ctx[f'{sid}_raw'] = [dict(it) for it in items if isinstance(it, dict)]
        ctx[f'{name}_raw'] = [dict(it) for it in items if isinstance(it, dict)]
    return ctx


def fill_docx(template_bytes, data):
    """用 docxtpl 渲染 Word 模板，返回 docx 字节。"""
    from docxtpl import DocxTemplate
    doc = DocxTemplate(io.BytesIO(template_bytes))
    doc.render(build_context(data))
    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()


def _resolve_value(key, ctx):
    if key in ctx:
        v = ctx[key]
        if isinstance(v, list):
            return ', '.join(str(x) for x in v)
        return str(v)
    return ''


def _insert_fitted(page, rect, value, fontsize, color):
    """单行放得下就原位写；否则用 textbox 自动换行、自动缩字（区域多行填充）。"""
    fontname = 'china-s'
    single = ' '.join(value.split())
    width = fitz.get_text_length(single, fontname=fontname, fontsize=fontsize)
    if '\n' not in value and width <= rect.width:
        fs = fontsize
        while fs > 6 and fitz.get_text_length(single, fontname=fontname, fontsize=fs) > rect.width:
            fs -= 0.5
        page.insert_text((rect.x0, rect.y1 - max(1, fs * 0.2)), single, fontname=fontname, fontsize=fs, color=color)
        return
    # 多行：textbox 自动换行 + 自动缩字
    fs = fontsize
    box = fitz.Rect(rect.x0, rect.y0 - 2, rect.x1, rect.y0 + rect.height + 2)
    while fs > 5:
        result = page.insert_textbox(box, value, fontname=fontname, fontsize=fs, color=color, lineheight=1.35)
        if result >= 0:
            return
        fs -= 0.5
    # 兜底：截断单行
    page.insert_text((rect.x0, rect.y1 - 2), single[: max(8, int(rect.width / max(fontsize, 6) * 1.4))], fontname=fontname, fontsize=fontsize, color=color)


def fill_pdf(template_bytes, data):
    """PyMuPDF：① 填充 AcroForm 表单字段（保真最高）② 定位 {{占位符}} 文本 span，
    白底擦除后原位写入（单行/多行自适应）。"""
    ctx = build_context(data)
    doc = fitz.open(stream=template_bytes, filetype='pdf')
    try:
        # ① AcroForm 表单字段
        for page in doc:
            for widget in page.widgets() or []:
                name = (widget.field_name or '').strip()
                if not name:
                    continue
                value = _resolve_value(name, ctx)
                if not value:
                    continue
                try:
                    widget.field_value = value
                    widget.update()
                except Exception:
                    continue
        # ② 文本占位符
        for page in doc:
            page_dict = page.get_text('dict')
            for block in page_dict.get('blocks', []):
                for line in block.get('lines', []):
                    for span in line.get('spans', []):
                        text = span.get('text', '')
                        m = PLACEHOLDER_RE.search(text)
                        if not m:
                            continue
                        key = m.group(1).strip()
                        value = _resolve_value(key, ctx)
                        if not value:
                            continue
                        rect = fitz.Rect(span['bbox'])
                        color_int = span.get('color', 0)
                        color = ((color_int >> 16) & 255) / 255, ((color_int >> 8) & 255) / 255, (color_int & 255) / 255
                        page.add_redact_annot(rect, fill=(1, 1, 1))
                        page.apply_redactions()
                        _insert_fitted(page, rect, value, span.get('size', 11), color)
        return doc.tobytes()
    finally:
        doc.close()