import type { Schema } from '../src';

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

type Relation = 'owner';

type Role = 'Stranger' | 'Owner';

type Permission = 'view' | 'drive';

export const simpleOwnershipSchema: Schema<typeof nodes[number]['node'], Relation, Role, Permission> = {
    nodes,
    grants: new Map([
        [
            Car,
            {
                view: ['Stranger', 'Owner'],
                drive: ['Owner'],
            },
        ],
    ]),
    edges: [
        {
            kind: '1:n',
            source: Car,
            sourceColumn: 'owner_id',
            sourcePreloadedProperty: 'owner',
            sourceRelation: 'owner',
            target: Person,
            targetColumn: 'id',
        },
    ],
    rules: [
        {
            node: Car,
            role: 'Stranger',
            actorNode: Person,
        },
        {
            node: Car,
            role: 'Owner',
            actorNode: Person,
            throughRelation: 'owner',
        },
    ],
};
