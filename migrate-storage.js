const { createClient } = require('@supabase/supabase-js')

// PROJETO ANTIGO (Oregon)
const oldSupabase = createClient(
  'https://atlozefvdyssuruxnzqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bG96ZWZ2ZHlzc3VydXhuenFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MTM3MiwiZXhwIjoyMDg2ODU3MzcyfQ.UxUihqh2MwPy2DSAGNoU5IWYNW_znCWm0uA8LyXuPi8'
)

// PROJETO NOVO (BR)
const newSupabase = createClient(
  'https://ulyssryxgkvdkbgvfgpz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseXNzcnl4Z2t2ZGtiZ3ZmZ3B6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDcxNDY4MywiZXhwIjoyMDkwMjkwNjgzfQ.1qiUiPKSqpzr3UwAEaQCeHmOZ3xcZ1bUx42f_AR7KCg'
)

const buckets = ['avatars', 'evolucao-fotos', 'plano_alimentar', 'treinos-pdf']

async function listAllFiles(supabase, bucket, path = '') {
  const allFiles = []
  
  const { data: items, error } = await supabase.storage.from(bucket).list(path, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' }
  })
  
  if (error) {
    console.error(`Erro ao listar ${bucket}/${path}:`, error)
    return allFiles
  }
  
  for (const item of items) {
    const itemPath = path ? `${path}/${item.name}` : item.name
    
    if (item.id === null) {
      // É uma pasta, listar recursivamente
      const subFiles = await listAllFiles(supabase, bucket, itemPath)
      allFiles.push(...subFiles)
    } else {
      // É um arquivo
      allFiles.push({ path: itemPath, metadata: item.metadata })
    }
  }
  
  return allFiles
}

async function migrateStorage() {
  console.log('🚀 Iniciando migração de Storage...\n')
  
  let totalSuccess = 0
  let totalError = 0
  
  for (const bucket of buckets) {
    console.log(`\n📦 Migrando bucket: ${bucket}`)
    
    // Listar todos os arquivos recursivamente
    const files = await listAllFiles(oldSupabase, bucket)
    
    if (files.length === 0) {
      console.log(`   ℹ️  Nenhum arquivo encontrado`)
      continue
    }
    
    console.log(`   Encontrados ${files.length} arquivos\n`)
    
    // Migrar cada arquivo
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = file.path
      
      try {
        // Download do arquivo antigo
        const { data: fileData, error: downloadError } = await oldSupabase.storage
          .from(bucket)
          .download(filePath)
        
        if (downloadError) {
          console.error(`   ❌ [${i+1}/${files.length}] Erro ao baixar ${filePath}:`, downloadError.message)
          totalError++
          continue
        }
        
        // Upload no novo bucket
        const { error: uploadError } = await newSupabase.storage
          .from(bucket)
          .upload(filePath, fileData, {
            contentType: file.metadata?.mimetype || 'application/octet-stream',
            upsert: true
          })
        
        if (uploadError) {
          console.error(`   ❌ [${i+1}/${files.length}] Erro ao enviar ${filePath}:`, uploadError.message)
          totalError++
        } else {
          console.log(`   ✅ [${i+1}/${files.length}] ${filePath}`)
          totalSuccess++
        }
        
      } catch (err) {
        console.error(`   ❌ [${i+1}/${files.length}] Erro geral em ${filePath}:`, err.message)
        totalError++
      }
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🎉 Migração concluída!')
  console.log(`   ✅ Sucessos: ${totalSuccess}`)
  console.log(`   ❌ Erros: ${totalError}`)
  console.log('='.repeat(60))
}

migrateStorage().catch(console.error)
