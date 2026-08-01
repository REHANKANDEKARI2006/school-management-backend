/**
 * query_logger.js — Lightweight DB Query Instrumentation
 * 
 * Logs every database query to an in-memory ring buffer (max 50,000 entries).
 * Provides aggregated per-module query stats for the last 24 hours.
 * 
 * ZERO database overhead — all logging is in-memory only.
 * Automatically tags queries by module based on the calling route/context.
 */

const MAX_ENTRIES = 50_000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Circular buffer for log entries
const logBuffer = [];
let totalQueriesAllTime = 0;

// Module detection patterns (maps route prefixes to module names)
const MODULE_PATTERNS = [
  // Cron / scheduled
  { pattern: /\[CRON\]/, module: 'cron-status-tracker' },
  { pattern: /\[STARTUP\]/, module: 'startup' },
  
  // Middleware
  { pattern: /\[AUTH-MW\]/, module: 'middleware-auth' },
  { pattern: /\[INST-MW\]/, module: 'middleware-institute' },
  
  // API route patterns
  { pattern: /\/api\/dashboard/, module: 'dashboard' },
  { pattern: /\/api\/auth/, module: 'authentication' },
  { pattern: /\/api\/students/, module: 'students' },
  { pattern: /\/api\/faculty/, module: 'faculty' },
  { pattern: /\/api\/classes/, module: 'classes' },
  { pattern: /\/api\/attendance/, module: 'attendance' },
  { pattern: /\/api\/fees/, module: 'fees' },
  { pattern: /\/api\/schedule/, module: 'schedule' },
  { pattern: /\/api\/exams/, module: 'exams' },
  { pattern: /\/api\/events/, module: 'events' },
  { pattern: /\/api\/materials/, module: 'materials' },
  { pattern: /\/api\/notices/, module: 'notices' },
  { pattern: /\/api\/holidays/, module: 'holidays' },
  { pattern: /\/api\/leaves/, module: 'leaves' },
  { pattern: /\/api\/notifications/, module: 'notifications' },
  { pattern: /\/api\/results/, module: 'results' },
  { pattern: /\/api\/documents/, module: 'documents' },
  { pattern: /\/api\/document-templates/, module: 'document-templates' },
  { pattern: /\/api\/bulk-documents/, module: 'bulk-documents' },
  { pattern: /\/api\/question-papers/, module: 'paper-generator' },
  { pattern: /\/api\/question-bank/, module: 'question-bank' },
  { pattern: /\/api\/paper-format-templates/, module: 'paper-format-templates' },
  { pattern: /\/api\/school-profile/, module: 'school-profile' },
  { pattern: /\/api\/promotion/, module: 'promotion' },
  { pattern: /\/api\/upload/, module: 'upload' },
  { pattern: /\/api\/departments/, module: 'departments' },
  { pattern: /\/api\/subjects/, module: 'subjects' },
  { pattern: /\/api\/sections/, module: 'sections' },
  { pattern: /\/api\/blood-groups/, module: 'blood-groups' },
  { pattern: /\/api\/user-status/, module: 'user-status' },
];

/**
 * Detect module from context string
 */
function detectModule(context) {
  if (!context) return 'unknown';
  for (const { pattern, module } of MODULE_PATTERNS) {
    if (pattern.test(context)) return module;
  }
  return 'unknown';
}

/**
 * Log a single query execution
 * @param {string} context - Route path, middleware tag, or cron tag
 * @param {string} querySnippet - First 120 chars of the SQL
 * @param {number} durationMs - Execution time in milliseconds
 * @param {string} triggerType - 'api'|'middleware'|'cron'|'startup'|'sse'
 */
function logQuery(context, querySnippet, durationMs, triggerType = 'api') {
  const entry = {
    ts: Date.now(),
    module: detectModule(context),
    context: context || 'unknown',
    query: typeof querySnippet === 'string' ? querySnippet.substring(0, 120).replace(/\s+/g, ' ').trim() : '(non-string)',
    ms: Math.round(durationMs * 100) / 100,
    trigger: triggerType,
  };

  logBuffer.push(entry);
  totalQueriesAllTime++;

  // Trim buffer if over max
  if (logBuffer.length > MAX_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_ENTRIES);
  }
}

/**
 * Get aggregated stats for the last N hours (default 24)
 */
function getStats(hours = 24) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const recent = logBuffer.filter(e => e.ts >= cutoff);

  // Aggregate by module
  const moduleStats = {};
  for (const entry of recent) {
    if (!moduleStats[entry.module]) {
      moduleStats[entry.module] = {
        module: entry.module,
        queryCount: 0,
        totalMs: 0,
        avgMs: 0,
        maxMs: 0,
        byTrigger: {},
        topQueries: {},
      };
    }
    const m = moduleStats[entry.module];
    m.queryCount++;
    m.totalMs += entry.ms;
    if (entry.ms > m.maxMs) m.maxMs = entry.ms;

    // Count by trigger type
    m.byTrigger[entry.trigger] = (m.byTrigger[entry.trigger] || 0) + 1;

    // Track top query patterns (first 60 chars as key)
    const qKey = entry.query.substring(0, 60);
    m.topQueries[qKey] = (m.topQueries[qKey] || 0) + 1;
  }

  // Compute averages and sort top queries
  const modules = Object.values(moduleStats).map(m => {
    m.avgMs = m.queryCount > 0 ? Math.round((m.totalMs / m.queryCount) * 100) / 100 : 0;
    m.totalMs = Math.round(m.totalMs * 100) / 100;
    m.maxMs = Math.round(m.maxMs * 100) / 100;

    // Get top 5 queries
    m.topQueries = Object.entries(m.topQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    return m;
  });

  // Sort by query count descending
  modules.sort((a, b) => b.queryCount - a.queryCount);

  return {
    period: `Last ${hours} hour(s)`,
    generatedAt: new Date().toISOString(),
    totalQueries: recent.length,
    totalQueriesAllTime,
    bufferSize: logBuffer.length,
    modules,
  };
}

/**
 * Print a formatted summary to console
 */
function printSummary(hours = 24) {
  const stats = getStats(hours);
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  📊 DB QUERY REPORT — ${stats.period}`);
  console.log(`  Generated: ${stats.generatedAt}`);
  console.log(`  Total queries in period: ${stats.totalQueries}`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`${'Module'.padEnd(25)} ${'Queries'.padStart(8)} ${'Total ms'.padStart(10)} ${'Avg ms'.padStart(8)} ${'Max ms'.padStart(8)}  Triggers`);
  console.log(`${'─'.repeat(80)}`);

  for (const m of stats.modules) {
    const triggers = Object.entries(m.byTrigger).map(([k,v]) => `${k}:${v}`).join(', ');
    console.log(
      `${m.module.padEnd(25)} ${String(m.queryCount).padStart(8)} ${String(m.totalMs).padStart(10)} ${String(m.avgMs).padStart(8)} ${String(m.maxMs).padStart(8)}  ${triggers}`
    );
  }

  console.log(`${'═'.repeat(80)}\n`);
}

/**
 * Express middleware that tags requests with their route for query logging
 */
function queryLoggerMiddleware(req, res, next) {
  // Store route context on the request for the db wrapper to pick up
  req._queryLogContext = `${req.method} ${req.originalUrl}`;
  next();
}

export { logQuery, getStats, printSummary, queryLoggerMiddleware, detectModule };
