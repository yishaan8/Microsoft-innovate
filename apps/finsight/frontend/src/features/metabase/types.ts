export type VisualizationType = 'table' | 'bar' | 'line' | 'area' | 'pie' | 'scalar';

export type TableName = 'invoices' | 'exceptions' | 'suppliers' | 'departments' | 'audit_logs';

export type AggregationFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';

export interface ColumnDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  description?: string;
  isPrimaryKey?: boolean;
}

export interface TableSchema {
  id: TableName;
  name: string;
  description: string;
  rowCount: number;
  columns: ColumnDefinition[];
  iconName: string;
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  value2?: any;
}

export interface VisualQuery {
  table: TableName;
  filters: FilterCondition[];
  aggregation?: {
    func: AggregationFunction;
    column?: string;
  };
  groupBy?: string;
  orderBy?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  totalCount: number;
  executionTimeMs: number;
  sqlEquivalent?: string;
}

export interface SavedQuestion {
  id: string;
  title: string;
  description: string;
  table: TableName;
  visualizationType: VisualizationType;
  query: VisualQuery;
  sqlQuery?: string;
  createdAt: string;
  category: 'Risk' | 'Spend' | 'Compliance' | 'Operations';
}
