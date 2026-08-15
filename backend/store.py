# -*- coding: utf-8 -*-
"""JSON 文件存储层（原子写入，schema 与第一阶段前端一致，可无缝迁移）。"""
import json
import os
import re
import shutil
import time
from pathlib import Path

from .presets import DEFAULT_SECTIONS

ROOT = Path(__file__).resolve().parent.parent
# 支持环境变量覆盖数据目录（E2E 测试隔离用）
DATA_DIR = Path(os.environ.get('RESUME_DATA_DIR', str(ROOT / 'data')))
INFO_DIR = DATA_DIR / 'info'
INFO_INDEX = INFO_DIR / 'index.json'
TEMPLATES_DIR = DATA_DIR / 'templates'
TEMPLATES_INDEX = TEMPLATES_DIR / 'index.json'
TEMPLATES_FILES = TEMPLATES_DIR / 'files'
RESUMES_DIR = DATA_DIR / 'resumes'
RESUMES_INDEX = RESUMES_DIR / 'index.json'
SETTINGS_FILE = DATA_DIR / 'settings.json'


def set_data_dir(path):
    """重定向数据目录（测试隔离用）。"""
    global DATA_DIR, INFO_DIR, INFO_INDEX, TEMPLATES_DIR, TEMPLATES_INDEX, TEMPLATES_FILES, RESUMES_DIR, RESUMES_INDEX, SETTINGS_FILE
    DATA_DIR = Path(path)
    INFO_DIR = DATA_DIR / 'info'
    INFO_INDEX = INFO_DIR / 'index.json'
    TEMPLATES_DIR = DATA_DIR / 'templates'
    TEMPLATES_INDEX = TEMPLATES_DIR / 'index.json'
    TEMPLATES_FILES = TEMPLATES_DIR / 'files'
    RESUMES_DIR = DATA_DIR / 'resumes'
    RESUMES_INDEX = RESUMES_DIR / 'index.json'
    SETTINGS_FILE = DATA_DIR / 'settings.json'

def _ensure_dirs():
    for d in (DATA_DIR, INFO_DIR, TEMPLATES_DIR, TEMPLATES_FILES, RESUMES_DIR):
        d.mkdir(parents=True, exist_ok=True)


def _atomic_write(path: Path, obj):
    _ensure_dirs()
    tmp = path.with_suffix('.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def _read_json(path: Path, default=None):
    if not path.exists():
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


def gen_id():
    return f'{int(time.time() * 1000):x}-{os.urandom(4).hex()}'


# ---------------- 信息库 ----------------
def seed_sections():
    _ensure_dirs()
    if INFO_INDEX.exists() and list(INFO_DIR.glob('*.json')):
        return
    ids = []
    for s in DEFAULT_SECTIONS:
        _atomic_write(INFO_DIR / f'{s["id"]}.json', s)
        ids.append(s['id'])
    _atomic_write(INFO_INDEX, ids)


def _section_ids():
    return _read_json(INFO_INDEX, [])


def list_sections():
    seed_sections()
    ids = _section_ids()
    out = []
    for sid in ids:
        s = _read_json(INFO_DIR / f'{sid}.json')
        if s:
            out.append(s)
    return out


def get_section(section_id: str):
    return _read_json(INFO_DIR / f'{section_id}.json')


def save_section(section: dict):
    _ensure_dirs()
    ids = _section_ids()
    if section['id'] not in ids:
        ids.append(section['id'])
        _atomic_write(INFO_INDEX, ids)
    _atomic_write(INFO_DIR / f'{section["id"]}.json', section)


def _mutate(section_id: str, mode: str, entry: dict):
    s = get_section(section_id)
    if not s:
        return
    entries = s.get('entries', [])
    if mode == 'delete':
        entries = [e for e in entries if e.get('id') != entry.get('id')]
    elif mode == 'add':
        if s.get('single'):
            entries = [entry]
        else:
            entries.append(entry)
    else:  # update
        found = False
        for i, e in enumerate(entries):
            if e.get('id') == entry.get('id'):
                entries[i] = entry
                found = True
                break
        if not found:
            if s.get('single'):
                entries = [entry]
            else:
                entries.append(entry)
    s['entries'] = entries
    save_section(s)


def add_entry(section_id: str, entry: dict):
    _mutate(section_id, 'add', entry)


def update_entry(section_id: str, entry: dict):
    _mutate(section_id, 'update', entry)


def delete_entry(section_id: str, entry_id: str):
    _mutate(section_id, 'delete', {'id': entry_id})


# ---------------- 模板 ----------------
def list_templates():
    return _read_json(TEMPLATES_INDEX, [])


def get_template(template_id: str):
    for t in list_templates():
        if t['id'] == template_id:
            return t
    return None


def add_template(info: dict, blob: bytes, ext: str):
    _ensure_dirs()
    tpls = list_templates()
    info['id'] = gen_id()
    fname = f"{info['id']}.{ext}"
    (TEMPLATES_FILES / fname).write_bytes(blob)
    info['file'] = fname
    tpls.append(info)
    _atomic_write(TEMPLATES_INDEX, tpls)
    return info


def template_path(template_id: str):
    t = get_template(template_id)
    if not t or not t.get('file'):
        return None
    return TEMPLATES_FILES / t['file']


def delete_template(template_id: str):
    tpls = list_templates()
    tpls = [t for t in tpls if t['id'] != template_id]
    _atomic_write(TEMPLATES_INDEX, tpls)
    t = get_template(template_id)
    if t and t.get('file'):
        f = TEMPLATES_FILES / t['file']
        if f.exists():
            f.unlink()


# ---------------- 简历 ----------------
def list_resumes():
    return _read_json(RESUMES_INDEX, [])


def save_resume(record: dict):
    _ensure_dirs()
    resumes = list_resumes()
    resumes = [r for r in resumes if r['id'] != record['id']]
    resumes.append(record)
    _atomic_write(RESUMES_INDEX, resumes)


def delete_resume(resume_id: str):
    resumes = list_resumes()
    resumes = [r for r in resumes if r['id'] != resume_id]
    _atomic_write(RESUMES_INDEX, resumes)


# ---------------- 设置 ----------------
DEFAULT_SETTINGS = {
    'llm': {'baseUrl': 'https://api.deepseek.com', 'apiKey': '', 'model': 'deepseek-chat'},
}


def get_settings():
    return _read_json(SETTINGS_FILE, DEFAULT_SETTINGS)


def save_settings(settings: dict):
    _atomic_write(SETTINGS_FILE, settings)


# ---------------- 数据导出/导入/清空 ----------------
def export_all():
    return {
        'version': 1,
        'exportedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'sections': list_sections(),
        'templates': [dict(t) for t in list_templates()],
        'resumes': list_resumes(),
        'settings': get_settings(),
    }


def import_all(payload: dict):
    if payload.get('sections'):
        for s in payload['sections']:
            save_section(s)
    if payload.get('resumes'):
        for r in payload['resumes']:
            save_resume(r)


def clear_all():
    shutil.rmtree(DATA_DIR, ignore_errors=True)
    seed_sections()