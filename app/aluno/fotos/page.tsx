'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { extractStoragePath, getSignedStorageUrl } from '@/lib/storageUrls';
import { Camera, Upload, Calendar, ChevronRight, Image as ImageIcon, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Maximize2, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Foto {
  id: string;
  posicao: 'frente' | 'lado' | 'costas';
  url_foto: string;
  original_path: string; // caminho real no storage (antes de assinar)
  data_upload: string;
}

interface FotosPorData {
  data: string;
  fotos: Foto[];
}

type PosicaoFoto = 'frente' | 'lado' | 'costas';

export default function FotosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [uploadingTypes, setUploadingTypes] = useState<Set<PosicaoFoto>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [diasAteProxima, setDiasAteProxima] = useState<number | null>(null);
  const [mostrarNotificacao, setMostrarNotificacao] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<Foto | null>(null);

  const WHATSAPP_NUMBER = '+55 67 8123-2717';
  const DIAS_NOTIFICACAO = 15;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          setError('Você precisa estar logado');
          setLoading(false);
          return;
        }

        setUserId(authData.user.id);

        const { data: fotosData, error: fotosError } = await supabaseClient
          .from('fotos_evolucao')
          .select('*')
          .eq('aluno_id', authData.user.id)
          .order('data_upload', { ascending: false });

        if (fotosError) {
          setError('Erro ao carregar fotos: ' + fotosError.message);
          setLoading(false);
          return;
        }

        // Assinar URLs das fotos (bucket privado, suporta path novo e URL legada)
        const fotosAssinadas = await Promise.all((fotosData || []).map(async (foto: any) => {
          const signed = await getSignedStorageUrl('evolucao-fotos', foto.url_foto, 3600);
          return {
            ...foto,
            original_path: extractStoragePath('evolucao-fotos', foto.url_foto) || foto.url_foto,
            url_foto: signed || foto.url_foto
          };
        }));

        setFotos(prev => fotosAssinadas);

        if (fotosAssinadas.length > 0) {
          const ultimaFoto = new Date(fotosAssinadas[0].data_upload);
          const agora = new Date();
          const diasDiferenca = Math.floor(
            (agora.getTime() - ultimaFoto.getTime()) / (1000 * 60 * 60 * 24)
          );

          setDiasAteProxima(Math.max(0, DIAS_NOTIFICACAO - diasDiferenca));
          setMostrarNotificacao(diasDiferenca > DIAS_NOTIFICACAO);
        }

        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    posicao: PosicaoFoto
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 10MB');
      return;
    }

    setUploadingTypes((prev) => new Set(prev).add(posicao));
    setError(null);

    try {
      const fileName = `${userId}_${posicao}_${Date.now()}_${file.name}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('evolucao-fotos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        setError('Erro ao fazer upload: ' + uploadError.message);
        setUploadingTypes((prev) => {
          const next = new Set(prev);
          next.delete(posicao);
          return next;
        });
        return;
      }

      // Salvar apenas o nome do arquivo (path relativo), não a URL completa
      const { error: dbError } = await supabaseClient
        .from('fotos_evolucao')
        .insert({
          aluno_id: userId,
          posicao,
          url_foto: fileName,  // Salvar apenas o nome do arquivo
          data_upload: new Date().toISOString(),
        });

      if (dbError) {
        setError('Erro ao salvar foto: ' + dbError.message);
        setUploadingTypes((prev) => {
          const next = new Set(prev);
          next.delete(posicao);
          return next;
        });
        return;
      }

      setSuccess(`Foto de ${posicao} enviada com sucesso!`);

      const { data: novasFotosRaw } = await supabaseClient
        .from('fotos_evolucao')
        .select('*')
        .eq('aluno_id', userId)
        .order('data_upload', { ascending: false });

      if (novasFotosRaw) {
        // Também assinar as novas fotos recém-carregadas
        const novasFotos = await Promise.all(novasFotosRaw.map(async (foto: any) => {
          const signed = await getSignedStorageUrl('evolucao-fotos', foto.url_foto, 3600);
          return {
            ...foto,
            original_path: extractStoragePath('evolucao-fotos', foto.url_foto) || foto.url_foto,
            url_foto: signed || foto.url_foto
          };
        }));

        setFotos(novasFotos);
        setMostrarNotificacao(false);
        setDiasAteProxima(DIAS_NOTIFICACAO);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao processar o upload');
    } finally {
      setUploadingTypes((prev) => {
        const next = new Set(prev);
        next.delete(posicao);
        return next;
      });
    }
  };

  const handleDeletePhoto = async (foto: Foto) => {
    if (!userId) return;
    
    setDeletingPhotoId(foto.id);
    try {
      // Deletar o arquivo do storage (usar caminho original, não signed URL)
      const storagePath = foto.original_path || foto.url_foto;
      const { error: storageError } = await supabaseClient.storage
        .from('evolucao-fotos')
        .remove([storagePath]);

      if (storageError) {
        console.error('Erro ao deletar arquivo do storage:', storageError);
        // Continuar mesmo com erro no storage, pois o arquivo pode não existir
      }

      // Deletar registro do banco
      const { error: dbError } = await supabaseClient
        .from('fotos_evolucao')
        .delete()
        .eq('id', foto.id);

      if (dbError) {
        setError('Erro ao deletar foto: ' + dbError.message);
        setDeletingPhotoId(null);
        setPhotoToDelete(null);
        return;
      }

      // Atualizar lista de fotos
      setFotos(fotos.filter(f => f.id !== foto.id));
      setSuccess('Foto deletada com sucesso!');
      setPhotoToDelete(null);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao processar exclusão');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(data);
    } catch {
      return dataString;
    }
  };

  const fotosPorData: FotosPorData[] = [];
  fotos.forEach((foto) => {
    const data = formatarData(foto.data_upload);
    const grupo = fotosPorData.find((g) => g.data === data);
    if (grupo) {
      grupo.fotos.push(foto);
    } else {
      fotosPorData.push({ data, fotos: [foto] });
    }
  });

  const labelTipo = {
    frente: 'Frente',
    lado: 'Lado',
    costas: 'Costas',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-gold-light animate-spin" />
        <p className="text-[10px] text-text-secondary uppercase tracking-widest">Carregando galeria...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-gold-light text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Painel de Controle
            </Link>
            <h1 className="text-3xl md:text-4xl text-text-primary tracking-tight mb-2">
              <span className="label-small">FOTOS DE EVOLUÇÃO</span><br/>
              Seu <span className="text-gold-light">Progresso</span>
            </h1>
            <p className="text-text-secondary font-medium text-sm">Acompanhe sua transformação visual através do tempo.</p>
          </div>

          {diasAteProxima !== null && (
            <div className={`px-5 md:px-8 py-4 md:py-5 rounded-lg md:rounded-lg border shadow-xl flex items-center gap-3 md:gap-4 ${
              mostrarNotificacao 
                ? 'bg-danger/15 border-danger/40 shadow-danger/20'
                : 'bg-success/15 border-success/40 shadow-success/20 bg-bg-card border-border-subtle'
            }`}>
              <div className={`w-3 h-3 rounded-full ${mostrarNotificacao ? 'bg-danger animate-pulse shadow-lg shadow-danger/50' : 'bg-success shadow-lg shadow-success/50'}`}></div>
              <div>
                <span className="block label-small text-text-secondary">Status da Avaliação</span>
                <span className={`text-xs md:text-sm font-600 ${
                  mostrarNotificacao ? 'text-danger' : 'text-success'
                }`}>
                   {mostrarNotificacao ? '⚠️ FOTOS ATRASADAS!' : `✓ ${diasAteProxima} dias para o próximo`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {mostrarNotificacao && (
          <div className="mb-8 md:mb-12 bg-bg-card p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-gold-bg shadow-2xl shadow-gold-default/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-gold-bg rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8 text-center lg:text-left">
              <div className="flex-1">
                <div className="flex items-center gap-3 justify-center lg:justify-start mb-3 md:mb-4">
                   <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gold-default flex items-center justify-center text-bg-base shadow-lg shadow-gold-default/30">
                     <Camera size={18} />
                   </div>
                   <h3 className="text-xl md:text-2xl text-text-primary tracking-tight">Hora de atualizar!</h3>
                </div>
                <p className="text-text-secondary font-medium max-w-2xl text-sm md:text-lg leading-relaxed">
                  Já se passaram mais de {DIAS_NOTIFICACAO} dias desde sua última foto. Registrar sua evolução agora é fundamental para ajustarmos sua estratégia.
                </p>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=Olá%20Coach!%20Acabei%20de%20enviar%20minhas%20fotos%20de%20evolução%20atrasadas.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary whitespace-nowrap max-w-xs"
              >
                Falar com o Coach
              </a>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="alert alert-danger mb-8 flex items-center gap-4 text-xs uppercase tracking-widest shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-8 flex items-center gap-4 text-xs uppercase tracking-widest shadow-sm">
            <CheckCircle2 size={20} /> {success}
          </div>
        )}

        {/* Upload Hub */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {(['frente', 'lado', 'costas'] as const).map((tipo) => (
            <div key={tipo} className="bg-bg-card rounded-[40px] p-10 shadow-2xl shadow-gold-default/5 border border-border-subtle flex flex-col items-center group">
               <div className="w-20 h-20 rounded-[30px] bg-gold-default/10 flex items-center justify-center text-gold-light mb-6 group-hover:bg-gold-default/20 group-hover:text-gold-highlight transition-colors duration-500">
                  {tipo === 'frente' && <Camera size={32} />}
                  {tipo === 'lado' && <div className="w-8 h-8 rounded-full border-4 border-current border-r-transparent rotate-12" />}
                  {tipo === 'costas' && <ImageIcon size={32} />}
               </div>
               
               <h3 className="text-xl text-text-primary mb-1">{labelTipo[tipo]}</h3>
               <p className="text-[10px] text-text-secondary uppercase tracking-[0.2em] mb-8">Pose Recomendada</p>

               <label className="w-full">
                 <button
                   type="button"
                   onClick={() => {
                     const input = document.querySelector(`input[data-tipo="${tipo}"]`) as HTMLInputElement;
                     input?.click();
                   }}
                   disabled={uploadingTypes.has(tipo)}
                   className="btn-primary disabled:opacity-50 flex items-center justify-center gap-3"
                 >
                   {uploadingTypes.has(tipo) ? (
                     <Loader2 className="animate-spin" size={18} />
                   ) : (
                     <>
                       <Upload size={18} />
                       Enviar Foto
                     </>
                   )}
                 </button>
                 <input
                   type="file"
                   accept="image/*"
                   onChange={(e) => handleFileUpload(e, tipo)}
                   disabled={uploadingTypes.has(tipo)}
                   data-tipo={tipo}
                   className="hidden"
                 />
               </label>
            </div>
          ))}
        </div>

        {/* Gallery Section */}
        {fotosPorData.length > 0 ? (
          <div className="space-y-16">
            <h2 className="text-2xl text-text-primary flex items-center gap-3">
              <div className="w-2 h-8 bg-gold-default rounded-full"></div>
              Histórico Visual
            </h2>

            <div className="space-y-20">
              {fotosPorData.map((grupo) => (
                <div key={grupo.data} className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-border-subtle -ml-8"></div>
                  
                  <div className="flex items-center gap-4 mb-10 -ml-12 bg-bg-base pr-4 relative z-10">
                     <div className="w-8 h-8 rounded-full bg-gold-default/20 border-2 border-gold-default/40 flex items-center justify-center text-gold-light shadow-sm">
                       <Calendar size={14} />
                     </div>
                     <span className="text-xs text-text-secondary uppercase tracking-widest">{grupo.data}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {grupo.fotos.map((foto) => (
                      <div key={foto.id} className="bg-bg-card rounded-[40px] overflow-hidden border border-border-subtle shadow-xl shadow-gold-default/5 group">
                         <div className="relative aspect-[3/4] overflow-hidden">
                           <img
                             src={foto.url_foto}
                             alt={`Foto ${labelTipo[foto.posicao]}`}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 shadow-inner"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-bg-base/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                           
                           <div className="absolute inset-x-0 bottom-0 p-8 flex items-end justify-between">
                              <div>
                                 <p className="text-[10px] text-gold-light uppercase tracking-[0.2em] mb-1">{labelTipo[foto.posicao]}</p>
                                 <p className="text-lg text-text-primary">{grupo.data}</p>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={foto.url_foto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 rounded-2xl bg-text-primary/10 backdrop-blur-md border border-text-primary/20 flex items-center justify-center text-text-primary hover:bg-text-primary hover:text-bg-base transition-all duration-300 shadow-xl"
                                >
                                  <Maximize2 size={20} />
                                </a>
                                <button
                                  onClick={() => setPhotoToDelete(foto)}
                                  disabled={deletingPhotoId === foto.id}
                                  className="w-12 h-12 rounded-2xl bg-danger/10 backdrop-blur-md border border-danger/20 flex items-center justify-center text-danger hover:bg-danger hover:text-text-primary transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingPhotoId === foto.id ? (
                                    <Loader2 size={20} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={20} />
                                  )}
                                </button>
                              </div>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-bg-card rounded-[50px] p-24 border border-border-subtle flex flex-col items-center justify-center text-center shadow-xl shadow-gold-default/5">
             <div className="w-32 h-32 rounded-[40px] bg-gold-default/10 flex items-center justify-center text-gold-light mb-8 shadow-inner">
               <ImageIcon size={64} />
             </div>
             <h2 className="text-3xl text-text-primary mb-4 tracking-tight">Sem registros visuais</h2>
             <p className="text-text-secondary max-w-sm text-lg font-medium">Sua jornada começa com o primeiro clique. Envie suas fotos iniciais acima.</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-[40px] p-8 md:p-12 max-w-md w-full shadow-2xl border border-border-subtle">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-danger" />
            </div>
            
            <h3 className="text-2xl text-text-primary mb-2 text-center">Excluir Foto</h3>
            <p className="text-text-secondary text-center mb-8">
              Tem certeza que deseja excluir a foto de <span className="font-semibold text-gold-light">{labelTipo[photoToDelete.posicao]}</span>?
              <br />
              <span className="text-sm text-text-disabled">Esta ação não pode ser desfeita.</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPhotoToDelete(null)}
                disabled={deletingPhotoId === photoToDelete.id}
                className="btn-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePhoto(photoToDelete)}
                disabled={deletingPhotoId === photoToDelete.id}
                className="flex-1 px-6 py-4 bg-danger text-text-primary rounded-2xl hover:bg-danger/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
              >
                {deletingPhotoId === photoToDelete.id ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Foto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
