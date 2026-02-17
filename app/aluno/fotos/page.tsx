'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import Image from 'next/image';

interface Foto {
  id: string;
  tipo: 'frente' | 'lado' | 'costas';
  url_foto: string;
  data_upload: string;
}

interface FotosPorData {
  data: string;
  fotos: Foto[];
}

type TipoFoto = 'frente' | 'lado' | 'costas';

export default function FotosPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [uploadingTypes, setUploadingTypes] = useState<Set<TipoFoto>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [diasAteProxima, setDiasAteProxima] = useState<number | null>(null);
  const [mostrarNotificacao, setMostrarNotificacao] = useState(false);

  const WHATSAPP_NUMBER = '+55 67 8123-2717'; // Altere para o número real do coach
  const DIAS_NOTIFICACAO = 15;

  // Buscar fotos ao montar
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

        // Buscar fotos
        const { data: fotosData, error: fotosError } = await supabaseClient
          .from('fotos_evolucao')
          .select('*')
          .eq('user_id', authData.user.id)
          .order('data_upload', { ascending: false });

        if (fotosError) {
          setError('Erro ao carregar fotos: ' + fotosError.message);
          setLoading(false);
          return;
        }

        setFotos(fotosData || []);

        // Verificar notificação de 15 dias
        if (fotosData && fotosData.length > 0) {
          const ultimaFoto = new Date(fotosData[0].data_upload);
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
    tipo: TipoFoto
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 10MB');
      return;
    }

    setUploadingTypes((prev) => new Set(prev).add(tipo));
    setError(null);

    try {
      // 1. Upload para storage
      const fileName = `${userId}_${tipo}_${Date.now()}_${file.name}`;

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
          next.delete(tipo);
          return next;
        });
        return;
      }

      // 2. Obter URL pública
      const { data: publicUrlData } = supabaseClient
        .storage
        .from('evolucao-fotos')
        .getPublicUrl(fileName);

      const urlFoto = publicUrlData.publicUrl;

      // 3. Salvar na tabela
      const { error: dbError } = await supabaseClient
        .from('fotos_evolucao')
        .insert({
          user_id: userId,
          tipo,
          url_foto: urlFoto,
          data_upload: new Date().toISOString(),
        });

      if (dbError) {
        setError('Erro ao salvar foto: ' + dbError.message);
        setUploadingTypes((prev) => {
          const next = new Set(prev);
          next.delete(tipo);
          return next;
        });
        return;
      }

      setSuccess(`Foto de ${tipo} enviada com sucesso!`);

      // Recarregar fotos
      const { data: novasFotos } = await supabaseClient
        .from('fotos_evolucao')
        .select('*')
        .eq('user_id', userId)
        .order('data_upload', { ascending: false });

      if (novasFotos) {
        setFotos(novasFotos);
        // Resetar notificação
        setMostrarNotificacao(false);
        setDiasAteProxima(DIAS_NOTIFICACAO);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao processar o upload');
    } finally {
      setUploadingTypes((prev) => {
        const next = new Set(prev);
        next.delete(tipo);
        return next;
      });
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

  // Agrupar fotos por data
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

  const emojiTipo = {
    frente: '📱',
    lado: '🔄',
    costas: '🔙',
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Fotos de Evolução</h1>
          <p className="text-gray-400">Acompanhe sua transformação visual</p>
        </div>

        {/* Notification Banner - 15 dias */}
        {mostrarNotificacao && (
          <div className="mb-8 p-6 bg-linear-to-r from-coach-gold/20 to-coach-gold-dark/20 border border-coach-gold/50 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⏰</span>
                <div>
                  <h3 className="text-xl font-semibold text-coach-gold mb-1">
                    Hora da avaliação!
                  </h3>
                  <p className="text-gray-300">
                    Já faz mais de {DIAS_NOTIFICACAO} dias! Envie suas fotos hoje para manter o acompanhamento em dia.
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá%20Coach!%20Estou%20enviando%20minhas%20fotos%20de%20evolução.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded hover:from-coach-gold-dark hover:to-coach-gold transition whitespace-nowrap"
              >
                💬 Chamar no WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Contador de Dias */}
        {diasAteProxima !== null && diasAteProxima <= DIAS_NOTIFICACAO && !mostrarNotificacao && (
          <div className="mb-8 p-4 bg-coach-gray border border-coach-gold/20 rounded-lg">
            <p className="text-gray-300">
              <span className="text-coach-gold font-semibold">{diasAteProxima}</span>
              <span className="ml-2">dias até a próxima avaliação</span>
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
            ✓ {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg className="w-12 h-12 animate-spin text-coach-gold mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400">Carregando...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Upload Areas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {(['frente', 'lado', 'costas'] as const).map((tipo) => (
                <div
                  key={tipo}
                  className="backdrop-blur bg-coach-gray/30 border border-coach-gold/10 rounded-lg p-8 hover:border-coach-gold/30 transition"
                >
                  <div className="mb-6">
                    <span className="text-5xl block mb-3">{emojiTipo[tipo]}</span>
                    <h3 className="text-xl font-semibold text-white">
                      {labelTipo[tipo]}
                    </h3>
                  </div>

                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, tipo)}
                      disabled={uploadingTypes.has(tipo)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.querySelector(
                          `input[data-tipo="${tipo}"]`
                        ) as HTMLInputElement;
                        input?.click();
                      }}
                      disabled={uploadingTypes.has(tipo)}
                      className="w-full py-4 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {uploadingTypes.has(tipo) ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Enviar Foto
                        </>
                      )}
                    </button>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, tipo)}
                    disabled={uploadingTypes.has(tipo)}
                    data-tipo={tipo}
                    className="hidden"
                  />
                </div>
              ))}
            </div>

            {/* Galeria de Fotos */}
            {fotosPorData.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Histórico de Fotos</h2>

                <div className="space-y-8">
                  {fotosPorData.map((grupo) => (
                    <div key={grupo.data} className="backdrop-blur bg-coach-gray/30 border border-coach-gold/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-coach-gold mb-6">
                        📅 {grupo.data}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {grupo.fotos.map((foto) => (
                          <div
                            key={foto.id}
                            className="group relative bg-coach-black rounded-lg overflow-hidden border border-coach-gold/20 hover:border-coach-gold/50 transition"
                          >
                            <div className="relative aspect-square bg-gray-900">
                              <img
                                src={foto.url_foto}
                                alt={`Foto ${labelTipo[foto.tipo]}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <a
                                href={foto.url_foto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded transition"
                              >
                                Visualizar
                              </a>
                            </div>

                            <div className="p-4">
                              <p className="text-sm font-semibold text-coach-gold">
                                {emojiTipo[foto.tipo]} {labelTipo[foto.tipo]}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {fotosPorData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <svg className="w-20 h-20 mx-auto mb-6 text-coach-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.414-1.414a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-2xl font-semibold text-white mb-3">
                    Nenhuma foto ainda
                  </h2>
                  <p className="text-gray-400">
                    Comece seu histórico de evolução enviando suas primeiras fotos hoje!
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
