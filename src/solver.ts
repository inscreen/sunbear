import type { AnyClass } from './SunBear';

import { evaluateFilter, getNodeDefinition, RuleDirect, RuleExtension, RuleFilter, Schema } from '.';

export type SolutionChain<Node, Relation, Role> = {
    actorId: string | number | undefined;
    goalIds: (string | number)[] | undefined;
    direct: RuleDirect<Node, Relation, Role>;
    extensions: RuleExtension<Node, Relation, Role>[];
};

export type Solution<Node, Relation, Role, _Goal extends Node> = SolutionChain<Node, Relation, Role>[];

/** Returns true iff: actor is provided, goals is provided, and it can be deduced that the permission is available for
 * all goals without making a database query.
 */
export function solveByPermission<
    Node extends AnyClass,
    Relation,
    Role,
    Permission extends string,
    Actor extends Node,
    Goal extends Node,
>(
    schema: Schema<Node, Relation, Role, Permission>,
    actorNode: Actor,
    actor: undefined,
    permission: Permission,
    goalNode: Goal,
    goals: InstanceType<Goal>[] | undefined,
): Solution<Node, Relation, Role, Goal>;
export function solveByPermission<
    Node extends AnyClass,
    Relation,
    Role,
    Permission extends string,
    Actor extends Node,
    Goal extends Node,
>(
    schema: Schema<Node, Relation, Role, Permission>,
    actorNode: Actor,
    actor: InstanceType<Actor> | undefined,
    permission: Permission,
    goalNode: Goal,
    goals: undefined,
): Solution<Node, Relation, Role, Goal>;
export function solveByPermission<
    Node extends AnyClass,
    Relation,
    Role,
    Permission extends string,
    Actor extends Node,
    Goal extends Node,
>(
    schema: Schema<Node, Relation, Role, Permission>,
    actorNode: Actor,
    actor: InstanceType<Actor>,
    permission: Permission,
    goalNode: Goal,
    goals: InstanceType<Goal>[],
): true | Solution<Node, Relation, Role, Goal>;
export function solveByPermission<
    Node extends AnyClass,
    Relation,
    Role,
    Permission extends string,
    Actor extends Node,
    Goal extends Node,
>(
    schema: Schema<Node, Relation, Role, Permission>,
    actorNode: Actor,
    actor: InstanceType<Actor> | undefined,
    permission: Permission,
    goalNode: Goal,
    goals: InstanceType<Goal>[] | undefined,
): true | Solution<Node, Relation, Role, Goal> {
    const goalPrimaryColumn = getNodeDefinition(schema, goalNode).primaryColumn;
    const goalIds: (string | number)[] | undefined = goals?.map((goal) => goal[goalPrimaryColumn]);
    const chains = (schema.grants.get(goalNode)?.[permission] ?? []).flatMap((role) =>
        solveByRole(schema, actorNode, actor, role, goalNode).map((chain) => ({ ...chain, goalIds })),
    );

    if (
        actor !== undefined &&
        goals &&
        goals.every((goal) => chains.some((chain) => evaluateSolution(schema, chain, actor, goal)))
    ) {
        return true;
    }

    return chains;
}

function solveByRole<
    Node extends AnyClass,
    Relation,
    Role,
    Permission extends string,
    Actor extends Node,
    Goal extends Node,
