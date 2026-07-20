/**
 * Mapa código → mensagem pt-BR (estrategia-erros.md). A UI apresenta,
 * não decide. Todo código de domínio/validação/infra tem mensagem;
 * a completude do catálogo de domínio é verificada por teste.
 */
import { DOMAIN_ERROR_CODES, isDomainError } from '@/domain/errors/domain-error'
import { InfrastructureError, ValidationError } from '@/application/errors'

const MESSAGES: Record<string, string> = {
  // acesso
  NAO_AUTENTICADO: 'Sua sessão expirou. Recarregue a página.',
  NAO_AUTORIZADO: 'Você não tem permissão para isso.',
  // mesa
  MESA_NAO_ENCONTRADA: 'Mesa não encontrada. Confira o código.',
  MESA_NAO_ABERTA: 'Esta mesa não está aberta.',
  MESA_CONGELADA: 'A mesa está fechando — aguarde um instante.',
  MESA_SEM_ITENS: 'Adicione ao menos um item antes de fechar.',
  MESA_SEM_PARTICIPANTES: 'A mesa precisa de participantes.',
  MESA_SEM_CONSUMO: 'Ninguém tem consumo para fechar.',
  TRANSICAO_INVALIDA: 'Essa ação não é possível agora.',
  CODIGO_INDISPONIVEL: 'Não foi possível gerar um código. Tente de novo.',
  CHAVE_PIX_OBRIGATORIA: 'Informe sua chave PIX para este modo.',
  RECEBEDOR_OBRIGATORIO: 'Escolha quem pagou o estabelecimento.',
  // participantes
  NOME_DUPLICADO: 'Esse nome já está em uso nesta mesa.',
  NOME_INVALIDO: 'Informe um nome entre 1 e 30 caracteres.',
  PARTICIPANTE_NAO_ENCONTRADO: 'Participante não encontrado.',
  PARTICIPANTE_INVALIDO: 'Participante inválido.',
  PARTICIPANTE_INATIVO: 'Quem saiu não recebe novas distribuições.',
  // itens e distribuição
  ITEM_NAO_ENCONTRADO: 'Item não encontrado.',
  DESCRICAO_INVALIDA: 'Descrição inválida.',
  DESCRICAO_VAZIA: 'Informe a descrição do item.',
  VALOR_INVALIDO: 'Valor inválido.',
  TAXA_FORA_DO_INTERVALO: 'A taxa deve ficar entre 0% e 100%.',
  QUANTIDADE_EXCEDIDA: 'A quantidade distribuída passa do item.',
  QUANTIDADE_INCONSISTENTE: 'As quantidades não somam o item.',
  DISTRIBUICAO_NAO_ENCONTRADA: 'Distribuição não encontrada.',
  DISTRIBUICAO_SEM_MEMBROS: 'Escolha ao menos uma pessoa.',
  DISTRIBUICAO_INVALIDA: 'Distribuição inválida.',
  REFINAMENTO_MISTO: 'Use só quantidade ou só proporção.',
  PESO_INVALIDO: 'Proporção inválida.',
  CODIGO_INVALIDO: 'Código inválido. São 6 caracteres.',
  CHAVE_PIX_INVALIDA: 'Chave PIX inválida.',
  // asserções (bug)
  CONSERVACAO_VIOLADA: 'Erro de cálculo. Tente novamente.',
  CAMPO_IMUTAVEL: 'Esse dado não pode mudar agora.',
  OPERACAO_INVALIDA: 'Operação inválida.',
  // infraestrutura
  NETWORK_UNAVAILABLE: 'Sem conexão. Verifique a internet.',
  REALTIME_DISCONNECTED: 'Reconectando…',
  RLS_DENIED: 'Você não tem acesso a este recurso.',
  SUPABASE_ERROR: 'Erro no servidor. Tente novamente.',
  SUPABASE_NAO_CONFIGURADO: 'App não configurado (Supabase ausente).',
  AUTH_ANONIMA_FALHOU: 'Não foi possível iniciar a sessão.',
}

const FALLBACK = 'Algo deu errado. Tente novamente.'

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? FALLBACK
}

export function errorMessage(error: unknown): string {
  if (isDomainError(error)) return messageForCode(error.code)
  if (error instanceof ValidationError) return messageForCode(error.code)
  if (error instanceof InfrastructureError) return messageForCode(error.code)
  return FALLBACK
}

/** Usado em teste: garante que todo código de domínio tem mensagem. */
export function hasMessageForEveryDomainCode(): boolean {
  return DOMAIN_ERROR_CODES.every((c) => c in MESSAGES)
}
