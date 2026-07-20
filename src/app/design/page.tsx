'use client'

import { useState } from 'react'
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Spinner,
  Tag,
  useToast,
} from '@/ui/design-system'

// Catálogo navegável do design system (FASE 06): exibe todos os
// componentes, variantes e estados para revisão visual isolada.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b py-6">
      <h2 className="text-[length:var(--text-lg)] font-semibold">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  )
}

export default function DesignCatalog() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const toast = useToast()

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-[length:var(--text-2xl)] font-bold">
        Design System — ContaFácil
      </h1>

      <Section title="Botões">
        <Button variant="primary">Primário</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Perigo</Button>
        <Button loading>Carregando</Button>
        <Button disabled>Desabilitado</Button>
        <Button size="sm">P</Button>
        <Button size="lg">G</Button>
      </Section>

      <Section title="Inputs">
        <div className="flex w-full flex-col gap-4">
          <Input label="Nome" placeholder="Seu nome" hint="Como aparece na mesa" />
          <Input label="Valor" prefix="R$" placeholder="0,00" />
          <Input label="Código" error="Mesa não encontrada" defaultValue="ZZZZZZ" />
        </div>
      </Section>

      <Section title="Cards">
        <Card className="w-full">Card padrão</Card>
        <Card interactive className="w-full">
          Card interativo (hover)
        </Card>
      </Section>

      <Section title="Avatares">
        <Avatar name="Ana Silva" />
        <Avatar name="Bruno" size="lg" />
        <Avatar name="Carla" muted />
        <Avatar name="Dani" size="sm" />
      </Section>

      <Section title="Badges e Tags">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="positive">Pago</Badge>
        <Badge tone="warning">Pendente</Badge>
        <Badge tone="danger">Sem dono</Badge>
        <Badge tone="info">FECHANDO</Badge>
        <Tag>Grupo</Tag>
        <Tag onRemove={() => {}}>Removível</Tag>
      </Section>

      <Section title="Toasts, Dialog e Bottom Sheet">
        <Button onClick={() => toast.show('Copiado!', 'positive')}>
          Toast
        </Button>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Dialog
        </Button>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Bottom Sheet
        </Button>
      </Section>

      <Section title="Loading e Skeletons">
        <Spinner />
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Section>

      <Section title="Empty e Error states">
        <div className="w-full">
          <EmptyState
            title="Nenhum item ainda"
            description="Adicione o primeiro item da mesa."
            icon="🍺"
            action={{ label: 'Adicionar item', onClick: () => {} }}
          />
          <ErrorState
            description="Não conseguimos carregar a mesa."
            action={{ label: 'Tentar de novo', onClick: () => {} }}
          />
        </div>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Fechar a conta?"
        description="Isso congela a mesa para todos e gera os pagamentos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Fechar conta</Button>
          </>
        }
      />

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Distribuir item"
      >
        <p className="text-[var(--color-text-muted)]">
          Conteúdo do bottom sheet (ex.: escolher pessoas).
        </p>
      </BottomSheet>
    </main>
  )
}
