import { ID, SaveableAPIObject } from "./base";
import { HttpClient, HttpResponse } from './http_client';
import { User } from './user';
import { filter_keys, safe_assign } from './utils';

export class GroupData {
    pk: number;
    project: number;
    extended_due_date: string | null;
    readonly members: Readonly<Readonly<User>[]>;
    member_names: string[];
    bonus_submissions_remaining: number;
    late_days_used: {[username: string]: number};
    num_submissions: number;
    num_submits_towards_limit: number;
    created_at: string;
    last_modified: string;

    constructor({
        pk,
        project,
        extended_due_date,
        members,
        member_names,
        bonus_submissions_remaining,
        late_days_used,
        num_submissions,
        num_submits_towards_limit,
        created_at,
        last_modified,
    }: GroupData) {
        this.pk = pk;
        this.project = project;
        this.extended_due_date = extended_due_date;
        this.members = members;
        this.member_names = member_names;
        this.bonus_submissions_remaining = bonus_submissions_remaining;
        this.late_days_used = late_days_used;
        this.num_submissions = num_submissions;
        this.num_submits_towards_limit = num_submits_towards_limit;
        this.created_at = created_at;
        this.last_modified = last_modified;
    }
}

export interface GroupObserver {
    update_group_created(group: Group): void;
    update_group_changed(group: Group): void;
    update_group_merged(new_group: Group, group1_pk: number, group2_pk: number): void;
}

export class Group extends GroupData implements SaveableAPIObject {
    private static _subscribers = new Set<GroupObserver>();

    static subscribe(observer: GroupObserver) {
        Group._subscribers.add(observer);
    }

    static unsubscribe(observer: GroupObserver) {
        Group._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: number): Promise<Group[]> {
        let response = await HttpClient.get_instance().get<GroupData[]>(
            `/projects/${project_pk}/groups/`
        );
        return response.data.map((data) => new Group(data));
    }

    static async get_by_pk(group_pk: number): Promise<Group> {
        let response = await HttpClient.get_instance().get<GroupData>(
            `/groups/${group_pk}/`
        );
        return new Group(response.data);
    }

    static async create(project_pk: number, data: NewGroupData): Promise<Group> {
        let response = await HttpClient.get_instance().post<GroupData>(
            `/projects/${project_pk}/groups/`,
            data
        );

        let result = new Group(response.data);
        Group.notify_group_created(result);
        return result;
    }

    static async create_solo_group(project_pk: number): Promise<Group> {
        let response = await HttpClient.get_instance().post<GroupData>(
            `/projects/${project_pk}/groups/solo_group/`, {}
        );

        let result = new Group(response.data);
        Group.notify_group_created(result);
        return result;
    }

    static notify_group_created(group: Group) {
        for (let subscriber of Group._subscribers) {
            subscriber.update_group_created(group);
        }
    }

    async merge_groups(other_group_pk: number): Promise<Group> {
        let response = await HttpClient.get_instance().post<GroupData>(
            `/groups/${this.pk}/merge_with/${other_group_pk}/`
        );

        let result = new Group(response.data);
        Group.notify_group_merged(result, this.pk, other_group_pk);
        return result;
    }

    static notify_group_merged(new_merged_group: Group, group1_pk: number, group2_pk: number) {
        for (let subscriber of Group._subscribers) {
            subscriber.update_group_merged(new_merged_group, group1_pk, group2_pk);
        }
    }

    // Sends a DELETE request for this group and then refreshes it.
    // Note that the server just changes the group members rather than
    // truly deleting the group.
    async pseudo_delete() {
        await HttpClient.get_instance().delete(`/groups/${this.pk}/`);
        return this.refresh();
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<GroupData>(
            `/groups/${this.pk}/`,
            filter_keys(this, Group.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        Group.notify_group_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<GroupData>(`/groups/${this.pk}/`);

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            Group.notify_group_changed(this);
        }
    }

    static notify_group_changed(group: Group) {
        for (let subscriber of Group._subscribers) {
            subscriber.update_group_changed(group);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof GroupData)[] = [
        'member_names',
        'extended_due_date',
        'bonus_submissions_remaining'
    ];
}

export class NewGroupData {
    member_names: string[];

    constructor({
        member_names,
    }: NewGroupData) {
        this.member_names = member_names;
    }
}
