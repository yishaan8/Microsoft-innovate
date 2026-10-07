import { MOCK_INVOICES, MOCK_EXCEPTIONS, MOCK_AUDIT_LOGS } from '../../api/mockData';
import {
  TableName,
  TableSchema,
  VisualQuery,
  QueryResult,
  SavedQuestion,
} from './types';

// Predefined Schema Definitions
export const METABASE_SCHEMAS: TableSchema[] = [
  {
    id: 'invoices',
    name: 'Invoices (Raw & Flagged)',
    description: 'Enterprise accounts payable invoices received across all departments',
    rowCount: MOCK_INVOICES.length,
    iconName: 'FileSpreadsheet',
    columns: [
      { name: 'id', label: 'Invoice ID', type: 'string', isPrimaryKey: true },
      { name: 'invoiceNumber', label: 'Invoice Number', type: 'string' },
      { name: 'poNumber', label: 'PO Number', type: 'string' },
      { name: 'supplierName', label: 'Supplier Name', type: 'string' },
      { name: 'department', label: 'Department', type: 'string' },
      { name: 'amount', label: 'Amount (INR)', type: 'currency' },
      { name: 'vatAmount', label: 'VAT Amount', type: 'currency' },
      { name: 'riskScore', label: 'ML Risk Score (0-1)', type: 'percentage' },
      { name: 'status', label: 'Status (FLAGGED/CLEARED/BLOCKED)', type: 'string' },
      { name: 'paymentTerms', label: 'Payment Terms', type: 'string' },
      { name: 'invoiceDate', label: 'Invoice Date', type: 'date' },
      { name: 'submissionHour', label: 'Submission Hour (0-23)', type: 'number' },
      { name: 'exceptionCount', label: 'Exception Count', type: 'number' },
    ],
  },
  {
    id: 'exceptions',
    name: 'Exceptions & Validation Blocks',
    description: 'Automated 3-way match, price anomaly, and compliance violation items',
    rowCount: MOCK_EXCEPTIONS.length,
    iconName: 'AlertTriangle',
    columns: [
      { name: 'id', label: 'Exception ID', type: 'string', isPrimaryKey: true },
      { name: 'invoiceId', label: 'Associated Invoice', type: 'string' },
      { name: 'ruleId', label: 'Triggered Rule Code', type: 'string' },
      { name: 'ruleName', label: 'Rule Description', type: 'string' },
      { name: 'severity', label: 'Severity (CRITICAL/HIGH/MEDIUM/LOW)', type: 'string' },
      { name: 'status', label: 'Resolution Status', type: 'string' },
      { name: 'supplierName', label: 'Supplier Name', type: 'string' },
      { name: 'amount', label: 'At-Risk Amount', type: 'currency' },
      { name: 'confidenceScore', label: 'Model Confidence', type: 'percentage' },
      { name: 'detectedAt', label: 'Detection Timestamp', type: 'date' },
      { name: 'assignedTo', label: 'Assigned Analyst', type: 'string' },
    ],
  },
  {
    id: 'suppliers',
    name: 'Supplier Risk Matrix',
    description: 'Aggregated vendor profiles, historical risk factors, and payment behavior',
    rowCount: 6,
    iconName: 'Building2',
    columns: [
      { name: 'supplierId', label: 'Supplier ID', type: 'string', isPrimaryKey: true },
      { name: 'supplierName', label: 'Vendor Legal Name', type: 'string' },
      { name: 'category', label: 'Industry Category', type: 'string' },
      { name: 'totalInvoiced', label: 'Total Invoiced (INR)', type: 'currency' },
      { name: 'invoiceCount', label: 'Total Invoices', type: 'number' },
      { name: 'anomalyCount', label: 'Anomalies Flagged', type: 'number' },
      { name: 'avgRiskScore', label: 'Avg Risk Score', type: 'percentage' },
      { name: 'status', label: 'Vendor Status (Active/Probation/Blocked)', type: 'string' },
      { name: 'country', label: 'Jurisdiction', type: 'string' },
    ],
  },
  {
    id: 'departments',
    name: 'Department Spending & Budgets',
    description: 'Cost centers, monthly budget allocations, and AP leakage breakdown',
    rowCount: 5,
    iconName: 'Layers',
    columns: [
      { name: 'department', label: 'Department Name', type: 'string', isPrimaryKey: true },
      { name: 'headOfDepartment', label: 'Department Head', type: 'string' },
      { name: 'annualBudget', label: 'Annual Budget (INR)', type: 'currency' },
      { name: 'currentSpend', label: 'Current YTD Spend', type: 'currency' },
      { name: 'flaggedAmount', label: 'Flagged / Disputed (INR)', type: 'currency' },
      { name: 'exceptionRate', label: 'Exception Rate', type: 'percentage' },
    ],
  },
  {
    id: 'audit_logs',
    name: 'Audit Trail & Investigation Logs',
    description: 'Immutable ledger of all analyst approvals, overrides, and security events',
    rowCount: MOCK_AUDIT_LOGS.length,
    iconName: 'History',
    columns: [
      { name: 'id', label: 'Audit ID', type: 'string', isPrimaryKey: true },
      { name: 'action', label: 'Action Performed', type: 'string' },
      { name: 'performedBy', label: 'User / Actor', type: 'string' },
      { name: 'userRole', label: 'Role', type: 'string' },
      { name: 'targetResource', label: 'Target Resource', type: 'string' },
      { name: 'timestamp', label: 'Timestamp', type: 'date' },
      { name: 'ipAddress', label: 'Client IP', type: 'string' },
      { name: 'status', label: 'Outcome (SUCCESS/FAILED)', type: 'string' },
    ],
  },
];

