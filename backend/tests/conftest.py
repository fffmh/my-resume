# -*- coding: utf-8 -*-
import pytest

from backend import store


@pytest.fixture(autouse=True)
def _isolated_data(tmp_path):
    store.set_data_dir(tmp_path / 'data')
    store.seed_sections()
    yield