import { Schema, SchemaBuilder } from '../src';

export class Person {
    constructor(public id: string) {}
}

export class Car {
    constructor(public id: string, public owner_id: string, public owner: Person | undefined) {}
}

const nodes = [
    { node: Person, tableName: 'people', primaryColumn: 'id' },
    { node: Car, tableName: 'cars', primaryColumn: 'id' },
] as const;

const edges = [
    {
        source: Car,
        sourceColumn: 'owner_id',
        sourcePreloadedProperty: 'owner',
        sourceRelation: 'owner',
        target: Person,
        targetColumn: 'id',
    },
] as const;

type Relation = 'owner';

type Role = 'Stranger' | 'Owner';

type Permission = 'view' | 'drive';

export const simpleOwnershipSchema: Schema<typeof nodes[number]['node'], Relation, Role, Permission> =
    new SchemaBuilder<typeof nodes[number]['node'], Relation, Role, Permission>(nodes, edges)
        .grant(Car, 'Owner', ['view', 'drive'])
        .grant(Car, 'Stranger', 'view')
        .assignDirectly(Car, [], Person, [], 'Stranger')
        .assignThroughRelation(Car, [], 'owner', Person, [], 'Owner')
        .finalize();
