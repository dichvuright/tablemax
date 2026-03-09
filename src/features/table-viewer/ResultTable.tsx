import { useConnectionStore } from '@/features/connection/connectionStore';
import { VirtualDataGrid } from './VirtualDataGrid';

export function ResultTable() {
  const { queryResult, queryError, isExecuting } = useConnectionStore();

  return (
    <VirtualDataGrid
      result={queryResult}
      error={queryError}
      isLoading={isExecuting}
    />
  );
}
