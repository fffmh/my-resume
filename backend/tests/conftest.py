# -*- coding: utf-8 -*-
import pytest

from backend import embeddings, store, vector


@pytest.fixture(autouse=True)
def _isolated_data(tmp_path):
    store.set_data_dir(tmp_path / 'data')
    vector.reset()
    store.seed_sections()
    embeddings._model = None
    embeddings._model_error = None
    yield