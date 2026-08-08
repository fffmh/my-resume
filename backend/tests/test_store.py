# -*- coding: utf-8 -*-
from backend import store


def test_seed_and_crud():
    sections = store.list_sections()
    assert len(sections) == 8

    entry = {'id': store.gen_id(), 'company': '测试公司', 'position': '工程师', 'content': '做了一些事', 'achievement': '', 'keywords': ''}
    store.add_entry('work', entry)
    work = store.get_section('work')
    assert len(work['entries']) == 1

    store.update_entry('work', {**entry, 'position': '高级工程师'})
    work = store.get_section('work')
    assert work['entries'][0]['position'] == '高级工程师'

    store.delete_entry('work', entry['id'])
    work = store.get_section('work')
    assert len(work['entries']) == 0


def test_export_import_roundtrip():
    store.add_entry('basic', {'id': store.gen_id(), 'name': '李四', 'phone': '13900000000'})
    payload = store.export_all()
    store.clear_all()
    store.import_all(payload)
    sections = store.list_sections()
    basic = next(s for s in sections if s['id'] == 'basic')
    assert basic['entries'][0]['name'] == '李四'


def test_settings():
    store.save_settings({'llm': {'baseUrl': 'https://api.deepseek.com', 'apiKey': 'sk-test', 'model': 'deepseek-chat'}})
    settings = store.get_settings()
    assert settings['llm']['apiKey'] == 'sk-test'