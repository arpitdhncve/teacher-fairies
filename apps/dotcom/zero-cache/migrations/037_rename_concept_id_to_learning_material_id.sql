-- Rename concept_id column to learning_material_id in agent_session table
ALTER TABLE agent_session
RENAME COLUMN concept_id TO learning_material_id;
