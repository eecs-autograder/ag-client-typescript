import { ID, Refreshable } from "./base";
import { Group, GroupData } from "./group";
import { HttpClient } from "./http_client";
import { User } from './user';
import { safe_assign } from "./utils";

export class GroupInvitationData {
    pk: ID;
    project: ID;
    readonly sender: Readonly<User>;
    readonly recipients: Readonly<Readonly<User>[]>;
    sender_username: string;
    recipient_usernames: string[];
    recipients_who_accepted: string[];

    constructor(args: GroupInvitationData) {
        this.pk = args.pk;
        this.project = args.project;
        this.sender = args.sender;
        this.recipients = args.recipients;
        this.sender_username = args.sender_username;
        this.recipient_usernames = args.recipient_usernames;
        this.recipients_who_accepted = args.recipients_who_accepted;
    }
}

export class GroupInvitation extends GroupInvitationData implements Refreshable {
    static async send_invitation(project_pk: ID,
                                 recipient_usernames: string[]): Promise<GroupInvitation> {
        let response = await HttpClient.get_instance().post<GroupInvitationData>(
            `/projects/${project_pk}/group_invitations/`,
            {recipient_usernames: recipient_usernames});
        return new GroupInvitation(response.data);
    }

    static async get_by_pk(group_invitation_pk: ID): Promise<GroupInvitation> {
        let response = await HttpClient.get_instance().get<GroupInvitationData>(
            `/group_invitations/${group_invitation_pk}/`);
        return new GroupInvitation(response.data);
    }

    async accept(): Promise<Group | null> {
        let response = await HttpClient.get_instance().post<GroupData | GroupInvitationData>(
            `/group_invitations/${this.pk}/accept/`);
        if (response.status === 201) {
            let group = new Group(<GroupData> response.data);
            Group.notify_group_created(group);
            return group;
        }

        safe_assign(this, new GroupInvitation(<GroupInvitation> response.data));
        return null;
    }

    async reject(): Promise<void> {
        await HttpClient.get_instance().delete(`/group_invitations/${this.pk}/`);
    }

    async refresh(): Promise<void> {
        let reloaded = await GroupInvitation.get_by_pk(this.pk);
        safe_assign(this, reloaded);
    }
}
