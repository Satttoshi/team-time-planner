import { getMatchDocuments } from '@/lib/document-actions';
import { DocumentListClient } from '@/components/match-planner/DocumentListClient';

export const dynamic = 'force-dynamic';

export default async function MatchPlannerPage() {
  const documents = await getMatchDocuments();

  return <DocumentListClient initialDocuments={documents} />;
}
