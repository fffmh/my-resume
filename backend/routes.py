# -*- coding: utf-8 -*-
"""API 路由（与前端 IResumeAPI 一一对应）。"""
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from . import classify, extract, fill, generate, retrieve, store, vector

router = APIRouter()

DEFAULT_PLACEHOLDERS = ['姓名', '电话', '邮箱', '求职意向', '工作经历', '项目经历', '教育经历', '技能', '自我评价']


# ---------------- 信息库 ----------------
@router.get('/info/sections')
def get_sections():
    return store.list_sections()


@router.put('/info/{section_id}')
def save_section(section_id: str, section: dict):
    if section.get('id') != section_id:
        section['id'] = section_id
    store.save_section(section)
    return {'ok': True}


@router.post('/info/{section_id}/entries')
def add_entry(section_id: str, entry: dict):
    store.add_entry(section_id, entry)
    return {'ok': True}


@router.put('/info/{section_id}/entries/{entry_id}')
def update_entry(section_id: str, entry_id: str, entry: dict):
    entry['id'] = entry_id
    store.update_entry(section_id, entry)
    return {'ok': True}


@router.delete('/info/{section_id}/entries/{entry_id}')
def delete_entry(section_id: str, entry_id: str):
    store.delete_entry(section_id, entry_id)
    return {'ok': True}


# ---------------- 导入 ----------------
@router.post('/import')
async def import_file(file: UploadFile = File(...)):
    data = await file.read()
    text, err = extract.extract_text(file.filename or '', data)
    if err:
        return {'fileName': file.filename or '', 'sections': {}, 'warnings': [err]}
    sections, warnings = classify.classify_text(text)
    return {'fileName': file.filename or '', 'sections': sections, 'warnings': warnings}


@router.post('/import/confirm')
def confirm_import(preview: dict):
    sections = store.list_sections()
    for section_id, entries in (preview.get('sections') or {}).items():
        section = next((s for s in sections if s['id'] == section_id), None)
        if not section or not entries:
            continue
        if section.get('single'):
            section['entries'] = [dict(entries[-1])]
        else:
            for entry in entries:
                if entry not in section['entries']:
                    section['entries'].append(entry)
        store.save_section(section)
    return {'ok': True}


# ---------------- 模板 ----------------
@router.post('/templates')
async def upload_template(file: UploadFile = File(...)):
    data = await file.read()
    fname = file.filename or 'template'
    name = fname.rsplit('.', 1)[0] if '.' in fname else fname
    ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
    text, _ = extract.extract_text(fname, data)
    placeholders = fill.scan_placeholders(text)
    if not placeholders:
        placeholders = list(DEFAULT_PLACEHOLDERS)
    info = {
        'name': name,
        'fileName': fname,
        'size': len(data),
        'placeholders': placeholders,
        'uploadedAt': store.time.strftime('%Y-%m-%dT%H:%M:%S', store.time.gmtime()) + 'Z',
    }
    info = store.add_template(info, data, ext or 'bin')
    return info


@router.get('/templates')
def get_templates():
    return store.list_templates()


@router.delete('/templates/{template_id}')
def delete_template(template_id: str):
    store.delete_template(template_id)
    return {'ok': True}


@router.post('/templates/{template_id}/fill')
def fill_template(template_id: str, body: dict):
    tpl = store.get_template(template_id)
    if not tpl:
        raise HTTPException(404, '模板不存在')
    path = store.template_path(template_id)
    if not path or not path.exists():
        raise HTTPException(404, '模板文件缺失')
    data = body.get('data') or {}
    ext = tpl.get('fileName', '').rsplit('.', 1)[-1].lower()
    blob = path.read_bytes()
    if ext == 'docx':
        out = fill.fill_docx(blob, data)
        media = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        filename = f"{tpl.get('name', 'resume')}-filled.docx"
    elif ext == 'pdf':
        out = fill.fill_pdf(blob, data)
        media = 'application/pdf'
        filename = f"{tpl.get('name', 'resume')}-filled.pdf"
    else:
        raise HTTPException(400, '模板格式仅支持 docx / pdf')
    return Response(
        content=out,
        media_type=media,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


# ---------------- 生成 ----------------
class GenerateBody(BaseModel):
    targetJob: str = ''
    jd: str = ''
    style: str = 'aurora'


@router.post('/generate')
def generate_resume(body: GenerateBody):
    if not body.targetJob.strip():
        raise HTTPException(400, '目标岗位不能为空')
    settings = store.get_settings()
    sections = store.list_sections()
    record = generate.generate(settings, sections, body.targetJob.strip(), body.jd, body.style)
    return {'record': record}


# ---------------- 简历库 ----------------
@router.post('/resumes')
def save_resume(record: dict):
    store.save_resume(record)
    return {'ok': True}


@router.get('/resumes')
def get_resumes():
    return store.list_resumes()


@router.delete('/resumes/{resume_id}')
def delete_resume(resume_id: str):
    store.delete_resume(resume_id)
    vector.remove_vec('resumes', resume_id)
    return {'ok': True}


# ---------------- 向量检索（RAG） ----------------
class SearchBody(BaseModel):
    query: str = ''
    scope: str = 'resumes'
    top_k: int = 8


@router.post('/search')
def search(body: SearchBody):
    q = body.query.strip()
    top_k = max(1, min(50, body.top_k))
    if not q:
        raise HTTPException(400, '查询词不能为空')
    if body.scope == 'entries':
        return {'entries': retrieve.search_entries(q, top_k=top_k)}
    if body.scope == 'knowledge':
        return {'knowledge': retrieve.search_knowledge(q, top_k=top_k)}
    return {'resumes': retrieve.search_resumes(q, top_k=top_k)}


class GroupsBody(BaseModel):
    resumes: list = []


@router.post('/resumes/groups')
def resume_groups(body: GroupsBody):
    if not body.resumes:
        return {'groups': []}
    return {'groups': retrieve.group_resumes(body.resumes)}


# ---------------- 设置 ----------------
@router.get('/settings')
def get_settings():
    return store.get_settings()


@router.put('/settings')
def save_settings(settings: dict):
    store.save_settings(settings)
    return {'ok': True}


# ---------------- 数据导出/导入/清空 ----------------
@router.get('/data/export')
def export_data():
    return store.export_all()


@router.post('/data/import')
def import_data(payload: dict):
    store.import_all(payload)
    return {'ok': True}


@router.delete('/data')
def clear_all():
    store.clear_all()
    return {'ok': True}


# ---------------- 一键体验 ----------------
@router.post('/demo')
def seed_demo():
    entries_map = generate.demo_entries()
    filled = 0
    for section_id, entries in entries_map.items():
        section = store.get_section(section_id)
        if not section or not entries:
            continue
        if section.get('single'):
            if not section.get('entries'):
                section['entries'] = [dict(entries[0])]
                filled += 1
        elif not section.get('entries'):
            section['entries'] = [dict(e) for e in entries]
            filled += 1
        store.save_section(section)
    return {'filled': filled}