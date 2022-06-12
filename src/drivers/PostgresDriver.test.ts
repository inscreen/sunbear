import type { Client } from 'pg';

import { Car, Person, simpleOwnershipSchema } from '../../examples/simpleOwnership';

import { PostgresDriver } from './PostgresDriver';

const simpleOwnershipPgDriver = new PostgresDriver(simpleOwnershipSchema, {} as Client);

describe('PostgresDriver', () => {
    it('compile: [simpleOwnership] optimized view', () => {
        expect(
            simpleOwnershipPgDriver.emitGoalsQuery({
                alternatives: [{ goalTable: Car, actorTable: Person, goalFilters: [], joins: [] }],
            }),
        ).toStrictEqual('(SELECT __goal.* FROM cars __goal)');
    });

    it('compile: [simpleOwnership] drive', () => {
        expect(
            simpleOwnershipPgDriver.emitGoalsQuery({
                alternatives: [
                    {
                        goalTable: Car,
                        actorTable: Person,
                        goalFilters: [{ column: 'id', condition: { kind: 'IN', values: ['a', 'b'] } }],
                        joins: [
                            {
                                kind: 'inner',
                                joinedTable: Person,
                                joinedTableName: '__actor',
                                joinedTableColumn: 'id',
                                existingTableName: '__goal',
                                existingTableColumn: 'owner_id',
                                filters: [{ column: 'id', condition: { kind: '=', value: '1' } }],
                            },
                        ],
                    },
                ],
            }),
        ).toEqual(
            "(SELECT __goal.* FROM cars __goal INNER JOIN people __actor ON __actor.id = __goal.owner_id WHERE __goal.id IN ('a','b') AND __actor.id = '1')",
        );
    });

    it('compile: [simpleOwnership] drivers', () => {
        expect(
            simpleOwnershipPgDriver.emitActorsQuery({
                alternatives: [
                    {
                        goalTable: Car,
                        actorTable: Person,
                        goalFilters: [{ column: 'id', condition: { kind: 'IN', values: ['a', 'b'] } }],
                        joins: [
                            {
                                kind: 'inner',
                                joinedTable: Person,
                                joinedTableName: '__actor',
                                joinedTableColumn: 'id',
                                existingTableName: '__goal',
                                existingTableColumn: 'owner_id',
                                filters: [{ column: 'id', condition: { kind: '=', value: '1' } }],
                            },
                        ],
                    },
                ],
            }),
        ).toEqual(
            "(SELECT __actor.* FROM cars __goal INNER JOIN people __actor ON __actor.id = __goal.owner_id WHERE __goal.id IN ('a','b') AND __actor.id = '1')",
        );
    });
});
