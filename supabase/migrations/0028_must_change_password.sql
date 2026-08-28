-- Flag para forçar troca de senha no primeiro acesso (convites com senha temporária)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password
  ON profiles (must_change_password)
  WHERE must_change_password = true;

COMMENT ON COLUMN profiles.must_change_password IS 'Quando true, o usuário deve trocar a senha antes de acessar o app';
