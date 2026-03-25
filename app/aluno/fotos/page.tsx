'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Camera, Upload, Calendar, ChevronRight, Image as ImageIcon, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Maximize2, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Foto {
  id: string;
  posicao: 'frente' | 'lado' | 'costas';
  url_foto: string;
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

        // Assinar URLs das fotos (bucket privado)
        const fotosAssinadas = await Promise.all((fotosData || []).map(async (foto: any) => {
          // url_foto agora contém apenas o fileName, não a URL completa
          const { data: signedData } = await supabaseClient.storage
            .from('evolucao-fotos')
            .createSignedUrl(foto.url_foto, 3600);
            
          return {
            ...foto,
            url_foto: signedData?.signedUrl || foto.url_foto
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
          // url_foto agora contém apenas o fileName
          const { data: signedData } = await supabaseClient.storage
            .from('evolucao-fotos')
            .createSignedUrl(foto.url_foto, 3600);
            
          return {
            ...foto,
            url_foto: signedData?.signedUrl || foto.url_foto
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
      // Deletar o arquivo do storage
      const { error: storageError } = await supabaseClient.storage
        .from('evolucao-fotos')
        .remove([foto.url_foto]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-brand-purple animate-spin" />
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Carregando galeria...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-brand-purple text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Painel de Controle
            </Link>
            <h1 className="text-3xl md:text-4xl text-slate-900 tracking-tight mb-2">
              Fotos de <span className="text-brand-purple">Evolução</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Acompanhe sua transformação visual através do tempo.</p>
          </div>

          {diasAteProxima !== null && (
            <div className="bg-white px-5 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-3 md:gap-4">
              <div className={`w-3 h-3 rounded-full ${mostrarNotificacao ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : 'bg-emerald-500'}`}></div>
              <div>
                <span className="block text-[10px] text-slate-300 uppercase tracking-widest">Status da Avaliação</span>
                <span className="text-xs md:text-sm text-slate-900">
                   {mostrarNotificacao ? 'FOTOS ATRASADAS!' : `${diasAteProxima} dias para o próximo registro`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {mostrarNotificacao && (
          <div className="mb-8 md:mb-12 bg-white p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-red-50 shadow-2xl shadow-red-100/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-red-50/50 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8 text-center lg:text-left">
              <div className="flex-1">
                <div className="flex items-center gap-3 justify-center lg:justify-start mb-3 md:mb-4">
                   <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                     <Camera size={18} />
                   </div>
                   <h3 className="text-xl md:text-2xl text-slate-900 tracking-tight">Hora de atualizar!</h3>
                </div>
                <p className="text-slate-500 font-medium max-w-2xl text-sm md:text-lg leading-relaxed">
                  Já se passaram mais de {DIAS_NOTIFICACAO} dias desde sua última foto. Registrar sua evolução agora é fundamental para ajustarmos sua estratégia.
                </p>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=Olá%20Coach!%20Acabei%20de%20enviar%20minhas%20fotos%20de%20evolução%20atrasadas.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 hover:bg-brand-purple transition-all active:scale-95 whitespace-nowrap"
              >
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 flex items-center gap-4 text-xs uppercase tracking-widest shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {success && (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-600 flex items-center gap-4 text-xs uppercase tracking-widest shadow-sm">
            <CheckCircle2 size={20} /> {success}
          </div>
        )}

        {/* Upload Hub */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {(['frente', 'lado', 'costas'] as const).map((tipo) => (
            <div key={tipo} className="bg-white rounded-[40px] p-10 shadow-2xl shadow-slate-200/40 border border-slate-50 flex flex-col items-center group">
               <div className="w-20 h-20 rounded-[30px] bg-slate-50 flex items-center justify-center text-slate-300 mb-6 group-hover:bg-brand-purple/5 group-hover:text-brand-purple transition-colors duration-500">
                  {tipo === 'frente' && <Camera size={32} />}
                  {tipo === 'lado' && <div className="w-8 h-8 rounded-full border-4 border-current border-r-transparent rotate-12" />}
                  {tipo === 'costas' && <ImageIcon size={32} />}
               </div>
               
               <h3 className="text-xl text-slate-900 mb-1">{labelTipo[tipo]}</h3>
               <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-8">Pose Recomendada</p>

               <label className="w-full">
                 <button
                   type="button"
                   onClick={() => {
                     const input = document.querySelector(`input[data-tipo="${tipo}"]`) as HTMLInputElement;
                     input?.click();
                   }}
                   disabled={uploadingTypes.has(tipo)}
                   className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 hover:bg-brand-purple transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
            <h2 className="text-2xl text-slate-900 flex items-center gap-3">
              <div className="w-2 h-8 bg-brand-purple rounded-full"></div>
              Histórico Visual
            </h2>

            <div className="space-y-20">
              {fotosPorData.map((grupo) => (
                <div key={grupo.data} className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100 -ml-8"></div>
                  
                  <div className="flex items-center gap-4 mb-10 -ml-12 bg-gray-50 pr-4 relative z-10">
                     <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-brand-purple shadow-sm">
                       <Calendar size={14} />
                     </div>
                     <span className="text-xs text-slate-400 uppercase tracking-widest">{grupo.data}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {grupo.fotos.map((foto) => (
                      <div key={foto.id} className="bg-white rounded-[40px] overflow-hidden border border-slate-50 shadow-xl shadow-slate-200/50 group">
                         <div className="relative aspect-[3/4] overflow-hidden">
                           <img
                             src={foto.url_foto}
                             alt={`Foto ${labelTipo[foto.posicao]}`}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 shadow-inner"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                           
                           <div className="absolute inset-x-0 bottom-0 p-8 flex items-end justify-between">
                              <div>
                                 <p className="text-[10px] text-brand-purple uppercase tracking-[0.2em] mb-1">{labelTipo[foto.posicao]}</p>
                                 <p className="text-lg text-white">{grupo.data}</p>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={foto.url_foto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all duration-300 shadow-xl"
                                >
                                  <Maximize2 size={20} />
                                </a>
                                <button
                                  onClick={() => setPhotoToDelete(foto)}
                                  disabled={deletingPhotoId === foto.id}
                                  className="w-12 h-12 rounded-2xl bg-red-500/10 backdrop-blur-md border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-[50px] p-24 border border-slate-100 flex flex-col items-center justify-center text-center shadow-xl shadow-slate-200/50">
             <div className="w-32 h-32 rounded-[40px] bg-slate-50 flex items-center justify-center text-slate-200 mb-8 shadow-inner">
               <ImageIcon size={64} />
             </div>
             <h2 className="text-3xl text-slate-900 mb-4 tracking-tight">Sem registros visuais</h2>
             <p className="text-slate-500 max-w-sm text-lg font-medium">Sua jornada começa com o primeiro clique. Envie suas fotos iniciais acima.</p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-500" />
            </div>
            
            <h3 className="text-2xl text-slate-900 mb-2 text-center">Excluir Foto</h3>
            <p className="text-slate-600 text-center mb-8">
              Tem certeza que deseja excluir a foto de <span className="font-semibold text-brand-purple">{labelTipo[photoToDelete.posicao]}</span>?
              <br />
              <span className="text-sm text-slate-400">Esta ação não pode ser desfeita.</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPhotoToDelete(null)}
                disabled={deletingPhotoId === photoToDelete.id}
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePhoto(photoToDelete)}
                disabled={deletingPhotoId === photoToDelete.id}
                className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
