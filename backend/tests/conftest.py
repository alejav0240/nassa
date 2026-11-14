import pytest
from sqlalchemy import create_engine, event
from app.database import Base, get_db
from app.main import app
from sqlalchemy.orm import Session

@pytest.fixture(autouse=True)
def isolated_database(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path}/test.db', connect_args={'check_same_thread': False})
    @event.listens_for(engine, 'connect')
    def foreign_keys(connection, record):
        connection.execute('PRAGMA foreign_keys=ON')
    monkeypatch.setattr("app.main.engine", engine)
    Base.metadata.create_all(engine)
    def override():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_db] = override
    yield
    app.dependency_overrides.clear()
    engine.dispose()
