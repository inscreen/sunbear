import type { Solution, SolutionChain } from './solver';

import { getNodeDefinition } from '.';
import type { RuleFilter, Schema } from '.';

export interface PlannedQueryCrossJoin<Node> {
    kind: 'cross';
    joinedTable: Node;
    joinedTableName: string;
    filters: readonly RuleFilter[];
}

export interface PlannedQueryInnerJoin<Node> {
    kind: 'inner';
    joinedTable: Node;
    joinedTableName: string;
    joinedTableColumn: string;
    existingTableName: string;
    existingTableColumn: string;
    filters: readonly RuleFilter[];
}

export type PlannedQueryJoin<Node> = PlannedQueryInnerJoin<Node> | PlannedQueryCrossJoin<Node>;

export interface PlannedQueryLinear<Node, Goal extends Node> {
    goalTable: Goal;
    goalFilters: readonly RuleFilter[];
    joins: readonly PlannedQueryJoin<Node>[];
}

export interface PlannedQueryUnion<Node, Goal extends Node> {
    alternatives: readonly PlannedQueryLinear<Node, Goal>[];
}

export type PlannedQuery<Node, Goal extends Node> = PlannedQueryUnion<Node, Goal>;

export function planQuery<Node, Relation, Role, Permission extends string, Goal extends Node>(
    schema: Schema<Node, Relation, Role, Permission>,
    solutions: Solution<Node, Relation, Role, Goal>,
): PlannedQuery<Node, Goal> {
    return {
        alternatives: solutions.map((chain) => planRuleChain(schema, chain)),
    };
}

export function planRuleChain<Node, Relation, Role, Permission extends string, Goal extends Node>(
    schema: Schema<Node, Relation, Role, Permission>,
    chain: SolutionChain<Node, Relation, Role>,
): PlannedQueryLinear<Node, Goal> {
    const goalRule = chain.extensions.length === 0 ? chain.direct : chain.extensions[chain.extensions.length - 1]!;
    const goalNodeDefinition = getNodeDefinition(schema, goalRule.node);
    const goalFilters = [...(goalNodeDefinition.defaultFilters ?? []), ...(goalRule.filters ?? [])];
    if (chain.goalIds) {
        goalFilters.push({
            column: goalNodeDefinition.primaryColumn,
            condition: { kind: 'IN', values: chain.goalIds },
        });
    }

    const actorNodeDefinition = getNodeDefinition(schema, goalRule.actorNode);
    let actorFilters = [...(actorNodeDefinition.defaultFilters ?? []), ...(goalRule.actorFilters ?? [])];
    if (chain.actorId !== undefined) {
        actorFilters.push({
            column: actorNodeDefinition.primaryColumn,
            condition: { kind: '=', value: chain.actorId },
        });
    }
    const joins: PlannedQueryJoin<Node>[] = [];

    // Starting with the rule after the goal rule, which is dealt with separately.
    for (let idx = chain.extensions.length - 2; idx >= -1; idx--) {
        const rule = idx === -1 ? chain.direct : chain.extensions[idx]!;
        const ruleNodeDefinition = getNodeDefinition(schema, rule.node);
        const previousRule = chain.extensions[idx + 1]!;
        if (rule.actorFilters !== undefined && rule.actorFilters.length > 0) {
            actorFilters = actorFilters.concat(rule.actorFilters);
        }
        const edge = schema.edges.find(
            (edge) =>
                (edge.source === rule.node &&
                    edge.target === previousRule.node &&
                    edge.targetRelation === previousRule.extend.throughRelation) ||
                (edge.target === rule.node &&
                    edge.source === previousRule.node &&
                    edge.sourceRelation === previousRule.extend.throughRelation),
        )!;
        const [joinedTableColumn, existingTableColumn] =
            edge.source === rule.node ? [edge.sourceColumn, edge.targetColumn] : [edge.targetColumn, edge.sourceColumn];
        joins.push({
            kind: 'inner',
            joinedTable: rule.node,
            joinedTableName: `__t${idx + 1}`,
            joinedTableColumn,
            existingTableName: idx === chain.extensions.length - 2 ? '__goal' : `__t${idx + 2}`,
            existingTableColumn,
            filters: [
                ...(ruleNodeDefinition.defaultFilters ?? []),
                ...(rule.filters ?? []),
                ...(previousRule.extend.linkFilters ?? []),
            ],
        });
    }

    const rule = chain.direct;
    if (rule.throughRelation !== undefined) {
        const edge = schema.edges.find(
            (edge) =>
                (edge.source === rule.node &&
                    edge.target === rule.actorNode &&
                    edge.sourceRelation === rule.throughRelation) ||
                (edge.target === rule.node &&
                    edge.source === rule.actorNode &&
                    edge.targetRelation === rule.throughRelation),
        )!;
        const [joinedTableColumn, existingTableColumn] =
            edge.source === rule.actorNode
                ? [edge.sourceColumn, edge.targetColumn]
                : [edge.targetColumn, edge.sourceColumn];
        joins.push({
            kind: 'inner',
            joinedTable: rule.actorNode,
            joinedTableName: '__actor',
            joinedTableColumn,
            existingTableName: chain.extensions.length === 0 ? '__goal' : '__t0',
            existingTableColumn,
            filters: actorFilters,
        });
    } else if (actorFilters.length > 0) {
        joins.push({
            kind: 'cross',
            joinedTable: rule.actorNode,
            joinedTableName: '__actor',
            filters: actorFilters,
        });
    }

    return {
        goalTable: goalRule.node as Goal,
        goalFilters,
        joins,
    };
}