// In-Memory Database Tables
export const RAW_TABLE_DATA: Record<TableName, any[]> = {
  invoices: MOCK_INVOICES.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    poNumber: inv.poNumber,
    supplierName: inv.supplierName,
    department: inv.department,
    amount: inv.amount,
    vatAmount: inv.vatAmount,
    riskScore: inv.riskScore,
    status: inv.status,
    paymentTerms: inv.paymentTerms,
    invoiceDate: inv.invoiceDate,
    submissionHour: inv.submissionHour,
    exceptionCount: inv.exceptionCount,
  })),

  exceptions: MOCK_EXCEPTIONS.map((exc) => ({
    id: exc.id,
    invoiceId: exc.invoiceId,
    ruleId: exc.primaryRule,
    ruleName: exc.violations?.[0]?.ruleName || exc.primaryRule,
    severity: exc.severity,
    status: exc.status,
    supplierName: exc.supplierName,
    amount: exc.amount,
    confidenceScore: exc.violations?.[0]?.confidenceScore || 0.85,
    detectedAt: exc.createdAt,
    assignedTo: exc.assignedTo || 'Unassigned',
  })),

  suppliers: [
    {
      supplierId: 'SUP-401',
      supplierName: 'Zenith Global Logistics Ltd',
      category: 'Logistics & Freight',
      totalInvoiced: 4850000,
      invoiceCount: 14,
      anomalyCount: 5,
      avgRiskScore: 0.82,
      status: 'Probation',
      country: 'India',
    },
    {
      supplierId: 'SUP-402',
      supplierName: 'Apex Cloud Solutions Inc',
      category: 'IT & Software Infrastructure',
      totalInvoiced: 12200000,
      invoiceCount: 28,
      anomalyCount: 3,
      avgRiskScore: 0.45,
      status: 'Active',
      country: 'United States',
    },
    {
      supplierId: 'SUP-403',
      supplierName: 'Sterling Facility Mgmt Pvt',
      category: 'Facilities & Real Estate',
      totalInvoiced: 3100000,
      invoiceCount: 19,
      anomalyCount: 1,
      avgRiskScore: 0.22,
      status: 'Active',
      country: 'India',
    },
    {
      supplierId: 'SUP-404',
      supplierName: 'NexGen Industrial Automation',
      category: 'Industrial Hardware',
      totalInvoiced: 6400000,
      invoiceCount: 11,
      anomalyCount: 4,
      avgRiskScore: 0.78,
      status: 'Probation',
      country: 'Germany',
    },
    {
      supplierId: 'SUP-405',
      supplierName: 'OmniCorp Brand Consulting',
      category: 'Marketing & Brand Agency',
      totalInvoiced: 2150000,
      invoiceCount: 8,
      anomalyCount: 2,
      avgRiskScore: 0.64,
      status: 'Active',
      country: 'United Kingdom',
    },
    {
      supplierId: 'SUP-406',
      supplierName: 'Vanguard Cybersecurity Labs',
      category: 'Security & Compliance Auditing',
      totalInvoiced: 5800000,
      invoiceCount: 15,
      anomalyCount: 0,
      avgRiskScore: 0.12,
      status: 'Active',
      country: 'Singapore',
    },
  ],

  departments: [
    {
      department: 'Information Technology',
      headOfDepartment: 'Dr. Rajiv Malhotra',
      annualBudget: 35000000,
      currentSpend: 24650000,
      flaggedAmount: 1850000,
      exceptionRate: 0.075,
    },
    {
      department: 'Supply Chain & Logistics',
      headOfDepartment: 'Sunita Sharma',
      annualBudget: 28000000,
      currentSpend: 19400000,
      flaggedAmount: 3200000,
      exceptionRate: 0.165,
    },
    {
      department: 'Operations & Facilities',
      headOfDepartment: 'Anil Verma',
      annualBudget: 18000000,
      currentSpend: 11200000,
      flaggedAmount: 450000,
      exceptionRate: 0.04,
    },
    {
      department: 'Marketing & Growth',
      headOfDepartment: 'Meera Nambiar',
      annualBudget: 15000000,
      currentSpend: 9800000,
      flaggedAmount: 890000,
      exceptionRate: 0.091,
    },
    {
      department: 'Legal & Compliance',
      headOfDepartment: 'Adv. Kabir Kapoor',
      annualBudget: 12000000,
      currentSpend: 6700000,
      flaggedAmount: 120000,
      exceptionRate: 0.018,
    },
  ],

  audit_logs: MOCK_AUDIT_LOGS.map((log) => ({
    id: log.id,
    action: log.action,
    performedBy: log.actor?.name || 'System Engine',
    userRole: log.actor?.role || 'SYSTEM',
    targetResource: `${log.targetType}:${log.targetId}`,
    timestamp: log.timestamp,
    ipAddress: log.ipAddress || '192.168.1.100',
    status: log.newState || 'RECORDED',
  })),
};

