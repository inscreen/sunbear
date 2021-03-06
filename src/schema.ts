export interface Edge<Node, Relation> {
    kind: '1:1' | '1:n' | 'n:1' | 'n:n';
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
