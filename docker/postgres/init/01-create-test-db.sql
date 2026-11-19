-- Runs once, the first time the container starts with an empty volume.
-- closepath_dev comes from POSTGRES_DB in compose.yaml. This adds a separate
-- database for integration tests, so tests can truncate tables without
-- touching dev data.
CREATE DATABASE closepath_test;
