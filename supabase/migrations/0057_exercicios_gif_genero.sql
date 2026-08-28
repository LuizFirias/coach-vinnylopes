-- GIFs de exercício migrando pro Cloudflare R2 (fora do Supabase Storage) +
-- versão feminina do GIF/miniatura. imagem_url já existe no schema mas
-- IF NOT EXISTS por segurança; os campos novos guardam só a key dentro do
-- bucket R2, resolvida pra URL pública em tempo de leitura (lib/r2/urls.ts) —
-- mesmo padrão já documentado em lib/storageUrls.ts pro Supabase Storage.

ALTER TABLE exercicios_biblioteca
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS gif_url_feminino text,
  ADD COLUMN IF NOT EXISTS imagem_url_feminino text;
