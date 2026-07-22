import { notFound } from 'next/navigation';
import { getMatchDocument } from '@/lib/document-actions';
import { MatchDocumentClient } from '@/components/match-planner/MatchDocumentClient';

export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MatchDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;

  if (!UUID_PATTERN.test(documentId)) {
    notFound();
  }

  const document = await getMatchDocument(documentId);

  if (!document) {
    notFound();
  }

  return <MatchDocumentClient initialDocument={document} />;
}
