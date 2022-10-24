export interface Edge<Node, Relation> {
    source: Node;
    sourceColumn: string;
    /** Set to #this for a self-referencing relation. */
    sourcePreloadedProperty?: string;
    sourceRelation?: Relation;
    target: Node;
    targetColumn: string;
    /** Set to #this for a self-referencing relation. */
    targetPreloadedProperty?: string;
    targetRelation?: Relation;
}

export type RuleFilter = {
    column: string;
    condition:
        | { kind: 'IS NULL' }
        | { kind: 'IS NOT NULL' }
        | { kind: '='; value: string | number | boolean }
        | { kind: '<>'; value: string | number | boolean }
        | { kind: 'IN'; values: (string | number)[] };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function evaluateFilter(object: any, filter: RuleFilter): 'pass' | 'fail' | 'unknown' {
    if (object === null || object === undefined) {
        return 'unknown';
    }
    const value = object[filter.column];
    switch (filter.condition.kind) {
        case 'IS NULL': {
            return value === null || value === undefined ? 'pass' : 'fail';
        }
        case 'IS NOT NULL': {
            return value !== null && value !== undefined ? 'pass' : 'fail';
        }
        case '=': {
            return value === filter.condition.value ? 'pass' : 'fail';
        }
        case '<>': {
            return value !== filter.condition.value ? 'pass' : 'fail';
        }
        case 'IN': {
            return filter.condition.values.includes(value) ? 'pass' : 'fail';
        }
    }
}

export interface RuleDirect<Node, Relation, Role> {
    kind: 'direct';
    node: Node;
    filters?: readonly RuleFilter[];
    role: Role;
    actorNode: Node;
    actorFilters?: readonly RuleFilter[];
    throughRelation?: Relation;
    ofRole?: undefined;
    extend?: undefined;
}

export interface RuleSuperset<Node, Role> {
    kind: 'superset';
    node: Node;
    filters?: readonly RuleFilter[];
    role: Role;
    actorNode: Node;
    actorFilters?: readonly RuleFilter[];
    throughRelation?: undefined;
    ofRole: Role;
    extend?: undefined;
}

export interface RuleExtension<Node, Relation, Role> {
    kind: 'extension';
    node: Node;
    filters?: readonly RuleFilter[];
    role: Role;
    actorNode: Node;
    actorFilters?: readonly RuleFilter[];
    throughRelation?: undefined;
    ofRole?: undefined;
    extend: {
        linkNode: Node;
        linkFilters?: readonly RuleFilter[];
        linkRole: Role;
        throughRelation: Relation;
    };
}

export type NodeDefinition<Node> = {
    node: Node;
    tableName: string;
    primaryColumn: string;
    defaultFilters?: readonly RuleFilter[];
};

export type Rule<Node, Relation, Role> =
    | RuleDirect<Node, Relation, Role>
    | RuleSuperset<Node, Role>
    | RuleExtension<Node, Relation, Role>;

export interface Schema<Node, Relation, Role, Permission extends string> {
    nodes: readonly NodeDefinition<Node>[];
    grants: Map<Node, Partial<Record<Permission, Role[]>>>;
    edges: readonly Edge<Node, Relation>[];
    rules: readonly Rule<Node, Relation, Role>[];
}

export function getNodeDefinition<Node, Relation, Role, Permission extends string>(
    schema: Schema<Node, Relation, Role, Permission>,
    node: Node,
): NodeDefinition<Node> {
    return schema.nodes.find((nodeDefinition) => nodeDefinition.node === node)!;
}

// export function getEdge<Node, Relation, Role, Permission extends string, Left extends Node, Right extends Node>(
//     schema: Schema<Node, Relation, Role, Permission>,
//     left: Left,
//     right: Right,
//     leftRelation: string,
// ) {}

export class SchemaBuilder<Node, Relation, Role extends string, Permission extends string> {
    grants = new Map<Node, Partial<Record<Permission, Role[]>>>();
    rules: Rule<Node, Relation, Role>[] = [];

    constructor(public nodes: readonly NodeDefinition<Node>[], public edges: readonly Edge<Node, Relation>[]) {}

    finalize(): Schema<Node, Relation, Role, Permission> {
        return {
            nodes: this.nodes,
            grants: this.grants,
            edges: this.edges,
            rules: this.rules,
        };
    }

    grant(node: Node, role: Role, permission: Permission): this;
    grant(node: Node, role: Role, permissions: readonly Permission[]): this;
    grant(node: Node, roles: readonly Role[], permission: Permission): this;
    grant(node: Node, roles: Role | readonly Role[], permissions: Permission | readonly Permission[]): this {
        let grant = this.grants.get(node);
        if (!grant) {
            grant = {};
            this.grants.set(node, grant);
        }
        for (const permission of [permissions as Permission[]].flat()) {
            let grantees = grant[permission];
            if (!grantees) {
                grantees = [];
                grant[permission] = grantees;
            }
            for (const role of [roles as Role[]].flat()) {
                if (!grantees.includes(role)) {
                    grantees.push(role);
                }
            }
        }
        return this;
    }

    assignDirectly(
        node: Node,
        filters: readonly RuleFilter[],
        actorNode: Node,
        actorFilters: readonly RuleFilter[],
        role: Role,
    ): this {
        this.rules.push({ kind: 'direct', node, filters, role, actorNode, actorFilters });
        return this;
    }

    assignThroughRelation(
        node: Node,
        filters: readonly RuleFilter[],
        throughRelation: Relation,
        actorNode: Node,
        actorFilters: readonly RuleFilter[],
        role: Role,
    ): this {
        this.rules.push({ kind: 'direct', node, filters, role, actorNode, actorFilters, throughRelation });
        return this;
    }

    assignByExtension(
        node: Node,
        filters: readonly RuleFilter[],
        actorNode: Node,
        actorFilters: readonly RuleFilter[],
        role: Role,
        extend: RuleExtension<Node, Relation, Role>['extend'],
    ): this {
        this.rules.push({
            kind: 'extension',
            node,
            filters,
            role,
            actorNode,
            actorFilters,
            extend,
        });
        return this;
    }

    assignByOtherRole(
        node: Node,
        filters: readonly RuleFilter[],
        otherRole: Role,
        actorNode: Node,
        actorFilters: readonly RuleFilter[],
        role: Role,
    ): this {
        this.rules.push({ kind: 'superset', node, filters, role, actorNode, actorFilters, ofRole: otherRole });
        return this;
    }
}
