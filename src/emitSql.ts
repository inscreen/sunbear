import format from 'pg-format';

import type { PlannedQuery, PlannedQueryJoin, PlannedQueryLinear } from './queryPlan';

import { getNodeDefinition, RuleFilter, Schema } from '.';

export function emitSql<Node, Relation, Role, Permission extends string, Goal extends Node, Actor extends Node>(
    schema: Schema<Node, Relation, Role, Permission>,
    query: PlannedQuery<Node, Goal, Actor>,
    selectTable: 'goal' | 'actor',
    select: string | string[] = '*',
): string {
    return query.alternatives.map((linear) => emitLinear(schema, linear, selectTable, select)).join(' UNION ');
}

function emitLinear<Node, Relation, Role, Permission extends string, Goal extends Node, Actor extends Node>(
    schema: Schema<Node, Relation, Role, Permission>,
    linear: PlannedQueryLinear<Node, Goal, Actor>,
    selectTable: 'goal' | 'actor',
    select: string | string[] = '*',
): string {
    const sqlTableName = getNodeDefinition(schema, linear.goalTable).tableName;
    const goalFilters = linear.goalFilters.map((filter) => emitFilter('__goal', filter));
    const joins = linear.joins.map((join) => emitJoin(schema, join));
    const allFilters = goalFilters.concat(joins.flatMap(({ filters }) => filters));
    const where = allFilters.length === 0 ? '' : ` WHERE ${allFilters.join(' AND ')}`;
    const selectColumns =
        select === '*'
            ? `__${selectTable}.*`
            : format
                  .ident(select)
                  .split(',')
                  .map((c) => `__${selectTable}.${c}`)
                  .join(', ');
    return `(SELECT ${selectColumns} FROM ${format.ident(sqlTableName)} __goal${joins
        .map(({ join }) => ` ${join}`)
        .join('')}${where})`;
}

function emitJoin<Node, Relation, Role, Permission extends string>(
    schema: Schema<Node, Relation, Role, Permission>,
    join: PlannedQueryJoin<Node>,
): { join: string; filters: string[] } {
    const sqlTableName = getNodeDefinition(schema, join.joinedTable).tableName;

    if (join.kind === 'inner') {
        return {
            join: format(
                'INNER JOIN %I %I ON %I.%I = %I.%I',
                sqlTableName,
                join.joinedTableName,
                join.joinedTableName,
                join.joinedTableColumn,
                join.existingTableName,
                join.existingTableColumn,
            ),
            filters: join.filters.map((filter) => emitFilter(join.joinedTableName, filter)),
        };
    } else {
        return {
            join: format('CROSS JOIN %I %I', sqlTableName, join.joinedTableName),
            filters: join.filters.map((filter) => emitFilter(join.joinedTableName, filter)),
        };
    }
}

function emitFilter(tableName: string, filter: RuleFilter): string {
    const leftSide = format('%I.%I', tableName, filter.column);
    switch (filter.condition.kind) {
        case 'IS NULL':
        case 'IS NOT NULL': {
            return `${leftSide} ${filter.condition.kind}`;
        }
        case '=':
        case '<>': {
            return `${leftSide} ${filter.condition.kind} ${format.literal(filter.condition.value)}`;
        }
        case 'IN': {
            if (filter.condition.values.length > 0) {
                return `${leftSide} IN (${format.literal(filter.condition.values)})`;
            } else {
                return '0 = 1';
            }
        }
    }
}
