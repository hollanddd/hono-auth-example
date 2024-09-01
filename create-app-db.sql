SELECT 'CREATE DATABASE project_x'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'project_x')\gexec
;