// Query Engine implementation
export function executeVisualQuery(query: VisualQuery): QueryResult {
  const startTime = performance.now();
  let rawData = RAW_TABLE_DATA[query.table] ? [...RAW_TABLE_DATA[query.table]] : [];

  // 1. Apply Filters
  if (query.filters && query.filters.length > 0) {
    rawData = rawData.filter((row) => {
      return query.filters.every((filter) => {
        const val = row[filter.column];
        if (val === undefined || val === null) return false;

        switch (filter.operator) {
          case 'equals':
            return String(val).toLowerCase() === String(filter.value).toLowerCase();
          case 'not_equals':
            return String(val).toLowerCase() !== String(filter.value).toLowerCase();
          case 'greater_than':
            return Number(val) > Number(filter.value);
          case 'less_than':
            return Number(val) < Number(filter.value);
          case 'contains':
            return String(val).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'between':
            return Number(val) >= Number(filter.value) && Number(val) <= Number(filter.value2);
          default:
            return true;
        }
      });
    });
  }

  // 2. Apply Grouping & Aggregation
  let resultRows: Record<string, any>[] = [];
  let resultColumns: string[] = [];

  if (query.groupBy && query.aggregation) {
    const groupKey = query.groupBy;
    const { func, column: aggCol } = query.aggregation;

    const groups: Record<string, any[]> = {};
    rawData.forEach((row) => {
      const key = String(row[groupKey] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const aggLabel =
      func === 'count'
        ? 'count'
        : `${func}_${aggCol || 'value'}`;

    resultColumns = [groupKey, aggLabel];

    resultRows = Object.entries(groups).map(([key, rows]) => {
      let metric = 0;
      if (func === 'count') {
        metric = rows.length;
      } else if (aggCol) {
        const numbers = rows.map((r) => Number(r[aggCol]) || 0);
        if (func === 'sum') {
          metric = numbers.reduce((a, b) => a + b, 0);
        } else if (func === 'avg') {
          metric = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
          metric = Number(metric.toFixed(2));
        } else if (func === 'max') {
          metric = Math.max(...numbers);
        } else if (func === 'min') {
          metric = Math.min(...numbers);
        }
      }
      return {
        [groupKey]: key,
        [aggLabel]: metric,
      };
    });
  } else if (query.aggregation && !query.groupBy) {
    // Single scalar value
    const { func, column: aggCol } = query.aggregation;
    const aggLabel = func === 'count' ? 'count' : `${func}_${aggCol || 'value'}`;
    resultColumns = [aggLabel];

    let metric = 0;
    if (func === 'count') {
      metric = rawData.length;
    } else if (aggCol) {
      const numbers = rawData.map((r) => Number(r[aggCol]) || 0);
      if (func === 'sum') {
        metric = numbers.reduce((a, b) => a + b, 0);
      } else if (func === 'avg') {
        metric = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        metric = Number(metric.toFixed(2));
      } else if (func === 'max') {
        metric = numbers.length ? Math.max(...numbers) : 0;
      } else if (func === 'min') {
        metric = numbers.length ? Math.min(...numbers) : 0;
      }
    }
    resultRows = [{ [aggLabel]: metric }];
  } else {
    // Raw Table Rows
    resultRows = rawData;
    resultColumns = rawData.length > 0 ? Object.keys(rawData[0]) : [];
  }

  // 3. Sorting
  if (query.orderBy) {
    const { column, direction } = query.orderBy;
    resultRows.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }
      return direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // 4. Limit
  const totalCount = resultRows.length;
  if (query.limit && query.limit > 0) {
    resultRows = resultRows.slice(0, query.limit);
  }

  const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

  // Synthesize SQL Equivalent string
  let sql = `SELECT ${query.groupBy ? `${query.groupBy}, ` : ''}${
    query.aggregation
      ? `${query.aggregation.func.toUpperCase()}(${query.aggregation.column || '*'})`
      : '*'
  } FROM ${query.table}`;

  if (query.filters.length > 0) {
    const whereClauses = query.filters.map(
      (f) => `${f.column} ${f.operator === 'equals' ? '=' : f.operator} '${f.value}'`
    );
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  if (query.groupBy) {
    sql += ` GROUP BY ${query.groupBy}`;
  }
  if (query.orderBy) {
    sql += ` ORDER BY ${query.orderBy.column} ${query.orderBy.direction.toUpperCase()}`;
  }
  if (query.limit) {
    sql += ` LIMIT ${query.limit}`;
  }

  return {
    columns: resultColumns,
    rows: resultRows,
    totalCount,
    executionTimeMs,
    sqlEquivalent: sql,
  };
}

// In-Browser SQL Parsing and Execution
export function executeNativeSQL(sqlQuery: string): QueryResult {
  const startTime = performance.now();
  const cleanSql = sqlQuery.trim().replace(/;$/, '');

  // Detect which table is requested
  const fromMatch = cleanSql.match(/from\s+([a-zA-Z_]+)/i);
  const tableName = (fromMatch ? fromMatch[1].toLowerCase() : 'invoices') as TableName;

  const validTable = RAW_TABLE_DATA[tableName] ? tableName : 'invoices';
  let rows = [...RAW_TABLE_DATA[validTable]];

  // Quick parser for WHERE clauses
  const whereMatch = cleanSql.match(/where\s+(.*?)(group\s+by|order\s+by|limit|$)/i);
  if (whereMatch && whereMatch[1]) {
    const condition = whereMatch[1].trim();
    if (condition.includes('>')) {
      const [col, val] = condition.split('>').map((s) => s.trim().replace(/['"]/g, ''));
      rows = rows.filter((r) => Number(r[col]) > Number(val));
    } else if (condition.includes('<')) {
      const [col, val] = condition.split('<').map((s) => s.trim().replace(/['"]/g, ''));
      rows = rows.filter((r) => Number(r[col]) < Number(val));
    } else if (condition.includes('=')) {
      const [col, val] = condition.split('=').map((s) => s.trim().replace(/['"]/g, ''));
      rows = rows.filter((r) => String(r[col]).toLowerCase() === String(val).toLowerCase());
    }
  }

  // Quick parser for GROUP BY
  const groupByMatch = cleanSql.match(/group\s+by\s+([a-zA-Z_]+)/i);
  if (groupByMatch && groupByMatch[1]) {
    const groupCol = groupByMatch[1].trim();
    const groups: Record<string, any[]> = {};
    rows.forEach((r) => {
      const k = String(r[groupCol] || 'Other');
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });

    const isSum = /sum\(([a-zA-Z_]+)\)/i.exec(cleanSql);
    const isAvg = /avg\(([a-zA-Z_]+)\)/i.exec(cleanSql);

    rows = Object.entries(groups).map(([k, groupRows]) => {
      const result: Record<string, any> = { [groupCol]: k, count: groupRows.length };
      if (isSum && isSum[1]) {
        const sumCol = isSum[1];
        result[`sum_${sumCol}`] = groupRows.reduce((a, b) => a + (Number(b[sumCol]) || 0), 0);
      }
      if (isAvg && isAvg[1]) {
        const avgCol = isAvg[1];
        const avg = groupRows.reduce((a, b) => a + (Number(b[avgCol]) || 0), 0) / groupRows.length;
        result[`avg_${avgCol}`] = Number(avg.toFixed(2));
      }
      return result;
    });
  }

  // Quick parser for ORDER BY
  const orderMatch = cleanSql.match(/order\s+by\s+([a-zA-Z_]+)(\s+desc|\s+asc)?/i);
  if (orderMatch && orderMatch[1]) {
    const orderCol = orderMatch[1].trim();
    const isDesc = orderMatch[2] && orderMatch[2].trim().toLowerCase() === 'desc';
    rows.sort((a, b) => {
      const valA = a[orderCol];
      const valB = b[orderCol];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }
      return isDesc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
    });
  }

  // Quick parser for LIMIT
  const limitMatch = cleanSql.match(/limit\s+(\d+)/i);
  if (limitMatch && limitMatch[1]) {
    const lim = parseInt(limitMatch[1], 10);
    rows = rows.slice(0, lim);
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const executionTimeMs = Math.max(2, Math.round(performance.now() - startTime));

  return {
    columns,
    rows,
    totalCount: rows.length,
    executionTimeMs,
    sqlEquivalent: cleanSql,
  };
}

// Curated Metabase Questions
export const CURATED_QUESTIONS: SavedQuestion[] = [
  {
    id: 'q-1',
    title: 'Flagged Exposure by Department',
    description: 'Sum of invoice amounts in FLAGGED status grouped across business units',
    table: 'invoices',
    visualizationType: 'bar',
    category: 'Risk',
    createdAt: '2026-10-06T10:00:00Z',
    query: {
      table: 'invoices',
      filters: [{ id: 'f-1', column: 'status', operator: 'equals', value: 'FLAGGED' }],
      aggregation: { func: 'sum', column: 'amount' },
      groupBy: 'department',
      orderBy: { column: 'sum_amount', direction: 'desc' },
    },
  },
  {
    id: 'q-2',
    title: 'Top High Risk Invoices (> 0.75 Score)',
    description: 'High anomaly probability items evaluated by the ML classification pipeline',
    table: 'invoices',
    visualizationType: 'table',
    category: 'Risk',
    createdAt: '2026-10-06T10:15:00Z',
    query: {
      table: 'invoices',
      filters: [{ id: 'f-2', column: 'riskScore', operator: 'greater_than', value: 0.75 }],
      orderBy: { column: 'riskScore', direction: 'desc' },
      limit: 20,
    },
  },
  {
    id: 'q-3',
    title: 'Exception Frequency by Severity',
    description: 'Total active validation exceptions partitioned by CRITICAL, HIGH, MEDIUM, LOW',
    table: 'exceptions',
    visualizationType: 'pie',
    category: 'Compliance',
    createdAt: '2026-10-06T10:30:00Z',
    query: {
      table: 'exceptions',
      filters: [],
      aggregation: { func: 'count' },
      groupBy: 'severity',
      orderBy: { column: 'count', direction: 'desc' },
    },
  },
  {
    id: 'q-4',
    title: 'Departmental Budget & Leakage Rate',
    description: 'Comparison of total spend and flagged capital per cost center',
    table: 'departments',
    visualizationType: 'bar',
    category: 'Spend',
    createdAt: '2026-10-06T11:00:00Z',
    query: {
      table: 'departments',
      filters: [],
      orderBy: { column: 'flaggedAmount', direction: 'desc' },
    },
  },
  {
    id: 'q-5',
    title: 'Supplier Risk Score Distribution',
    description: 'Vendor anomaly counts and average risk exposure',
    table: 'suppliers',
    visualizationType: 'bar',
    category: 'Operations',
    createdAt: '2026-10-06T11:30:00Z',
    query: {
      table: 'suppliers',
      filters: [],
      orderBy: { column: 'avgRiskScore', direction: 'desc' },
    },
  },
];

// Helper to export result rows to CSV
export function exportToCSV(filename: string, rows: Record<string, any>[], columns: string[]) {
  if (!rows || rows.length === 0) return;
  const header = columns.join(',');
  const csvRows = rows.map((row) =>
    columns
      .map((col) => {
        let val = row[col];
        if (val === null || val === undefined) val = '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...csvRows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