>(
    schema: Schema<Node, Relation, Role, Permission>,
    actorNode: Actor,
    actor: InstanceType<Actor> | undefined,
    role: Role,
    goalNode: Goal,
    carry?: { filters?: readonly RuleFilter[]; actorFilters?: readonly RuleFilter[] },
): Solution<Node, Relation, Role, Goal> {
    const actorId: string | number | undefined = actor?.[getNodeDefinition(schema, actorNode).primaryColumn];
    return schema.rules
        .filter((rule) => {
            return rule.node === goalNode && rule.role === role && rule.actorNode === actorNode;
        })
        .flatMap((rule): Solution<Node, Relation, Role, Goal> => {
            if ((rule.actorFilters ?? []).some((filter) => evaluateFilter(actor, filter) === 'fail')) {
                // Actor filters are known to fail, there's no need to bother testing in the database.
                return [];
            }
            const ruleWithCarry = {
                ...rule,
                filters: (carry?.filters ?? []).concat(rule.filters ?? []),
                actorFilters: (carry?.actorFilters ?? []).concat(rule.actorFilters ?? []),
            };
            switch (ruleWithCarry.kind) {
                case 'direct': {
                    // Only one way to satisfy this rule: a chain including only this rule.
                    return [{ actorId, goalIds: undefined, direct: ruleWithCarry, extensions: [] }];
                }
                case 'superset': {
                    // This rule can be satisfied by proving any possible solution for the subset role.
                    return solveByRole(schema, actorNode, actor, ruleWithCarry.ofRole, goalNode, {
                        filters: ruleWithCarry.filters,
                        actorFilters: ruleWithCarry.actorFilters,
                    });
                }
                case 'extension': {
                    // This rule can be satisfied by proving any possible solution for the tail and then proving the head of the rule.
                    return solveByRole(
                        schema,
                        actorNode,
                        actor,
                        ruleWithCarry.extend.linkRole,
                        ruleWithCarry.extend.linkNode,
                    ).map((chain) => ({
                        ...chain,
                        extensions: [...chain.extensions, ruleWithCarry],
                    }));
                }
            }
        });
}

function evaluateSolution<Node extends AnyClass, Relation, Role, Permission extends string, Actor extends Node>(
    schema: Schema<Node, Relation, Role, Permission>,
    chain: SolutionChain<Node, Relation, Role>,
    actor: InstanceType<Actor>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: any,
): boolean {
    const rule = chain.extensions.length > 0 ? chain.extensions[chain.extensions.length - 1]! : chain.direct;
    if ((rule.actorFilters ?? []).some((filter) => evaluateFilter(actor, filter) !== 'pass')) {
        return false;
    }
    if ((rule.filters ?? [])?.some((filter) => evaluateFilter(object, filter) !== 'pass')) {
        return false;
    }
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
        const [objectColumn, actorColumn] =
            edge.source === rule.node ? [edge.sourceColumn, edge.targetColumn] : [edge.targetColumn, edge.sourceColumn];
        if (object[objectColumn] !== actor[actorColumn]) {
            return false;
        }
    }
    if (rule.extend) {
        const edge = schema.edges.find(
            (edge) =>
                (edge.source === rule.extend.linkNode &&
                    edge.target === rule.node &&
                    edge.targetRelation === rule.extend.throughRelation) ||
                (edge.target === rule.extend.linkNode &&
                    edge.source === rule.node &&
                    edge.sourceRelation === rule.extend.throughRelation),
        )!;
        const [objectPreloadedProperty, isArray] =
            edge.source === rule.node ? [edge.sourcePreloadedProperty, false] : [edge.targetPreloadedProperty, true];
        if (objectPreloadedProperty === undefined) {
            return false;
        }
        const preloadedValue = getPreloadedValue(object, objectPreloadedProperty);
        if (preloadedValue === undefined || preloadedValue === null) {
            return false;
        }

        const preloadedLinks: unknown[] = isArray ? preloadedValue : [preloadedValue];
        const modifiedChain: SolutionChain<Node, Relation, Role> = {
            ...chain,
            extensions: chain.extensions.slice(0, -1),
        };
        if (
            !preloadedLinks.some(
                (link) =>
                    (rule.extend.linkFilters ?? []).every((filter) => evaluateFilter(link, filter)) &&
                    evaluateSolution(schema, modifiedChain, actor, link),
            )
        ) {
            return false;
        }
    }
    return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPreloadedValue(object: any, objectPreloadedProperty: string): any {
    if (objectPreloadedProperty === '#this') {
        return object;
    } else {
        return object[objectPreloadedProperty];
    }
}
