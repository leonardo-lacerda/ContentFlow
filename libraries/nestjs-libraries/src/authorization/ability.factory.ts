import { Ability, AbilityBuilder, AbilityClass, ExtractSubjectType } from '@casl/ability';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export type Subjects = string;
export type AppAbility = Ability<[Action, Subjects]>;

export class AbilityFactory {
  defineAbility(user: any): AppAbility {
    const { can, cannot, build } = new AbilityBuilder(
      Ability as AbilityClass<AppAbility>
    );

    if (user?.role === 'admin') {
      can(Action.Manage, 'all');
    } else {
      can(Action.Read, 'all');
      can(Action.Create, 'Post');
      can(Action.Update, 'Post');
      can(Action.Delete, 'Post');
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
